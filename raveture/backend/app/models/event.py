"""
Event models for RAVETURE Backend.
Handles events, organizers, venues, artists, and lineups.
"""

import uuid7
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY

from app import db


class EventStatus(PyEnum):
    """Event publication status."""
    DRAFT = 'draft'
    PUBLISHED = 'published'
    CANCELLED = 'cancelled'
    COMPLETED = 'completed'


class EventType(PyEnum):
    """Type of event."""
    CLUB_NIGHT = 'club_night'
    FESTIVAL = 'festival'
    OPEN_AIR = 'open_air'
    WAREHOUSE = 'warehouse'
    STREAM = 'stream'
    PRIVATE = 'private'


class Event(db.Model):
    """
    Event/party model.

    Core model for event management and discovery.
    """
    __tablename__ = 'events'
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'published', 'cancelled', 'completed')",
            name='check_event_status_valid'
        ),
        Index('idx_events_date', 'starts_at'),
        Index('idx_events_status', 'status'),
        Index('idx_events_organizer', 'organizer_id'),
        Index('idx_events_slug', 'slug', unique=True),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid7.uuid7)
    organizer_id = db.Column(UUID(as_uuid=True), db.ForeignKey('organizers.id'), nullable=False)
    venue_id = db.Column(UUID(as_uuid=True), db.ForeignKey('venues.id'))

    # Basic info
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    description = db.Column(db.Text)
    short_description = db.Column(db.String(500))

    # Date and time
    starts_at = db.Column(db.DateTime(timezone=True), nullable=False)
    ends_at = db.Column(db.DateTime(timezone=True))
    doors_open_at = db.Column(db.DateTime(timezone=True))

    # Visuals
    cover_image_url = db.Column(db.String(500))
    flyer_url = db.Column(db.String(500))

    # Categorization
    genres = db.Column(ARRAY(db.String(50)))
    event_type = db.Column(db.String(20), default='club_night')

    # Status
    status = db.Column(db.String(20), default='draft', nullable=False)
    is_featured = db.Column(db.Boolean, default=False, nullable=False)

    # Ticketing
    ticketing_enabled = db.Column(db.Boolean, default=False, nullable=False)
    external_ticket_url = db.Column(db.String(500))
    min_age = db.Column(db.Integer, default=18)

    # Metrics (denormalized for performance)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    interested_count = db.Column(db.Integer, default=0, nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = db.Column(db.DateTime(timezone=True))

    # Relationships
    organizer = db.relationship('Organizer', back_populates='events')
    venue = db.relationship('Venue', back_populates='events')
    lineup = db.relationship('EventArtist', back_populates='event', lazy='dynamic', cascade='all, delete-orphan')
    interests = db.relationship('EventInterest', back_populates='event', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_lineup: bool = False) -> dict:
        """Convert to dictionary for JSON response."""
        data = {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'short_description': self.short_description,
            'starts_at': self.starts_at.isoformat(),
            'ends_at': self.ends_at.isoformat() if self.ends_at else None,
            'doors_open_at': self.doors_open_at.isoformat() if self.doors_open_at else None,
            'cover_image_url': self.cover_image_url,
            'flyer_url': self.flyer_url,
            'genres': self.genres or [],
            'event_type': self.event_type,
            'status': self.status,
            'is_featured': self.is_featured,
            'ticketing_enabled': self.ticketing_enabled,
            'external_ticket_url': self.external_ticket_url,
            'min_age': self.min_age,
            'view_count': self.view_count,
            'interested_count': self.interested_count,
            'organizer': self.organizer.to_dict() if self.organizer else None,
            'venue': self.venue.to_dict() if self.venue else None,
        }

        if include_lineup:
            data['lineup'] = [ea.to_dict() for ea in self.lineup.order_by(EventArtist.order)]

        return data


