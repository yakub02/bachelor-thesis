"""
Archive models for RAVETURE Backend.
Handles historical rave scene archive.
"""

import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID

from app import db


class ContributionType(PyEnum):
    """Types of archive contributions."""
    EVENT = 'event'
    RECORDING = 'recording'
    PHOTO = 'photo'
    FLYER = 'flyer'
    INFO = 'info'
    CORRECTION = 'correction'


class ContributionStatus(PyEnum):
    """Status of contributions."""
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'


class ArchivedEvent(db.Model):
    """
    Archived historical event model.

    Stores information about past events that may not
    have organizers with active accounts.
    """
    __tablename__ = 'archived_events'
    __table_args__ = (
        Index('idx_archived_events_year', 'year'),
        Index('idx_archived_events_city', 'city'),
        Index('idx_archived_events_date', 'date'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('events.id'))  # If migrated from Event

    # Basic info
    name = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, nullable=False)
    year = db.Column(db.Integer, nullable=False, index=True)

    # Location (text-based for old venues)
    venue_name = db.Column(db.String(200))
    city = db.Column(db.String(100))
    country = db.Column(db.String(100), default='CZ')

    # Description
    description = db.Column(db.Text)

    # Organizer (text - may not have account)
    organizer_name = db.Column(db.String(200))

    # Lineup (text format for historical events)
    lineup_text = db.Column(db.Text)

    # Visuals
    flyer_url = db.Column(db.String(500))

    # Source information
    source = db.Column(db.String(200))  # "rave.cz", "user contribution"
    source_url = db.Column(db.String(500))

    # Statistics (denormalized)
    recording_count = db.Column(db.Integer, default=0, nullable=False)
    photo_count = db.Column(db.Integer, default=0, nullable=False)
    contribution_count = db.Column(db.Integer, default=0, nullable=False)

    # Verification
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verified_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))
    verified_at = db.Column(db.DateTime(timezone=True))

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))

    # Relationships
    original_event = db.relationship('Event')
    verifier = db.relationship('User', foreign_keys=[verified_by])
    creator = db.relationship('User', foreign_keys=[created_by])
    recordings = db.relationship('SetRecording', back_populates='archived_event', lazy='dynamic')
    contributions = db.relationship('ArchiveContribution', back_populates='archived_event', lazy='dynamic')
    flyers = db.relationship('ArchiveFlyer', back_populates='archived_event', lazy='dynamic')

    def to_dict(self, include_recordings: bool = False) -> dict:
        """Convert to dictionary for JSON response."""
        data = {
            'id': str(self.id),
            'name': self.name,
            'date': self.date.isoformat(),
            'year': self.year,
            'venue_name': self.venue_name,
            'city': self.city,
            'country': self.country,
            'description': self.description,
            'organizer_name': self.organizer_name,
            'lineup_text': self.lineup_text,
            'flyer_url': self.flyer_url,
            'recording_count': self.recording_count,
            'photo_count': self.photo_count,
            'is_verified': self.is_verified,
            'source': self.source,
        }

        if include_recordings:
            data['recordings'] = [r.to_dict() for r in self.recordings]

        return data


class SetRecording(db.Model):
    """
    Recording of a DJ set from an archived event.
    """
    __tablename__ = 'set_recordings'
    __table_args__ = (
        CheckConstraint(
            "quality IN ('low', 'medium', 'high', 'lossless')",
            name='check_recording_quality_valid'
        ),
        CheckConstraint(
            "source_type IN ('live_recording', 'soundboard', 'radio_rip', 'unknown')",
            name='check_source_type_valid'
        ),
        Index('idx_set_recordings_event', 'archived_event_id'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    archived_event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('archived_events.id'), nullable=False)
    uploader_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)

    # Artist (text - may not have profile)
    artist_name = db.Column(db.String(100), nullable=False)
    artist_id = db.Column(UUID(as_uuid=True), db.ForeignKey('artists.id'))  # Optional link

    # Audio
    audio_url = db.Column(db.String(500), nullable=False)
    duration = db.Column(db.Integer)  # seconds

    # Metadata
    title = db.Column(db.String(200))
    tracklist = db.Column(db.Text)

    # Quality info
    quality = db.Column(db.String(20), default='medium')
    source_type = db.Column(db.String(20), default='unknown')
    bitrate = db.Column(db.Integer)  # kbps

    # Statistics
    play_count = db.Column(db.Integer, default=0, nullable=False)
    download_count = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    archived_event = db.relationship('ArchivedEvent', back_populates='recordings')
    uploader = db.relationship('User')
    artist = db.relationship('Artist')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'id': str(self.id),
            'artist_name': self.artist_name,
            'title': self.title,
            'audio_url': self.audio_url,
            'duration': self.duration,
            'tracklist': self.tracklist,
            'quality': self.quality,
            'source_type': self.source_type,
            'play_count': self.play_count,
            'uploader': {
                'id': str(self.uploader.id),
                'username': self.uploader.username,
            } if self.uploader else None,
            'created_at': self.created_at.isoformat(),
        }


class ArchiveContribution(db.Model):
    """
    User contribution to the archive.

    Moderated submissions from users adding to archive.
    """
    __tablename__ = 'archive_contributions'
    __table_args__ = (
        CheckConstraint(
            "type IN ('event', 'recording', 'photo', 'flyer', 'info', 'correction')",
            name='check_contribution_type_valid'
        ),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name='check_contribution_status_valid'
        ),
        Index('idx_contributions_status', 'status'),
        Index('idx_contributions_user', 'user_id'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    archived_event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('archived_events.id'))

    type = db.Column(db.String(20), nullable=False)

    # Content
    content = db.Column(db.Text)  # Description or data
    file_url = db.Column(db.String(500))  # If file attached

    # Moderation
    status = db.Column(db.String(20), default='pending', nullable=False)
    reviewed_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime(timezone=True))
    review_note = db.Column(db.Text)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id])
    archived_event = db.relationship('ArchivedEvent', back_populates='contributions')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'id': str(self.id),
            'type': self.type,
            'content': self.content,
            'file_url': self.file_url,
            'status': self.status,
            'archived_event_id': str(self.archived_event_id) if self.archived_event_id else None,
            'user': {
                'id': str(self.user.id),
                'username': self.user.username,
            } if self.user else None,
            'created_at': self.created_at.isoformat(),
        }


class ArchiveFlyer(db.Model):
    """
    Historical event flyer.
    """
    __tablename__ = 'archive_flyers'
    __table_args__ = (
        Index('idx_archive_flyers_event', 'archived_event_id'),
        Index('idx_archive_flyers_year', 'year'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    archived_event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('archived_events.id'))
    uploader_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)

    image_url = db.Column(db.String(500), nullable=False)
    thumbnail_url = db.Column(db.String(500))

    year = db.Column(db.Integer)

    # OCR extracted text (for searching)
    extracted_text = db.Column(db.Text)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    archived_event = db.relationship('ArchivedEvent', back_populates='flyers')
    uploader = db.relationship('User')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'id': str(self.id),
            'image_url': self.image_url,
            'thumbnail_url': self.thumbnail_url,
            'year': self.year,
            'archived_event_id': str(self.archived_event_id) if self.archived_event_id else None,
            'uploader': {
                'id': str(self.uploader.id),
                'username': self.uploader.username,
            } if self.uploader else None,
            'created_at': self.created_at.isoformat(),
        }
