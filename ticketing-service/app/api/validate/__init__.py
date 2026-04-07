from flask import Blueprint

validate_bp = Blueprint('validate', __name__)

from app.api.validate import routes  # noqa: E402, F401