class Organizer(db.Model):
    """
    Event organizer/promoter model.

    Links to a user account and can create events.
    """
    __tablename__ = 'organizers'
    __table_args__ = (
        Index('idx_organizers_slug', 'slug', unique=True),
        Index('idx_organizers_user', 'user_id'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid7.uuid7)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)

    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    logo_url = db.Column(db.String(500))

    is_verified = db.Column(db.Boolean, default=False, nullable=False)

    # Contact
    email = db.Column(db.String(255))
    website_url = db.Column(db.String(255))
    instagram_url = db.Column(db.String(255))
    facebook_url = db.Column(db.String(255))

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User')
    events = db.relationship('Event', back_populates='organizer', lazy='dynamic')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'logo_url': self.logo_url,
            'is_verified': self.is_verified,
            'website_url': self.website_url,
            'instagram_url': self.instagram_url,
        }


class Venue(db.Model):
    """
    Event venue model.

    Physical location where events take place.
    """
    __tablename__ = 'venues'
    __table_args__ = (
        Index('idx_venues_city', 'city'),
        Index('idx_venues_slug', 'slug', unique=True),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid7.uuid7)
    created_by_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))

    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True)
    description = db.Column(db.Text)

    # Address
    address = db.Column(db.String(300))
    city = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(100), default='CZ', nullable=False)
    postal_code = db.Column(db.String(20))

    # GPS coordinates
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    # Details
    capacity = db.Column(db.Integer)
    image_url = db.Column(db.String(500))

    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    events = db.relationship('Event', back_populates='venue', lazy='dynamic')
    created_by = db.relationship('User')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'address': self.address,
            'city': self.city,
            'country': self.country,
            'capacity': self.capacity,
            'image_url': self.image_url,
            'latitude': self.latitude,
            'longitude': self.longitude,
        }


class Artist(db.Model):
    """
    Artist/DJ model.

    Can be linked to a user account or standalone.
    """
    __tablename__ = 'artists'
    __table_args__ = (
        Index('idx_artists_slug', 'slug', unique=True),
        Index('idx_artists_name', 'name'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid7.uuid7)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))  # Optional link

    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True)
    bio = db.Column(db.Text)

    genres = db.Column(ARRAY(db.String(50)))

    # Visuals
    photo_url = db.Column(db.String(500))

    # Social links
    soundcloud_url = db.Column(db.String(255))
    mixcloud_url = db.Column(db.String(255))
    instagram_url = db.Column(db.String(255))
    bandcamp_url = db.Column(db.String(255))
    spotify_url = db.Column(db.String(255))

    # Origin
    is_local = db.Column(db.Boolean, default=True, nullable=False)
    country = db.Column(db.String(100), default='CZ')
    city = db.Column(db.String(100))

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User')
    events = db.relationship('EventArtist', back_populates='artist', lazy='dynamic')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'bio': self.bio,
            'genres': self.genres or [],
            'photo_url': self.photo_url,
            'soundcloud_url': self.soundcloud_url,
            'mixcloud_url': self.mixcloud_url,
            'instagram_url': self.instagram_url,
            'is_local': self.is_local,
            'country': self.country,
            'city': self.city,
        }


class EventArtist(db.Model):
    """
    Event lineup - links events to artists.

    Represents artist appearance at an event.
    """
    __tablename__ = 'event_artists'

    event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('events.id', ondelete='CASCADE'), primary_key=True)
    artist_id = db.Column(UUID(as_uuid=True), db.ForeignKey('artists.id', ondelete='CASCADE'), primary_key=True)

    set_time = db.Column(db.Time)  # When they play
    set_end_time = db.Column(db.Time)
    stage = db.Column(db.String(100))  # "Main Floor", "Room 2"
    is_headliner = db.Column(db.Boolean, default=False, nullable=False)

    order = db.Column(db.Integer, default=0)  # Order in lineup display

    # Relationships
    event = db.relationship('Event', back_populates='lineup')
    artist = db.relationship('Artist', back_populates='events')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'artist': self.artist.to_dict(),
            'set_time': self.set_time.isoformat() if self.set_time else None,
            'set_end_time': self.set_end_time.isoformat() if self.set_end_time else None,
            'stage': self.stage,
            'is_headliner': self.is_headliner,
        }


class EventInterest(db.Model):
    """
    User interest in an event.

    Tracks who is interested/going to events.
    """
    __tablename__ = 'event_interests'

    event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('events.id', ondelete='CASCADE'), primary_key=True)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)

    status = db.Column(db.String(20), default='interested')  # interested, going
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    event = db.relationship('Event', back_populates='interests')
    user = db.relationship('User')
