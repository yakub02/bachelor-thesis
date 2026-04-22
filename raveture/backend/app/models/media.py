"""
Media models for RAVETURE Backend.
Handles audio sets, videos, photos, and playlists.
"""

import uuid7
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Index, CheckConstraint
from sqlalchemy.dialects.postgresql import JSON
from app.utils.types import ArrayType, CompatUUID

from app import db


class MediaType(PyEnum):
    """Types of media content."""
    AUDIO_SET = 'audio_set'
    PODCAST = 'podcast'
    VIDEO = 'video'
    PHOTO = 'photo'
    FLYER = 'flyer'


class MediaFile(db.Model):
    """
    Media file model.

    Stores audio sets, photos, videos uploaded by users.
    """
    __tablename__ = 'media_files'
    __table_args__ = (
        CheckConstraint(
            "type IN ('audio_set', 'podcast', 'video', 'photo', 'flyer')",
            name='check_media_type_valid'
        ),
        Index('idx_media_type', 'type'),
        Index('idx_media_uploader', 'uploader_id'),
        Index('idx_media_event', 'event_id'),
        Index('idx_media_created', 'created_at'),
    )

    id = db.Column(CompatUUID(), primary_key=True, default=uuid7.uuid7)
    uploader_id = db.Column(CompatUUID(), db.ForeignKey('users.id'), nullable=False)

    # Optional associations
    event_id = db.Column(CompatUUID(), db.ForeignKey('events.id'))
    artist_id = db.Column(CompatUUID(), db.ForeignKey('artists.id'))

    # Type and format
    type = db.Column(db.String(20), nullable=False)
    mime_type = db.Column(db.String(100))

    # Metadata
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)

    # File info
    file_url = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.BigInteger)  # bytes
    duration = db.Column(db.Integer)  # seconds (for audio/video)

    # Audio specific
    waveform_data = db.Column(JSON)  # For visualization
    tracklist = db.Column(db.Text)  # Track listing

    # Image specific
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    thumbnail_url = db.Column(db.String(500))

    # Categorization
    genres = db.Column(ArrayType(db.String(50)))
    tags = db.Column(ArrayType(db.String(50)))

    # Statistics
    play_count = db.Column(db.Integer, default=0, nullable=False)
    download_count = db.Column(db.Integer, default=0, nullable=False)
    like_count = db.Column(db.Integer, default=0, nullable=False)

    # Settings
    is_public = db.Column(db.Boolean, default=True, nullable=False)
    is_downloadable = db.Column(db.Boolean, default=False, nullable=False)
    is_featured = db.Column(db.Boolean, default=False, nullable=False)

    # Moderation
    is_approved = db.Column(db.Boolean, default=True, nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    recorded_at = db.Column(db.DateTime(timezone=True))  # When the set was recorded

    # Relationships
    uploader = db.relationship('User')
    event = db.relationship('Event')
    artist = db.relationship('Artist')
    likes = db.relationship('MediaLike', back_populates='media', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        data = {
            'id': str(self.id),
            'type': self.type,
            'title': self.title,
            'description': self.description,
            'file_url': self.file_url,
            'thumbnail_url': self.thumbnail_url,
            'duration': self.duration,
            'genres': self.genres or [],
            'tags': self.tags or [],
            'play_count': self.play_count,
            'like_count': self.like_count,
            'is_downloadable': self.is_downloadable,
            'uploader': {
                'id': str(self.uploader.id),
                'username': self.uploader.username,
                'avatar_url': self.uploader.avatar_url,
            } if self.uploader else None,
            'created_at': self.created_at.isoformat(),
            'recorded_at': self.recorded_at.isoformat() if self.recorded_at else None,
        }

        if self.event:
            data['event'] = {
                'id': str(self.event.id),
                'name': self.event.name,
                'slug': self.event.slug,
            }

        if self.artist:
            data['artist'] = {
                'id': str(self.artist.id),
                'name': self.artist.name,
                'slug': self.artist.slug,
            }

        return data


class Playlist(db.Model):
    """
    User playlist model.

    Collection of media files curated by users.
    """
    __tablename__ = 'playlists'
    __table_args__ = (
        Index('idx_playlists_creator', 'creator_id'),
        Index('idx_playlists_public', 'is_public'),
    )

    id = db.Column(CompatUUID(), primary_key=True, default=uuid7.uuid7)
    creator_id = db.Column(CompatUUID(), db.ForeignKey('users.id'), nullable=False)

    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    cover_url = db.Column(db.String(500))

    is_public = db.Column(db.Boolean, default=True, nullable=False)

    # Statistics (denormalized)
    track_count = db.Column(db.Integer, default=0, nullable=False)
    total_duration = db.Column(db.Integer, default=0, nullable=False)  # seconds
    follower_count = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('User')
    items = db.relationship('PlaylistItem', back_populates='playlist', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_items: bool = False) -> dict:
        """Convert to dictionary for JSON response."""
        data = {
            'id': str(self.id),
            'name': self.name,
            'description': self.description,
            'cover_url': self.cover_url,
            'is_public': self.is_public,
            'track_count': self.track_count,
            'total_duration': self.total_duration,
            'follower_count': self.follower_count,
            'creator': {
                'id': str(self.creator.id),
                'username': self.creator.username,
                'avatar_url': self.creator.avatar_url,
            } if self.creator else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

        if include_items:
            data['items'] = [item.to_dict() for item in self.items.order_by(PlaylistItem.order)]

        return data


class PlaylistItem(db.Model):
    """
    Playlist item - link between playlist and media.
    """
    __tablename__ = 'playlist_items'

    playlist_id = db.Column(CompatUUID(), db.ForeignKey('playlists.id', ondelete='CASCADE'), primary_key=True)
    media_id = db.Column(CompatUUID(), db.ForeignKey('media_files.id', ondelete='CASCADE'), primary_key=True)

    order = db.Column(db.Integer, nullable=False, default=0)
    added_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    playlist = db.relationship('Playlist', back_populates='items')
    media = db.relationship('MediaFile')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'order': self.order,
            'added_at': self.added_at.isoformat(),
            'media': self.media.to_dict() if self.media else None,
        }


class Album(db.Model):
    """
    Photo album model.

    Collection of photos from an event.
    """
    __tablename__ = 'albums'
    __table_args__ = (
        Index('idx_albums_event', 'event_id'),
        Index('idx_albums_creator', 'creator_id'),
    )

    id = db.Column(CompatUUID(), primary_key=True, default=uuid7.uuid7)
    event_id = db.Column(CompatUUID(), db.ForeignKey('events.id'))
    creator_id = db.Column(CompatUUID(), db.ForeignKey('users.id'), nullable=False)

    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    cover_url = db.Column(db.String(500))

    photo_count = db.Column(db.Integer, default=0, nullable=False)

    is_public = db.Column(db.Boolean, default=True, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    event = db.relationship('Event')
    creator = db.relationship('User')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'id': str(self.id),
            'title': self.title,
            'description': self.description,
            'cover_url': self.cover_url,
            'photo_count': self.photo_count,
            'is_public': self.is_public,
            'event': {
                'id': str(self.event.id),
                'name': self.event.name,
            } if self.event else None,
            'creator': {
                'id': str(self.creator.id),
                'username': self.creator.username,
            } if self.creator else None,
            'created_at': self.created_at.isoformat(),
        }


class MediaLike(db.Model):
    """
    Like on media content.
    """
    __tablename__ = 'media_likes'

    media_id = db.Column(CompatUUID(), db.ForeignKey('media_files.id', ondelete='CASCADE'), primary_key=True)
    user_id = db.Column(CompatUUID(), db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    media = db.relationship('MediaFile', back_populates='likes')
    user = db.relationship('User')
