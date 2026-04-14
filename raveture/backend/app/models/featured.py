"""
FeaturedEvent model for RAVETURE Picks.
Tracks curator information and reasoning for featured events.
"""

import uuid7
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID

from app import db


class FeaturedEvent(db.Model):
    """
    RAVETURE Pick - Curated event selection.

    Stores information about why an event was featured,
    who featured it, and when.
    """
    __tablename__ = 'featured_events'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid7.uuid7)

    # Event being featured
    event_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey('events.id', ondelete='CASCADE'),
        nullable=False,
        unique=True  # Event can only be featured once at a time
    )

    # Curator who picked this event (must be admin/moderator)
    curator_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True  # Nullable in case curator is deleted
    )

    # Why was this picked?
    reason = db.Column(db.Text, nullable=False)

    # When was it featured
    featured_at = db.Column(
        db.DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Optional: when to stop featuring (auto-unfeature)
    expires_at = db.Column(db.DateTime(timezone=True))

    # Relationships
    event = db.relationship('Event', backref='featured_pick')
    curator = db.relationship('User', backref='curated_events')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'id': str(self.id),
            'event_id': str(self.event_id),
            'curator': {
                'id': str(self.curator.id),
                'display_name': self.curator.display_name or self.curator.username,
                'avatar_url': self.curator.avatar_url,
                'role': self.curator.role
            } if self.curator else None,
            'reason': self.reason,
            'featured_at': self.featured_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }
