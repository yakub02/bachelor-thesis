"""
Admin routes for RAVETURE.
Handles user management, featured events (RAVETURE PICKS), and system administration.
"""

from datetime import datetime
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import BaseModel, ValidationError
from typing import Optional

from app import db, limiter
from app.api.admin import admin_bp
from app.models import User, Event, FeaturedEvent
from app.utils.decorators import admin_required, moderator_required


# =============================================================================
# VALIDATORS
# =============================================================================

class UpdateUserRole(BaseModel):
    role: str  # 'user', 'artist', 'organizer', 'moderator', 'admin'


class CreateFeaturedEvent(BaseModel):
    event_id: str
    reason: str
    expires_at: Optional[str] = None  # ISO format datetime


# =============================================================================
# USER MANAGEMENT
# =============================================================================

@admin_bp.route('/users', methods=['GET'])
@limiter.limit('30/minute')
@jwt_required()
@admin_required
def get_all_users():
    """
    List all users (admin only).
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
      - name: role
        in: query
        type: string
        description: Filter by role
      - name: search
        in: query
        type: string
        description: Search by username or email
    responses:
      200:
        description: List of users
      403:
        description: Admin access required
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    role = request.args.get('role')
    search = request.args.get('search')

    query = User.query

    # Filter by role
    if role:
        query = query.filter_by(role=role)

    # Search by username or email
    if search:
        search_pattern = f'%{search}%'
        query = query.filter(
            db.or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.display_name.ilike(search_pattern)
            )
        )

    users = query.order_by(User.created_at.desc()).paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )

    return jsonify({
        'users': [u.to_dict(include_private=True) for u in users.items],
        'total': users.total,
        'page': page,
        'pages': users.pages,
        'per_page': per_page
    })


@admin_bp.route('/users/<user_id>', methods=['GET'])
@limiter.limit('30/minute')
@jwt_required()
@admin_required
def get_user_detail(user_id: str):
    """
    Get detailed user information (admin only).
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: User details
      404:
        description: User not found
    """
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'user': user.to_dict(include_private=True),
        'preferences': user.preferences.to_dict() if user.preferences else None,
        'stats': {
            'followers_count': user.followers.count(),
            'following_count': user.following.count(),
        }
    })


@admin_bp.route('/users/<user_id>/role', methods=['PUT'])
@limiter.limit('10/minute')
@jwt_required()
@admin_required
def update_user_role(user_id: str):
    """
    Update user role (admin only).
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    parameters:
      - name: user_id
        in: path
        type: string
        required: true
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - role
          properties:
            role:
              type: string
              enum: [user, artist, organizer, moderator, admin]
    responses:
      200:
        description: Role updated
      400:
        description: Invalid role
      404:
        description: User not found
    """
    try:
        data = UpdateUserRole(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Validate role
    valid_roles = ['user', 'artist', 'organizer', 'moderator', 'admin']
    if data.role not in valid_roles:
        return jsonify({
            'error': 'Invalid role',
            'message': f'Role must be one of: {", ".join(valid_roles)}'
        }), 400

    old_role = user.role
    user.role = data.role
    db.session.commit()

    return jsonify({
        'message': 'User role updated',
        'user': user.to_dict(include_private=True),
        'changed': {
            'old_role': old_role,
            'new_role': data.role
        }
    })


@admin_bp.route('/users/<user_id>/ban', methods=['POST'])
@limiter.limit('10/minute')
@jwt_required()
@admin_required
def ban_user(user_id: str):
    """
    Ban user (deactivate account) - admin only.
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: User banned
      404:
        description: User not found
    """
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.is_active = False
    db.session.commit()

    return jsonify({
        'message': 'User banned successfully',
        'user_id': str(user.id),
        'username': user.username
    })


@admin_bp.route('/users/<user_id>/unban', methods=['POST'])
@limiter.limit('10/minute')
@jwt_required()
@admin_required
def unban_user(user_id: str):
    """
    Unban user (reactivate account) - admin only.
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: User unbanned
      404:
        description: User not found
    """
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.is_active = True
    db.session.commit()

    return jsonify({
        'message': 'User unbanned successfully',
        'user_id': str(user.id),
        'username': user.username
    })


# =============================================================================
# RAVETURE PICKS (FEATURED EVENTS)
# =============================================================================

@admin_bp.route('/featured-events', methods=['GET'])
@limiter.limit('30/minute')
def get_featured_events():
    """
    Get all RAVETURE Picks with curator information (public endpoint).
    ---
    tags:
      - Admin
      - Events
    responses:
      200:
        description: List of featured events with curator info
    """
    featured = FeaturedEvent.query.join(Event).filter(
        Event.status == 'published',
        Event.is_featured == True
    ).order_by(FeaturedEvent.featured_at.desc()).all()

    return jsonify({
        'featured_events': [
            {
                **fe.to_dict(),
                'event': fe.event.to_dict(include_lineup=True)
            }
            for fe in featured
        ],
        'count': len(featured)
    })


@admin_bp.route('/featured-events', methods=['POST'])
@limiter.limit('10/minute')
@jwt_required()
@moderator_required
def create_featured_event():
    """
    Add RAVETURE Pick (moderator/admin only).
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - event_id
            - reason
          properties:
            event_id:
              type: string
              format: uuid
            reason:
              type: string
              description: Why was this event picked?
            expires_at:
              type: string
              format: date-time
              description: Optional expiration date
    responses:
      201:
        description: Event featured successfully
      400:
        description: Validation error
      404:
        description: Event not found
      409:
        description: Event already featured
    """
    try:
        data = CreateFeaturedEvent(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    # Check if event exists
    event = Event.query.get(data.event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Check if already featured
    existing = FeaturedEvent.query.filter_by(event_id=data.event_id).first()
    if existing:
        return jsonify({
            'error': 'Event already featured',
            'message': 'This event is already a RAVETURE Pick'
        }), 409

    curator_id = get_jwt_identity()

    # Parse expires_at if provided
    expires_at = None
    if data.expires_at:
        try:
            expires_at = datetime.fromisoformat(data.expires_at.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({
                'error': 'Invalid date format',
                'message': 'expires_at must be ISO format datetime'
            }), 400

    # Create featured event
    featured_event = FeaturedEvent(
        event_id=data.event_id,
        curator_id=curator_id,
        reason=data.reason,
        expires_at=expires_at
    )

    # Mark event as featured
    event.is_featured = True

    db.session.add(featured_event)
    db.session.commit()

    return jsonify({
        'message': 'Event featured successfully',
        'featured_event': {
            **featured_event.to_dict(),
            'event': event.to_dict()
        }
    }), 201


@admin_bp.route('/featured-events/<event_id>', methods=['DELETE'])
@limiter.limit('10/minute')
@jwt_required()
@moderator_required
def remove_featured_event(event_id: str):
    """
    Remove RAVETURE Pick (moderator/admin only).
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Event unfeatured
      404:
        description: Featured event not found
    """
    featured_event = FeaturedEvent.query.filter_by(event_id=event_id).first()

    if not featured_event:
        return jsonify({'error': 'Featured event not found'}), 404

    event = Event.query.get(event_id)
    if event:
        event.is_featured = False

    db.session.delete(featured_event)
    db.session.commit()

    return jsonify({
        'message': 'Event unfeatured successfully',
        'event_id': event_id
    })


# =============================================================================
# SYSTEM STATS
# =============================================================================

@admin_bp.route('/stats', methods=['GET'])
@limiter.limit('30/minute')
@jwt_required()
@admin_required
def get_system_stats():
    """
    Get system statistics (admin only).
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: System statistics
    """
    return jsonify({
        'users': {
            'total': User.query.count(),
            'active': User.query.filter_by(is_active=True).count(),
            'by_role': {
                'user': User.query.filter_by(role='user').count(),
                'artist': User.query.filter_by(role='artist').count(),
                'organizer': User.query.filter_by(role='organizer').count(),
                'moderator': User.query.filter_by(role='moderator').count(),
                'admin': User.query.filter_by(role='admin').count(),
            }
        },
        'events': {
            'total': Event.query.count(),
            'published': Event.query.filter_by(status='published').count(),
            'draft': Event.query.filter_by(status='draft').count(),
            'featured': Event.query.filter_by(is_featured=True).count(),
        }
    })
