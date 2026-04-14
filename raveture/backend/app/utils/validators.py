"""
Input validation schemas for RAVETURE Backend.
Using Pydantic for request validation.
"""

import re
from typing import Optional, List
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


class UserRegister(BaseModel):
    """User registration request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    display_name: Optional[str] = Field(None, max_length=100)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        if v[0].isdigit():
            raise ValueError('Username cannot start with a number')
        return v.lower()

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v


class UserLogin(BaseModel):
    """User login request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """User profile update request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=100)
    website_url: Optional[str] = Field(None, max_length=255)
    soundcloud_url: Optional[str] = Field(None, max_length=255)
    instagram_url: Optional[str] = Field(None, max_length=255)


class PasswordChange(BaseModel):
    """Password change request."""
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v


class EventCreate(BaseModel):
    """Event creation request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=3, max_length=200)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    starts_at: datetime
    ends_at: Optional[datetime] = None
    doors_open_at: Optional[datetime] = None
    venue_id: Optional[str] = None
    genres: Optional[List[str]] = None
    event_type: str = Field(default='club_night')
    ticketing_enabled: bool = False
    external_ticket_url: Optional[str] = None
    min_age: int = Field(default=18, ge=0, le=99)
    cover_image_url: Optional[str] = Field(None, max_length=500)

    @field_validator('event_type')
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        valid_types = ['club_night', 'festival', 'open_air', 'warehouse', 'stream', 'private']
        if v not in valid_types:
            raise ValueError(f'Invalid event type. Must be one of: {valid_types}')
        return v


class VenueCreate(BaseModel):
    """Venue creation request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=200)
    description: Optional[str] = None
    address: Optional[str] = Field(None, max_length=300)
    city: str = Field(min_length=2, max_length=100)
    country: str = Field(default='CZ', max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    capacity: Optional[int] = Field(None, ge=1)


class ArtistCreate(BaseModel):
    """Artist creation request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    bio: Optional[str] = None
    genres: Optional[List[str]] = None
    soundcloud_url: Optional[str] = None
    mixcloud_url: Optional[str] = None
    instagram_url: Optional[str] = None
    is_local: bool = True
    country: str = Field(default='CZ')
    city: Optional[str] = None


class VenueUpdate(BaseModel):
    """Venue update request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    address: Optional[str] = Field(None, max_length=300)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    capacity: Optional[int] = Field(None, ge=1)
    image_url: Optional[str] = Field(None, max_length=500)


class ForgotPassword(BaseModel):
    """Forgot password request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr


class ResetPassword(BaseModel):
    """Reset password request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v


class ForumThreadCreate(BaseModel):
    """Forum thread creation request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=5, max_length=200)
    content: str = Field(min_length=10, max_length=50000)
    category_id: str
    subtitle: Optional[str] = Field(default=None, max_length=300)
    cover_image_url: Optional[str] = Field(default=None, max_length=500)


class ForumPostCreate(BaseModel):
    """Forum post creation request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    content: str = Field(min_length=1, max_length=50000)
    reply_to_id: Optional[str] = None


class MediaUpload(BaseModel):
    """Media upload request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    type: str
    event_id: Optional[str] = None
    artist_id: Optional[str] = None
    genres: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    is_downloadable: bool = False

    @field_validator('type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        valid_types = ['audio_set', 'podcast', 'video', 'photo', 'flyer']
        if v not in valid_types:
            raise ValueError(f'Invalid media type. Must be one of: {valid_types}')
        return v


class PlaylistCreate(BaseModel):
    """Playlist creation request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    is_public: bool = True


class ArchiveEventCreate(BaseModel):
    """Archive event creation request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=3, max_length=200)
    date: str  # ISO date string
    venue_name: Optional[str] = None
    city: Optional[str] = None
    country: str = Field(default='CZ')
    description: Optional[str] = None
    organizer_name: Optional[str] = None
    lineup_text: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None


# Helper functions
def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_username(username: str) -> bool:
    """Validate username format."""
    if len(username) < 3 or len(username) > 50:
        return False
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False
    if username[0].isdigit():
        return False
    return True
