"""
Media routes.
Handles audio sets, photos, videos, and playlists.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, jwt_required

from app import db, limiter
from app.api.media import media_bp
from app.models.media import MediaFile, Playlist, PlaylistItem, Album, MediaLike


@media_bp.route('/', methods=['GET'])
@limiter.limit('60/minute')
def list_media():
    """List media files with filters."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    query = MediaFile.query.filter_by(is_public=True, is_approved=True)

    # Filters
    media_type = request.args.get('type')
    if media_type:
        query = query.filter_by(type=media_type)

    genre = request.args.get('genre')
    if genre:
        query = query.filter(MediaFile.genres.contains([genre]))

    event_id = request.args.get('event_id')
    if event_id:
        query = query.filter_by(event_id=event_id)

    artist_id = request.args.get('artist_id')
    if artist_id:
        query = query.filter_by(artist_id=artist_id)

    # Sort
    sort = request.args.get('sort', 'recent')
    if sort == 'popular':
        query = query.order_by(MediaFile.play_count.desc())
    elif sort == 'likes':
        query = query.order_by(MediaFile.like_count.desc())
    else:
        query = query.order_by(MediaFile.created_at.desc())

    media = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'media': [m.to_dict() for m in media.items],
        'total': media.total,
        'page': page,
        'pages': media.pages,
    })


@media_bp.route('/<media_id>', methods=['GET'])
@limiter.limit('60/minute')
def get_media(media_id: str):
    """Get media details."""
    media = MediaFile.query.get(media_id)

    if not media or not media.is_public:
        return jsonify({'error': 'Media not found'}), 404

    # Increment play count
    media.play_count += 1
    db.session.commit()

    return jsonify({'media': media.to_dict()})


@media_bp.route('/<media_id>/like', methods=['POST'])
@jwt_required()
@limiter.limit('60/minute')
def like_media(media_id: str):
    """Like a media file."""
    user_id = get_jwt_identity()

    media = MediaFile.query.get(media_id)
    if not media:
        return jsonify({'error': 'Media not found'}), 404

    existing = MediaLike.query.filter_by(
        media_id=media_id,
        user_id=user_id
    ).first()

    if existing:
        return jsonify({'error': 'Already liked'}), 400

    like = MediaLike(media_id=media_id, user_id=user_id)
    db.session.add(like)

    media.like_count += 1
    db.session.commit()

    return jsonify({'message': 'Liked'})


@media_bp.route('/<media_id>/like', methods=['DELETE'])
@jwt_required()
@limiter.limit('60/minute')
def unlike_media(media_id: str):
    """Unlike a media file."""
    user_id = get_jwt_identity()

    like = MediaLike.query.filter_by(
        media_id=media_id,
        user_id=user_id
    ).first()

    if not like:
        return jsonify({'error': 'Not liked'}), 400

    media = MediaFile.query.get(media_id)
    if media:
        media.like_count = max(0, media.like_count - 1)

    db.session.delete(like)
    db.session.commit()

    return jsonify({'message': 'Unliked'})


# ============================================================================
# PLAYLISTS
# ============================================================================

