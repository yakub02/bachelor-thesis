"""
Archive routes.
Handles historical rave scene archive.
"""

from datetime import datetime

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError

from app import db, limiter
from app.api.archive import archive_bp
from app.models.archive import ArchivedEvent, SetRecording, ArchiveContribution, ArchiveFlyer
from app.utils.validators import ArchiveEventCreate


@archive_bp.route('/', methods=['GET'])
@limiter.limit('60/minute')
def list_archived_events():
    """List archived events with filters."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    query = ArchivedEvent.query

    # Filters
    year = request.args.get('year', type=int)
    if year:
        query = query.filter_by(year=year)

    city = request.args.get('city')
    if city:
        query = query.filter(ArchivedEvent.city.ilike(f'%{city}%'))

    verified_only = request.args.get('verified', type=bool)
    if verified_only:
        query = query.filter_by(is_verified=True)

    # Search in name/lineup
    search = request.args.get('q')
    if search:
        query = query.filter(
            db.or_(
                ArchivedEvent.name.ilike(f'%{search}%'),
                ArchivedEvent.lineup_text.ilike(f'%{search}%'),
                ArchivedEvent.organizer_name.ilike(f'%{search}%'),
            )
        )

    # Order by date descending
    query = query.order_by(ArchivedEvent.date.desc())

    events = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'events': [e.to_dict() for e in events.items],
        'total': events.total,
        'page': page,
        'pages': events.pages,
    })


@archive_bp.route('/<event_id>', methods=['GET'])
@limiter.limit('60/minute')
def get_archived_event(event_id: str):
    """Get archived event details with recordings."""
    event = ArchivedEvent.query.get(event_id)

    if not event:
        return jsonify({'error': 'Event not found'}), 404

    return jsonify({'event': event.to_dict(include_recordings=True)})


@archive_bp.route('/timeline', methods=['GET'])
@limiter.limit('60/minute')
def timeline():
    """Get events grouped by year."""
    # Get year counts
    year_counts = db.session.query(
        ArchivedEvent.year,
        db.func.count(ArchivedEvent.id)
    ).group_by(ArchivedEvent.year)\
        .order_by(ArchivedEvent.year.desc()).all()

    return jsonify({
        'timeline': [
            {'year': year, 'count': count}
            for year, count in year_counts
        ]
    })


@archive_bp.route('/stats', methods=['GET'])
@limiter.limit('60/minute')
def stats():
    """Get archive statistics."""
    total_events = ArchivedEvent.query.count()
    total_recordings = SetRecording.query.count()
    total_flyers = ArchiveFlyer.query.count()
    verified_events = ArchivedEvent.query.filter_by(is_verified=True).count()

    oldest = ArchivedEvent.query.order_by(ArchivedEvent.date.asc()).first()
    newest = ArchivedEvent.query.order_by(ArchivedEvent.date.desc()).first()

    return jsonify({
        'stats': {
            'total_events': total_events,
            'total_recordings': total_recordings,
            'total_flyers': total_flyers,
            'verified_events': verified_events,
            'oldest_year': oldest.year if oldest else None,
            'newest_year': newest.year if newest else None,
        }
    })


@archive_bp.route('/contribute', methods=['POST'])
@jwt_required()
@limiter.limit('5/minute')
def contribute():
    """Submit a contribution to the archive."""
    user_id = get_jwt_identity()
    data = request.get_json()

    contribution_type = data.get('type')
    valid_types = ['event', 'recording', 'photo', 'flyer', 'info', 'correction']

    if contribution_type not in valid_types:
        return jsonify({'error': f'Invalid type. Must be one of: {valid_types}'}), 400

    contribution = ArchiveContribution(
        user_id=user_id,
        archived_event_id=data.get('archived_event_id'),
        type=contribution_type,
        content=data.get('content'),
        file_url=data.get('file_url'),
    )

    db.session.add(contribution)
    db.session.commit()

    return jsonify({
        'message': 'Contribution submitted for review',
        'contribution': contribution.to_dict(),
    }), 201


@archive_bp.route('/contributions/pending', methods=['GET'])
@jwt_required()
@limiter.limit('30/minute')
def pending_contributions():
    """Get pending contributions (moderators only)."""
    # TODO: Add moderator check

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    contributions = ArchiveContribution.query.filter_by(status='pending')\
        .order_by(ArchiveContribution.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'contributions': [c.to_dict() for c in contributions.items],
        'total': contributions.total,
        'page': page,
        'pages': contributions.pages,
    })


@archive_bp.route('/flyers', methods=['GET'])
@limiter.limit('60/minute')
def list_flyers():
    """List archived flyers."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)

    query = ArchiveFlyer.query

    year = request.args.get('year', type=int)
    if year:
        query = query.filter_by(year=year)

    flyers = query.order_by(ArchiveFlyer.year.desc(), ArchiveFlyer.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'flyers': [f.to_dict() for f in flyers.items],
        'total': flyers.total,
        'page': page,
        'pages': flyers.pages,
    })


@archive_bp.route('/<event_id>/recordings', methods=['GET'])
@limiter.limit('60/minute')
def get_recordings(event_id: str):
    """Get recordings for an archived event."""
    recordings = SetRecording.query.filter_by(archived_event_id=event_id)\
        .order_by(SetRecording.artist_name).all()

    return jsonify({'recordings': [r.to_dict() for r in recordings]})


@archive_bp.route('/search', methods=['GET'])
@limiter.limit('30/minute')
def search():
    """Full-text search across archive."""
    query = request.args.get('q', '')

    if len(query) < 2:
        return jsonify({'error': 'Query must be at least 2 characters'}), 400

    # Search events
    events = ArchivedEvent.query.filter(
        db.or_(
            ArchivedEvent.name.ilike(f'%{query}%'),
            ArchivedEvent.lineup_text.ilike(f'%{query}%'),
            ArchivedEvent.venue_name.ilike(f'%{query}%'),
            ArchivedEvent.organizer_name.ilike(f'%{query}%'),
        )
    ).limit(20).all()

    # Search recordings
    recordings = SetRecording.query.filter(
        db.or_(
            SetRecording.artist_name.ilike(f'%{query}%'),
            SetRecording.title.ilike(f'%{query}%'),
        )
    ).limit(20).all()

    return jsonify({
        'events': [e.to_dict() for e in events],
        'recordings': [r.to_dict() for r in recordings],
    })
