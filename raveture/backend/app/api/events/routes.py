"""
Event management routes.
Handles events, organizers, venues, and artists.
"""

from datetime import datetime

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError

from app import db, limiter
from app.api.events import events_bp
from app.models.event import Event, Organizer, Venue, Artist, EventArtist, EventInterest
from app.utils.security import generate_slug
from app.utils.validators import EventCreate, VenueCreate, VenueUpdate, ArtistCreate


# ============================================================================
# EVENTS
# ============================================================================

@events_bp.route('/events', methods=['GET'])
@limiter.limit('60/minute')
def list_events():
    """
    List events with filters.
    ---
    tags:
      - Events
    parameters:
      - name: city
        in: query
        type: string
      - name: genre
        in: query
        type: string
      - name: from_date
        in: query
        type: string
      - name: status
        in: query
        type: string
    responses:
      200:
        description: List of events
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    query = Event.query.filter_by(status='published')

    # Filters
    city = request.args.get('city')
    if city:
        query = query.join(Venue).filter(Venue.city.ilike(f'%{city}%'))

    genre = request.args.get('genre')
    if genre:
        query = query.filter(Event.genres.contains([genre]))

    from_date = request.args.get('from_date')
    if from_date:
        query = query.filter(Event.starts_at >= from_date)
    else:
        # Default: only future events
        query = query.filter(Event.starts_at >= datetime.utcnow())

    # Order by date
    query = query.order_by(Event.starts_at.asc())

    events = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'events': [e.to_dict() for e in events.items],
        'total': events.total,
        'page': page,
        'pages': events.pages,
    })


@events_bp.route('/events/featured', methods=['GET'])
@limiter.limit('60/minute')
def featured_events():
    """Get featured events."""
    events = Event.query.filter_by(
        status='published',
        is_featured=True
    ).filter(
        Event.starts_at >= datetime.utcnow()
    ).order_by(Event.starts_at.asc()).limit(10).all()

    return jsonify({'events': [e.to_dict() for e in events]})


@events_bp.route('/events/<identifier>', methods=['GET'])
@limiter.limit('60/minute')
def get_event(identifier: str):
    """Get event by slug or ID."""
    # Try to find by slug first
    event = Event.query.filter_by(slug=identifier).first()

    # If not found by slug, try by ID (UUID)
    if not event:
        try:
            import uuid
            uuid.UUID(identifier)  # Validate it's a UUID
            event = Event.query.get(identifier)
        except (ValueError, AttributeError):
            pass

    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Increment view count
    event.view_count += 1
    db.session.commit()

    return jsonify({'event': event.to_dict(include_lineup=True)})


@events_bp.route('/events', methods=['POST'])
@jwt_required()
@limiter.limit('10/minute')
def create_event():
    """Create a new event (auto-creates organizer if needed)."""
    user_id = get_jwt_identity()

    # Auto-create organizer if not exists
    organizer = Organizer.query.filter_by(user_id=user_id).first()
    if not organizer:
        from app.models.user import User
        user = User.query.get(user_id)
        organizer_name = user.display_name or user.username if user else 'Organizer'
        organizer_slug = generate_slug(organizer_name)
        base_slug = organizer_slug
        counter = 1
        while Organizer.query.filter_by(slug=organizer_slug).first():
            organizer_slug = f'{base_slug}-{counter}'
            counter += 1

        organizer = Organizer(
            user_id=user_id,
            name=organizer_name,
            slug=organizer_slug,
        )
        db.session.add(organizer)
        db.session.flush()

    try:
        data = EventCreate(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    # Generate slug
    slug = generate_slug(data.name)
    base_slug = slug
    counter = 1
    while Event.query.filter_by(slug=slug).first():
        slug = f'{base_slug}-{counter}'
        counter += 1

    event = Event(
        organizer_id=organizer.id,
        name=data.name,
        slug=slug,
        description=data.description,
        short_description=data.short_description,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        doors_open_at=data.doors_open_at,
        venue_id=data.venue_id,
        genres=data.genres,
        event_type=data.event_type,
        ticketing_enabled=data.ticketing_enabled,
        external_ticket_url=data.external_ticket_url,
        min_age=data.min_age,
        cover_image_url=data.cover_image_url,
    )

    db.session.add(event)
    db.session.commit()

    return jsonify({
        'message': 'Event created',
        'event': event.to_dict(),
    }), 201


@events_bp.route('/events/<event_id>/interested', methods=['POST'])
@jwt_required()
@limiter.limit('30/minute')
def mark_interested(event_id: str):
    """Mark interest in an event."""
    user_id = get_jwt_identity()
    event = Event.query.get(event_id)

    if not event:
        return jsonify({'error': 'Event not found'}), 404

    existing = EventInterest.query.filter_by(
        event_id=event_id,
        user_id=user_id
    ).first()

    if existing:
        return jsonify({'error': 'Already interested'}), 400

    interest = EventInterest(event_id=event_id, user_id=user_id)
    db.session.add(interest)

    # Update count
    event.interested_count += 1
    db.session.commit()

    return jsonify({'message': 'Marked as interested'})


@events_bp.route('/events/<event_id>/interested', methods=['DELETE'])
@jwt_required()
@limiter.limit('30/minute')
def remove_interested(event_id: str):
    """Remove interest in an event."""
    user_id = get_jwt_identity()

    interest = EventInterest.query.filter_by(
        event_id=event_id,
        user_id=user_id
    ).first()

    if not interest:
        return jsonify({'error': 'Not interested in this event'}), 400

    event = Event.query.get(event_id)
    if event:
        event.interested_count = max(0, event.interested_count - 1)

    db.session.delete(interest)
    db.session.commit()

    return jsonify({'message': 'Interest removed'})


# ============================================================================
# VENUES
# ============================================================================

@events_bp.route('/venues', methods=['GET'])
@limiter.limit('60/minute')
def list_venues():
    """List venues."""
    city = request.args.get('city')

    query = Venue.query.filter_by(is_active=True)

    if city:
        query = query.filter(Venue.city.ilike(f'%{city}%'))

    venues = query.order_by(Venue.name).all()

    return jsonify({'venues': [v.to_dict() for v in venues]})


@events_bp.route('/venues/<slug>', methods=['GET'])
@limiter.limit('60/minute')
def get_venue(slug: str):
    """Get venue by slug."""
    venue = Venue.query.filter_by(slug=slug).first()

    if not venue:
        return jsonify({'error': 'Venue not found'}), 404

    return jsonify({'venue': venue.to_dict()})


@events_bp.route('/venues', methods=['POST'])
@jwt_required()
@limiter.limit('10/minute')
def create_venue():
    """
    Create a new venue (organizer only).
    ---
    tags:
      - Venues
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - name
            - city
          properties:
            name:
              type: string
            description:
              type: string
            address:
              type: string
            city:
              type: string
            country:
              type: string
            postal_code:
              type: string
            latitude:
              type: number
            longitude:
              type: number
            capacity:
              type: integer
    responses:
      201:
        description: Venue created successfully
      400:
        description: Validation error
    """
    user_id = get_jwt_identity()

    # Verify user is an organizer
    organizer = Organizer.query.filter_by(user_id=user_id).first()
    if not organizer:
        return jsonify({'error': 'You must be an organizer to create venues'}), 403

    try:
        data = VenueCreate(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    # Generate slug
    slug = generate_slug(data.name)
    base_slug = slug
    counter = 1
    while Venue.query.filter_by(slug=slug).first():
        slug = f'{base_slug}-{counter}'
        counter += 1

    venue = Venue(
        name=data.name,
        slug=slug,
        description=data.description,
        address=data.address,
        city=data.city,
        country=data.country,
        postal_code=data.postal_code,
        latitude=data.latitude,
        longitude=data.longitude,
        capacity=data.capacity,
        created_by_id=user_id,
    )

    db.session.add(venue)
    db.session.commit()

    return jsonify({
        'message': 'Venue created',
        'venue': venue.to_dict(),
    }), 201


@events_bp.route('/venues/<venue_id>', methods=['PUT'])
@jwt_required()
@limiter.limit('20/minute')
def update_venue(venue_id: str):
    """
    Update a venue (owner only).
    ---
    tags:
      - Venues
    security:
      - Bearer: []
    parameters:
      - name: venue_id
        in: path
        type: string
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
            description:
              type: string
            address:
              type: string
            city:
              type: string
            country:
              type: string
            postal_code:
              type: string
            latitude:
              type: number
            longitude:
              type: number
            capacity:
              type: integer
            image_url:
              type: string
    responses:
      200:
        description: Venue updated successfully
      403:
        description: Not authorized
      404:
        description: Venue not found
    """
    user_id = get_jwt_identity()

    venue = Venue.query.get(venue_id)
    if not venue:
        return jsonify({'error': 'Venue not found'}), 404

    # Check ownership
    if venue.created_by_id != user_id:
        return jsonify({'error': 'Not authorized to edit this venue'}), 403

    try:
        data = VenueUpdate(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    # Update fields
    if data.name is not None:
        venue.name = data.name
    if data.description is not None:
        venue.description = data.description
    if data.address is not None:
        venue.address = data.address
    if data.city is not None:
        venue.city = data.city
    if data.country is not None:
        venue.country = data.country
    if data.postal_code is not None:
        venue.postal_code = data.postal_code
    if data.latitude is not None:
        venue.latitude = data.latitude
    if data.longitude is not None:
        venue.longitude = data.longitude
    if data.capacity is not None:
        venue.capacity = data.capacity
    if data.image_url is not None:
        venue.image_url = data.image_url

    db.session.commit()

    return jsonify({
        'message': 'Venue updated',
        'venue': venue.to_dict(),
    })


@events_bp.route('/venues/<venue_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit('10/minute')
def delete_venue(venue_id: str):
    """
    Soft delete a venue (set is_active=False).
    ---
    tags:
      - Venues
    security:
      - Bearer: []
    parameters:
      - name: venue_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Venue deleted successfully
      403:
        description: Not authorized
      404:
        description: Venue not found
    """
    user_id = get_jwt_identity()

    venue = Venue.query.get(venue_id)
    if not venue:
        return jsonify({'error': 'Venue not found'}), 404

    # Check ownership
    if venue.created_by_id != user_id:
        return jsonify({'error': 'Not authorized to delete this venue'}), 403

    # Soft delete
    venue.is_active = False
    db.session.commit()

    return jsonify({
        'message': 'Venue deleted',
        'venue_id': venue_id,
    })


@events_bp.route('/my-venues', methods=['GET'])
@jwt_required()
@limiter.limit('30/minute')
def my_venues():
    """
    Get venues created by the current user.
    ---
    tags:
      - Venues
    security:
      - Bearer: []
    responses:
      200:
        description: List of user's venues
    """
    user_id = get_jwt_identity()

    venues = Venue.query.filter_by(
        created_by_id=user_id,
        is_active=True
    ).order_by(Venue.name).all()

    return jsonify({
        'venues': [v.to_dict() for v in venues],
    })


# ============================================================================
# ARTISTS
# ============================================================================

@events_bp.route('/artists', methods=['GET'])
@limiter.limit('60/minute')
def list_artists():
    """List artists."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    query = Artist.query

    genre = request.args.get('genre')
    if genre:
        query = query.filter(Artist.genres.contains([genre]))

    local_only = request.args.get('local', type=bool)
    if local_only:
        query = query.filter_by(is_local=True)

    artists = query.order_by(Artist.name).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'artists': [a.to_dict() for a in artists.items],
        'total': artists.total,
        'page': page,
        'pages': artists.pages,
    })


