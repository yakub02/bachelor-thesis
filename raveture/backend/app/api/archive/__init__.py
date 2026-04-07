"""
Archive API blueprint.
"""

from flask import Blueprint

archive_bp = Blueprint('archive', __name__)

from app.api.archive import routes  # noqa: F401, E402
