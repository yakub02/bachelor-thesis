"""
User models for RAVETURE Backend.
Handles authentication, profiles, and user relationships.
"""

import uuid7
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Index, CheckConstraint
from app.utils.types import ArrayType, CompatUUID

from app import db


class UserRole(PyEnum):
    """User roles in the system."""
    USER = 'user'
    ARTIST = 'artist'
    ORGANIZER = 'organizer'
    MODERATOR = 'moderator'
    ADMIN = 'admin'


class PrivacyLevel(PyEnum):
    """Profile privacy settings."""
    PUBLIC = 'public'
    FOLLOWERS = 'followers'
    PRIVATE = 'private'


class User(db.Model):
    """
    User account model.

    Handles authentication and profile information.
    Central to all platform features.
    """
    __tablename__ = 'users'
    __table_args__ = (
        CheckConstraint(
            "role IN ('user', 'artist', 'organizer', 'moderator', 'admin')",
            name='check_user_role_valid'
        ),
        Index('idx_users_email', 'email', unique=True),
        Index('idx_users_username', 'username', unique=True),
    )

    id = db.Column(CompatUUID(), primary_key=True, default=uuid7.uuid7)

    # Authentication
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # Profile
    display_name = db.Column(db.String(100))
    avatar_url = db.Column(db.String(500))
    bio = db.Column(db.Text)
    location = db.Column(db.String(100))

    # Role and status
    role = db.Column(db.String(20), default='user', nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Social links
    website_url = db.Column(db.String(255))
    soundcloud_url = db.Column(db.String(255))
    instagram_url = db.Column(db.String(255))
    mixcloud_url = db.Column(db.String(255))

    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = db.Column(db.DateTime(timezone=True))

    # Email verification
    email_verified_at = db.Column(db.DateTime(timezone=True))
    verification_token = db.Column(db.String(100))

    # Password reset
    reset_token = db.Column(db.String(100))
    reset_token_expires = db.Column(db.DateTime(timezone=True))

    # Relationships
    preferences = db.relationship('UserPreferences', back_populates='user', uselist=False, cascade='all, delete-orphan')
    followers = db.relationship(
        'UserFollow',
        foreign_keys='UserFollow.following_id',
        back_populates='following',
        lazy='dynamic'
    )
    following = db.relationship(
        'UserFollow',
        foreign_keys='UserFollow.follower_id',
        back_populates='follower',
        lazy='dynamic'
    )

    @property
    def follower_count(self) -> int:
        """Get number of followers."""
        return self.followers.count()

    @property
    def following_count(self) -> int:
        """Get number of users being followed."""
        return self.following.count()

    def to_dict(self, include_private: bool = False) -> dict:
        """Convert to dictionary for JSON response."""
        data = {
            'id': str(self.id),
            'username': self.username,
            'display_name': self.display_name or self.username,
            'avatar_url': self.avatar_url,
            'bio': self.bio,
            'location': self.location,
            'role': self.role,
            'is_verified': self.is_verified,
            'follower_count': self.follower_count,
            'following_count': self.following_count,
            'created_at': self.created_at.isoformat(),
            'website_url': self.website_url,
            'soundcloud_url': self.soundcloud_url,
            'instagram_url': self.instagram_url,
        }

        if include_private:
            data.update({
                'email': self.email,
                'is_active': self.is_active,
                'email_verified_at': self.email_verified_at.isoformat() if self.email_verified_at else None,
                'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
            })

        return data


class UserFollow(db.Model):
    """
    User follow relationships.

    Tracks who follows whom for social features.
    """
    __tablename__ = 'user_follows'
    __table_args__ = (
        CheckConstraint(
            'follower_id != following_id',
            name='check_no_self_follow'
        ),
    )

    follower_id = db.Column(
        CompatUUID(),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True
    )
    following_id = db.Column(
        CompatUUID(),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True
    )
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    follower = db.relationship('User', foreign_keys=[follower_id], back_populates='following')
    following = db.relationship('User', foreign_keys=[following_id], back_populates='followers')


class UserPreferences(db.Model):
    """
    User preferences and settings.

    Stores notification and privacy preferences.
    """
    __tablename__ = 'user_preferences'
    __table_args__ = (
        CheckConstraint(
            "privacy_profile IN ('public', 'followers', 'private')",
            name='check_privacy_valid'
        ),
    )

    user_id = db.Column(
        CompatUUID(),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True
    )

    # Notifications
    email_notifications = db.Column(db.Boolean, default=True, nullable=False)
    push_notifications = db.Column(db.Boolean, default=True, nullable=False)
    event_reminders = db.Column(db.Boolean, default=True, nullable=False)
    forum_replies = db.Column(db.Boolean, default=True, nullable=False)
    new_followers = db.Column(db.Boolean, default=True, nullable=False)

    # Privacy
    privacy_profile = db.Column(db.String(20), default='public', nullable=False)
    show_listening_activity = db.Column(db.Boolean, default=True, nullable=False)

    # Preferences
    preferred_genres = db.Column(ArrayType(db.String(50)))
    preferred_cities = db.Column(ArrayType(db.String(100)))

    # Theme
    dark_mode = db.Column(db.Boolean, default=True, nullable=False)

    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', back_populates='preferences')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'email_notifications': self.email_notifications,
            'push_notifications': self.push_notifications,
            'event_reminders': self.event_reminders,
            'forum_replies': self.forum_replies,
            'new_followers': self.new_followers,
            'privacy_profile': self.privacy_profile,
            'show_listening_activity': self.show_listening_activity,
            'preferred_genres': self.preferred_genres or [],
            'preferred_cities': self.preferred_cities or [],
            'dark_mode': self.dark_mode,
        }
