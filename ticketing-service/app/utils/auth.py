"""
Authentication and Authorization utilities.

Supports two modes:
1. JWT (for RAVETURE users) - validated via shared secret
2. API Key (for external clients like PSYCHOSOUND) - validated against DB
"""

import hashlib
from functools import wraps
from typing import Optional, Tuple

from flask import request, g, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from app import db
from app.models import ApiClient
from app.utils.security import verify_api_key


# =============================================================================
# AUTHENTICATION DECORATORS
# =============================================================================

def require_auth(f):
    """
    Decorator that requires either JWT or API Key authentication.
    
    Sets g.auth_type ('jwt' or 'api_key') and g.auth_id (user_id or client_id).
    
    Usage:
        @app.route('/protected')
        @require_auth
        def protected_route():
            print(g.auth_type)  # 'jwt' or 'api_key'
            print(g.auth_id)    # user UUID or client UUID
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_result = _authenticate_request()
        
        if not auth_result[0]:
            return {'error': 'Unauthorized', 'message': auth_result[1]}, 401
        
        return f(*args, **kwargs)
    
    return decorated


def require_jwt(f):
    """
    Decorator that requires JWT authentication specifically.
    Use for user-specific operations that don't support API keys.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            g.auth_type = 'jwt'
            g.auth_id = get_jwt_identity()
            g.user_id = get_jwt_identity()  # Convenience alias
        except Exception as e:
            return {'error': 'Unauthorized', 'message': 'Valid JWT required'}, 401
        
        return f(*args, **kwargs)
    
    return decorated


def require_api_key(f):
    """
    Decorator that requires API Key authentication specifically.
    Use for machine-to-machine operations.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        if not api_key:
            return {'error': 'Unauthorized', 'message': 'API key required'}, 401
        
        client = _validate_api_key(api_key)
        
        if not client:
            return {'error': 'Unauthorized', 'message': 'Invalid API key'}, 401
        
        g.auth_type = 'api_key'
        g.auth_id = str(client.id)
        g.api_client = client
        
        return f(*args, **kwargs)
    
    return decorated


# =============================================================================
# INTERNAL AUTHENTICATION LOGIC
# =============================================================================

def _authenticate_request() -> Tuple[bool, str]:
    """
    Attempt to authenticate request via JWT or API Key.
    
    Returns:
        Tuple of (success: bool, error_message: str)
    """
    # Try API Key first (header check is faster than JWT decode)
    api_key = request.headers.get('X-API-Key')
    if api_key:
        client = _validate_api_key(api_key)
        if client:
            g.auth_type = 'api_key'
            g.auth_id = str(client.id)
            g.api_client = client
            
            # Optional: Get user ID from header for user-specific operations
            user_id = request.headers.get('X-User-ID')
            if user_id:
                g.user_id = user_id
            
            return True, ""
        else:
            return False, "Invalid API key"
    
    # Try JWT
    try:
        verify_jwt_in_request()
        g.auth_type = 'jwt'
        g.auth_id = get_jwt_identity()
        g.user_id = get_jwt_identity()
        return True, ""
    except Exception as e:
        pass
    
    return False, "Authentication required (JWT or API Key)"


def _validate_api_key(api_key: str) -> Optional[ApiClient]:
    """
    Validate API key against database.
    
    Returns:
        ApiClient if valid, None otherwise
    """
    # Hash the provided key
    key_hash = hashlib.sha256(api_key.encode('utf-8')).hexdigest()
    
    # Find client by hash
    client = ApiClient.query.filter_by(
        api_key_hash=key_hash,
        is_active=True
    ).first()
    
    if client:
        # Update last used timestamp
        from datetime import datetime
        client.last_used_at = datetime.utcnow()
        db.session.commit()
    
    return client


# =============================================================================
# AUTHORIZATION HELPERS
# =============================================================================

def check_event_access(event_id: str) -> bool:
    """
    Check if current auth context can access specific event.
    
    For API keys, checks allowed_events list.
    For JWT, always returns True (users can access all public events).
    """
    if g.auth_type == 'jwt':
        return True
    
    if g.auth_type == 'api_key':
        return g.api_client.can_access_event(event_id)
    
    return False


def get_current_user_id() -> Optional[str]:
    """
    Get current user ID from auth context.
    
    For JWT: Returns the JWT identity.
    For API Key: Returns X-User-ID header if provided.
    """
    return g.get('user_id')


def require_user_id(f):
    """
    Decorator that ensures user_id is available in context.
    For API key auth, requires X-User-ID header.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not get_current_user_id():
            return {
                'error': 'Bad Request',
                'message': 'User ID required. For API key auth, provide X-User-ID header.'
            }, 400
        return f(*args, **kwargs)
    
    return decorated