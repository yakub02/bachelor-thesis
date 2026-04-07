"""
Custom decorators for route protection and authorization.
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity

from app.models import User


def admin_required(f):
    """
    Decorator to require admin role.
    Must be used after @jwt_required()
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Unauthorized', 'message': 'User not found'}), 401

        if user.role != 'admin':
            return jsonify({
                'error': 'Forbidden',
                'message': 'Admin access required'
            }), 403

        return f(*args, **kwargs)

    return decorated_function


def moderator_required(f):
    """
    Decorator to require moderator or admin role.
    Must be used after @jwt_required()
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Unauthorized', 'message': 'User not found'}), 401

        if user.role not in ['moderator', 'admin']:
            return jsonify({
                'error': 'Forbidden',
                'message': 'Moderator or admin access required'
            }), 403

        return f(*args, **kwargs)

    return decorated_function
