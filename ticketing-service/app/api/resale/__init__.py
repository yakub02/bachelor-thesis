from flask import Blueprint

resale_bp = Blueprint('resale', __name__)

from app.api.resale import routes  # noqa: E402, F401