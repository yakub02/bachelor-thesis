"""
API blueprints for RAVETURE Backend.
"""

from app.api.auth import auth_bp
from app.api.users import users_bp
from app.api.events import events_bp
from app.api.forum import forum_bp
from app.api.media import media_bp
from app.api.archive import archive_bp
from app.api.admin import admin_bp

__all__ = [
    'auth_bp',
    'users_bp',
    'events_bp',
    'forum_bp',
    'media_bp',
    'archive_bp',
    'admin_bp',
]
