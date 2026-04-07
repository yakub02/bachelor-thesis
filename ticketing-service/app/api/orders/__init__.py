from flask import Blueprint

orders_bp = Blueprint('orders', __name__)

from app.api.orders import routes  # noqa: E402, F401