@events_bp.route('/artists/<slug>', methods=['GET'])
@limiter.limit('60/minute')
def get_artist(slug: str):
    """Get artist by slug."""
    artist = Artist.query.filter_by(slug=slug).first()

    if not artist:
        return jsonify({'error': 'Artist not found'}), 404

    return jsonify({'artist': artist.to_dict()})


# ============================================================================
# MY EVENTS (for logged in user)
# ============================================================================

@events_bp.route('/my-events', methods=['GET'])
@jwt_required()
@limiter.limit('30/minute')
def my_events():
    """Get events created by current user."""
    user_id = get_jwt_identity()

    organizer = Organizer.query.filter_by(user_id=user_id).first()
    if not organizer:
        return jsonify({'events': [], 'message': 'Not an organizer yet'})

    events = Event.query.filter_by(organizer_id=organizer.id).order_by(Event.created_at.desc()).all()

    return jsonify({
        'events': [e.to_dict() for e in events],
        'organizer': organizer.to_dict()
    })


@events_bp.route('/my-organizer', methods=['GET'])
@jwt_required()
@limiter.limit('30/minute')
def get_my_organizer():
    """Get current user's organizer profile."""
    user_id = get_jwt_identity()

    organizer = Organizer.query.filter_by(user_id=user_id).first()
    if not organizer:
        return jsonify({'organizer': None})

    return jsonify({'organizer': organizer.to_dict()})


