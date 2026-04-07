"""
Events API blueprint.
"""

from flask import Blueprint

events_bp = Blueprint('events', __name__)

from app.api.events import routes  # noqa: F401, E402
