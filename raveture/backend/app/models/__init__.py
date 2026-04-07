"""
Database models for RAVETURE Backend.
"""

from app.models.user import User, UserFollow, UserPreferences
from app.models.event import Event, Organizer, Venue, Artist, EventArtist, EventInterest
from app.models.forum import ForumCategory, ForumThread, ForumPost, ForumReaction, ForumReport
from app.models.media import MediaFile, Playlist, PlaylistItem, Album, MediaLike
from app.models.archive import ArchivedEvent, SetRecording, ArchiveContribution, ArchiveFlyer
from app.models.featured import FeaturedEvent

__all__ = [
    # User
    'User', 'UserFollow', 'UserPreferences',
    # Event
    'Event', 'Organizer', 'Venue', 'Artist', 'EventArtist', 'EventInterest',
    # Forum
    'ForumCategory', 'ForumThread', 'ForumPost', 'ForumReaction', 'ForumReport',
    # Media
    'MediaFile', 'Playlist', 'PlaylistItem', 'Album', 'MediaLike',
    # Archive
    'ArchivedEvent', 'SetRecording', 'ArchiveContribution', 'ArchiveFlyer',
    # Featured
    'FeaturedEvent',
]