@events_bp.route('/my-organizer', methods=['POST'])
@jwt_required()
@limiter.limit('5/minute')
def create_my_organizer():
    """Create organizer profile for current user."""
    user_id = get_jwt_identity()

    # Check if already an organizer
    existing = Organizer.query.filter_by(user_id=user_id).first()
    if existing:
        return jsonify({'error': 'Already an organizer', 'organizer': existing.to_dict()}), 400

    data = request.get_json()
    name = data.get('name')

    if not name or len(name) < 2:
        return jsonify({'error': 'Organizer name is required (min 2 chars)'}), 400

    # Generate slug
    slug = generate_slug(name)
    base_slug = slug
    counter = 1
    while Organizer.query.filter_by(slug=slug).first():
        slug = f'{base_slug}-{counter}'
        counter += 1

    organizer = Organizer(
        user_id=user_id,
        name=name,
        slug=slug,
        description=data.get('description'),
        email=data.get('email'),
        website_url=data.get('website_url'),
        instagram_url=data.get('instagram_url'),
    )

    db.session.add(organizer)
    db.session.commit()

    return jsonify({
        'message': 'Organizer profile created',
        'organizer': organizer.to_dict()
    }), 201


@events_bp.route('/events/<event_id>', methods=['PUT'])
@jwt_required()
@limiter.limit('20/minute')
def update_event(event_id: str):
    """Update an event (owner only)."""
    user_id = get_jwt_identity()

    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Check ownership
    organizer = Organizer.query.filter_by(user_id=user_id).first()
    if not organizer or event.organizer_id != organizer.id:
        return jsonify({'error': 'Not authorized'}), 403

    # Cannot edit cancelled or completed events
    if event.status in ['cancelled', 'completed']:
        return jsonify({'error': f'Cannot edit {event.status} events'}), 400

    data = request.get_json()

    # Handle status changes
    if 'status' in data:
        new_status = data['status']
        if new_status == 'published' and event.status == 'draft':
            if not event.starts_at:
                return jsonify({'error': 'Event must have a start date before publishing'}), 400
            if event.starts_at <= datetime.utcnow():
                return jsonify({'error': 'Event start date must be in the future'}), 400
            event.status = 'published'
            event.published_at = datetime.utcnow()
        elif new_status == 'draft' and event.status == 'published':
            event.status = 'draft'
        elif new_status == 'cancelled' and event.status in ['draft', 'published']:
            event.status = 'cancelled'
        elif new_status != event.status:
            return jsonify({'error': f'Cannot change status from {event.status} to {new_status}'}), 400

    # Update fields
    if 'name' in data:
        event.name = data['name']
    if 'description' in data:
        event.description = data['description']
    if 'short_description' in data:
        event.short_description = data['short_description']
    if 'starts_at' in data:
        event.starts_at = datetime.fromisoformat(data['starts_at'].replace('Z', '+00:00'))
    if 'ends_at' in data:
        event.ends_at = datetime.fromisoformat(data['ends_at'].replace('Z', '+00:00')) if data['ends_at'] else None
    if 'cover_image_url' in data:
        event.cover_image_url = data['cover_image_url']
    if 'genres' in data:
        event.genres = data['genres']
    if 'event_type' in data:
        event.event_type = data['event_type']
    if 'ticketing_enabled' in data:
        event.ticketing_enabled = data['ticketing_enabled']
    if 'min_age' in data:
        event.min_age = data['min_age']

    db.session.commit()

    return jsonify({
        'message': 'Event updated',
        'event': event.to_dict()
    })


