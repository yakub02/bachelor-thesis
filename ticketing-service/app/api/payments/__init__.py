"""
Payments API Blueprint.
Handles GoPay payment integration.
"""

from flask import Blueprint

payments_bp = Blueprint('payments', __name__)

from app.api.payments import routes