@media_bp.route('/playlists', methods=['GET'])
@limiter.limit('60/minute')
def list_playlists():
    """List public playlists."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    query = Playlist.query.filter_by(is_public=True)\
        .order_by(Playlist.follower_count.desc())

    playlists = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'playlists': [p.to_dict() for p in playlists.items],
        'total': playlists.total,
        'page': page,
        'pages': playlists.pages,
    })


@media_bp.route('/playlists', methods=['POST'])
@jwt_required()
@limiter.limit('10/minute')
def create_playlist():
    """Create a new playlist."""
    user_id = get_jwt_identity()
    data = request.get_json()

    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name required'}), 400

    playlist = Playlist(
        creator_id=user_id,
        name=name,
        description=data.get('description'),
        is_public=data.get('is_public', True),
    )

    db.session.add(playlist)
    db.session.commit()

    return jsonify({
        'message': 'Playlist created',
        'playlist': playlist.to_dict(),
    }), 201


@media_bp.route('/playlists/<playlist_id>', methods=['GET'])
@limiter.limit('60/minute')
def get_playlist(playlist_id: str):
    """Get playlist with items."""
    playlist = Playlist.query.get(playlist_id)

    if not playlist:
        return jsonify({'error': 'Playlist not found'}), 404

    if not playlist.is_public:
        return jsonify({'error': 'Playlist is private'}), 403

    return jsonify({'playlist': playlist.to_dict(include_items=True)})


@media_bp.route('/playlists/<playlist_id>/items', methods=['POST'])
@jwt_required()
@limiter.limit('30/minute')
def add_to_playlist(playlist_id: str):
    """Add media to playlist."""
    user_id = get_jwt_identity()

    playlist = Playlist.query.get(playlist_id)
    if not playlist:
        return jsonify({'error': 'Playlist not found'}), 404

    if str(playlist.creator_id) != user_id:
        return jsonify({'error': 'Not authorized'}), 403

    data = request.get_json()
    media_id = data.get('media_id')

    media = MediaFile.query.get(media_id)
    if not media:
        return jsonify({'error': 'Media not found'}), 404

    # Check if already in playlist
    existing = PlaylistItem.query.filter_by(
        playlist_id=playlist_id,
        media_id=media_id
    ).first()

    if existing:
        return jsonify({'error': 'Already in playlist'}), 400

    # Get next order
    max_order = db.session.query(db.func.max(PlaylistItem.order))\
        .filter_by(playlist_id=playlist_id).scalar() or 0

    item = PlaylistItem(
        playlist_id=playlist_id,
        media_id=media_id,
        order=max_order + 1
    )

    db.session.add(item)

    # Update stats
    playlist.track_count += 1
    if media.duration:
        playlist.total_duration += media.duration

    db.session.commit()

    return jsonify({'message': 'Added to playlist'})


@media_bp.route('/playlists/<playlist_id>/items/<media_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit('30/minute')
def remove_from_playlist(playlist_id: str, media_id: str):
    """Remove media from playlist."""
    user_id = get_jwt_identity()

    playlist = Playlist.query.get(playlist_id)
    if not playlist:
        return jsonify({'error': 'Playlist not found'}), 404

    if str(playlist.creator_id) != user_id:
        return jsonify({'error': 'Not authorized'}), 403

    item = PlaylistItem.query.filter_by(
        playlist_id=playlist_id,
        media_id=media_id
    ).first()

    if not item:
        return jsonify({'error': 'Not in playlist'}), 404

    media = MediaFile.query.get(media_id)

    db.session.delete(item)

    # Update stats
    playlist.track_count = max(0, playlist.track_count - 1)
    if media and media.duration:
        playlist.total_duration = max(0, playlist.total_duration - media.duration)

    db.session.commit()

    return jsonify({'message': 'Removed from playlist'})


# ============================================================================
# ALBUMS
# ============================================================================

@media_bp.route('/albums', methods=['GET'])
@limiter.limit('60/minute')
def list_albums():
    """List photo albums."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    query = Album.query.filter_by(is_public=True)\
        .order_by(Album.created_at.desc())

    event_id = request.args.get('event_id')
    if event_id:
        query = query.filter_by(event_id=event_id)

    albums = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'albums': [a.to_dict() for a in albums.items],
        'total': albums.total,
        'page': page,
        'pages': albums.pages,
    })


@media_bp.route('/albums/<album_id>', methods=['GET'])
@limiter.limit('60/minute')
def get_album(album_id: str):
    """Get album with photos."""
    album = Album.query.get(album_id)

    if not album or not album.is_public:
        return jsonify({'error': 'Album not found'}), 404

    # Get photos in album
    photos = MediaFile.query.filter_by(
        type='photo',
        is_public=True
    ).filter(
        MediaFile.tags.contains([f'album:{album_id}'])
    ).all()

    data = album.to_dict()
    data['photos'] = [p.to_dict() for p in photos]

    return jsonify({'album': data})