@events_bp.route('/events/<event_id>/publish', methods=['POST'])
@jwt_required()
@limiter.limit('10/minute')
def publish_event(event_id: str):
    """Publish a draft event (owner only)."""
    user_id = get_jwt_identity()

    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Check ownership
    organizer = Organizer.query.filter_by(user_id=user_id).first()
    if not organizer or event.organizer_id != organizer.id:
        return jsonify({'error': 'Not authorized'}), 403

    # Only draft events can be published
    if event.status != 'draft':
        return jsonify({'error': 'Only draft events can be published'}), 400

    # Must have a start date
    if not event.starts_at:
        return jsonify({'error': 'Event must have a start date before publishing'}), 400

    # Start date must be in the future
    if event.starts_at <= datetime.utcnow():
        return jsonify({'error': 'Event start date must be in the future'}), 400

    # Publish the event
    event.status = 'published'
    event.published_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'message': 'Event published',
        'event': event.to_dict()
    })


@events_bp.route('/events/<event_id>/cancel', methods=['POST'])
@jwt_required()
@limiter.limit('5/minute')
def cancel_event(event_id: str):
    """Cancel an event (owner only)."""
    user_id = get_jwt_identity()

    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Check ownership
    organizer = Organizer.query.filter_by(user_id=user_id).first()
    if not organizer or event.organizer_id != organizer.id:
        return jsonify({'error': 'Not authorized'}), 403

    # Only draft or published events can be cancelled
    if event.status not in ['draft', 'published']:
        return jsonify({'error': f'Event with status {event.status} cannot be cancelled'}), 400

    # Optional: capture cancellation reason for future audit
    data = request.get_json() or {}
    # reason = data.get('reason')  # Reserved for future audit logging

    # Cancel the event
    event.status = 'cancelled'
    db.session.commit()

    return jsonify({
        'message': 'Event cancelled',
        'event': event.to_dict()
    })


# ============================================================================
# ORGANIZERS
# ============================================================================

@events_bp.route('/organizers', methods=['GET'])
@limiter.limit('60/minute')
def list_organizers():
    """List organizers."""
    organizers = Organizer.query.order_by(Organizer.name).all()
    return jsonify({'organizers': [o.to_dict() for o in organizers]})


@events_bp.route('/organizers/<slug>', methods=['GET'])
@limiter.limit('60/minute')
def get_organizer(slug: str):
    """Get organizer by slug."""
    organizer = Organizer.query.filter_by(slug=slug).first()

    if not organizer:
        return jsonify({'error': 'Organizer not found'}), 404

    return jsonify({'organizer': organizer.to_dict()})


@events_bp.route('/organizers/<slug>/events', methods=['GET'])
@limiter.limit('60/minute')
def get_organizer_events(slug: str):
    """Get events by organizer."""
    organizer = Organizer.query.filter_by(slug=slug).first()

    if not organizer:
        return jsonify({'error': 'Organizer not found'}), 404

    events = Event.query.filter_by(
        organizer_id=organizer.id,
        status='published'
    ).order_by(Event.starts_at.desc()).all()

    return jsonify({'events': [e.to_dict() for e in events]})
