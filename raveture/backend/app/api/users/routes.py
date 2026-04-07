"""
User management routes.
Handles user profiles, follows, and preferences.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError

from app import db, limiter
from app.api.users import users_bp
from app.models.user import User, UserFollow, UserPreferences
from app.utils.validators import UserUpdate


@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_profile():
    """Get current user's profile."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'user': user.to_dict(include_private=True)})


@users_bp.route('/me', methods=['PUT'])
@jwt_required()
@limiter.limit('10/minute')
def update_my_profile():
    """Update current user's profile."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        data = UserUpdate(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    # Update fields
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.session.commit()

    return jsonify({
        'message': 'Profile updated',
        'user': user.to_dict(include_private=True),
    })


@users_bp.route('/<user_id>', methods=['GET'])
@limiter.limit('60/minute')
def get_user(user_id: str):
    """Get user's public profile."""
    user = User.query.get(user_id)

    if not user or not user.is_active:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'user': user.to_dict()})


@users_bp.route('/<user_id>/follow', methods=['POST'])
@jwt_required()
@limiter.limit('30/minute')
def follow_user(user_id: str):
    """Follow a user."""
    current_user_id = get_jwt_identity()

    if current_user_id == user_id:
        return jsonify({'error': 'Cannot follow yourself'}), 400

    target_user = User.query.get(user_id)
    if not target_user or not target_user.is_active:
        return jsonify({'error': 'User not found'}), 404

    # Check if already following
    existing = UserFollow.query.filter_by(
        follower_id=current_user_id,
        following_id=user_id
    ).first()

    if existing:
        return jsonify({'error': 'Already following this user'}), 400

    follow = UserFollow(follower_id=current_user_id, following_id=user_id)
    db.session.add(follow)
    db.session.commit()

    return jsonify({'message': 'Now following user'})


@users_bp.route('/<user_id>/follow', methods=['DELETE'])
@jwt_required()
@limiter.limit('30/minute')
def unfollow_user(user_id: str):
    """Unfollow a user."""
    current_user_id = get_jwt_identity()

    follow = UserFollow.query.filter_by(
        follower_id=current_user_id,
        following_id=user_id
    ).first()

    if not follow:
        return jsonify({'error': 'Not following this user'}), 400

    db.session.delete(follow)
    db.session.commit()

    return jsonify({'message': 'Unfollowed user'})


@users_bp.route('/<user_id>/followers', methods=['GET'])
@limiter.limit('30/minute')
def get_followers(user_id: str):
    """Get user's followers."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    followers = UserFollow.query.filter_by(following_id=user_id)\
        .order_by(UserFollow.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'followers': [
            {
                'user': f.follower.to_dict(),
                'followed_at': f.created_at.isoformat(),
            }
            for f in followers.items
        ],
        'total': followers.total,
        'page': page,
        'pages': followers.pages,
    })


@users_bp.route('/<user_id>/following', methods=['GET'])
@limiter.limit('30/minute')
def get_following(user_id: str):
    """Get users that this user follows."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    following = UserFollow.query.filter_by(follower_id=user_id)\
        .order_by(UserFollow.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'following': [
            {
                'user': f.following.to_dict(),
                'followed_at': f.created_at.isoformat(),
            }
            for f in following.items
        ],
        'total': following.total,
        'page': page,
        'pages': following.pages,
    })


@users_bp.route('/me/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    """Get current user's preferences."""
    user_id = get_jwt_identity()
    prefs = UserPreferences.query.get(user_id)

    if not prefs:
        return jsonify({'error': 'Preferences not found'}), 404

    return jsonify({'preferences': prefs.to_dict()})


@users_bp.route('/me/preferences', methods=['PUT'])
@jwt_required()
@limiter.limit('10/minute')
def update_preferences():
    """Update current user's preferences."""
    user_id = get_jwt_identity()
    prefs = UserPreferences.query.get(user_id)

    if not prefs:
        prefs = UserPreferences(user_id=user_id)
        db.session.add(prefs)

    data = request.get_json()

    # Update allowed fields
    allowed_fields = [
        'email_notifications', 'push_notifications', 'event_reminders',
        'forum_replies', 'new_followers', 'privacy_profile',
        'show_listening_activity', 'preferred_genres', 'preferred_cities',
        'dark_mode'
    ]

    for field in allowed_fields:
        if field in data:
            setattr(prefs, field, data[field])

    db.session.commit()

    return jsonify({
        'message': 'Preferences updated',
        'preferences': prefs.to_dict(),
    })
