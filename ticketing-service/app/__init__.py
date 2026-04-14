"""
RAVETURE Ticketing Service - Application Factory

Security features:
- Rate limiting per IP and per API key
- CORS with strict origins
- JWT authentication
- Request ID tracking
"""

import uuid
from flask import Flask, request, g
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mail import Mail
from flasgger import Swagger

from app.config import config

# =============================================================================
# EXTENSION INSTANCES (without app)
# =============================================================================

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()

# Rate limiter - key function determines how to identify users
def get_rate_limit_key():
    """
    Identify requester for rate limiting.
    Priority: API Key > JWT User ID > IP Address
    """
    # Check for API key first
    api_key = request.headers.get('X-API-Key')
    if api_key:
        return f"api_key:{api_key[:16]}"  # Use prefix only for privacy
    
    # Check for JWT user
    try:
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        if user_id:
            return f"user:{user_id}"
    except:
        pass
    
    # Fallback to IP
    return f"ip:{get_remote_address()}"


limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["100 per minute"],  # Default for all routes
    storage_uri="memory://",  # Use Redis in production
)


# =============================================================================
# APPLICATION FACTORY
# =============================================================================

def create_app(config_name='default'):
    """
    Create and configure the Flask application.
    
    Args:
        config_name: Configuration to use (development/production/testing)
    
    Returns:
        Configured Flask application
    """
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    mail.init_app(app)
    
    # CORS - strict in production
    if config_name == 'production':
        # Only allow specific origins in production
        CORS(app, origins=[
            "https://raveture.cz",
            "https://www.raveture.cz",
            "https://psychosound.cz"
        ])
    else:
        # Allow all in development
        CORS(app)

    # Swagger configuration
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": "apispec",
                "route": "/apispec.json",
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/docs"
    }

    # Swagger host - dynamic based on environment
    import os
    swagger_host = os.getenv('SWAGGER_HOST', 'localhost:5001')
    swagger_schemes = ["https"] if config_name == 'production' else ["http", "https"]

    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "RAVETURE Ticketing API",
            "description": "Secure ticketing system for events with QR code validation and P2P resale marketplace",
            "version": "1.0.0",
            "contact": {
                "name": "RAVETURE Support",
                "url": "https://raveture.cz"
            }
        },
        "host": swagger_host,
        "basePath": "/api/v1",
        "schemes": swagger_schemes,
        "securityDefinitions": {
            "ApiKeyAuth": {
                "type": "apiKey",
                "in": "header",
                "name": "X-API-Key",
                "description": "API key for external clients"
            },
            "BearerAuth": {
                "type": "apiKey",
                "in": "header",
                "name": "Authorization",
                "description": "JWT token (Bearer <token>)"
            }
        },
        "tags": [
            {"name": "Health", "description": "Health check endpoints"},
            {"name": "Tickets", "description": "Ticket management"},
            {"name": "Orders", "description": "Order management"},
            {"name": "Validation", "description": "Door entry validation"},
            {"name": "Resale", "description": "P2P ticket marketplace"},
            {"name": "Clients", "description": "API client management"},
            {"name": "Discounts", "description": "Promotional discount codes"},
            {"name": "Admin", "description": "Organizer administration and statistics"}
        ]
    }

    Swagger(app, config=swagger_config, template=swagger_template)
    
    # =========================================================================
    # REQUEST HOOKS
    # =========================================================================
    
    @app.before_request
    def before_request():
        """Run before each request."""
        # Generate unique request ID for tracing
        g.request_id = str(uuid.uuid4())[:8]
        
        # Store IP for audit logging
        g.ip_address = get_remote_address()
        
        # Hash user agent for fingerprinting
        import hashlib
        user_agent = request.headers.get('User-Agent', '')
        g.user_agent_hash = hashlib.sha256(user_agent.encode()).hexdigest()
    
    @app.after_request
    def after_request(response):
        """Run after each request - add security headers."""
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['X-Request-ID'] = g.get('request_id', 'unknown')

        # HSTS — vynutí HTTPS v produkci (nezapnout v developmentu)
        if app.config.get('PREFERRED_URL_SCHEME') == 'https':
            max_age = app.config.get('HSTS_MAX_AGE', 31536000)
            response.headers['Strict-Transport-Security'] = f'max-age={max_age}; includeSubDomains'

        # Remove server header (don't expose Flask version)
        response.headers.pop('Server', None)
        
        return response
    
    # =========================================================================
    # ERROR HANDLERS
    # =========================================================================
    
    @app.errorhandler(400)
    def bad_request(error):
        return {
            'error': 'Bad Request',
            'message': str(error.description) if hasattr(error, 'description') else 'Invalid request',
            'request_id': g.get('request_id')
        }, 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return {
            'error': 'Unauthorized',
            'message': 'Authentication required',
            'request_id': g.get('request_id')
        }, 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return {
            'error': 'Forbidden',
            'message': 'You do not have permission to access this resource',
            'request_id': g.get('request_id')
        }, 403
    
    @app.errorhandler(404)
    def not_found(error):
        return {
            'error': 'Not Found',
            'message': 'Resource not found',
            'request_id': g.get('request_id')
        }, 404
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return {
            'error': 'Too Many Requests',
            'message': 'Rate limit exceeded. Please slow down.',
            'request_id': g.get('request_id')
        }, 429
    
    @app.errorhandler(500)
    def internal_error(error):
        # Log the actual error (in production, send to monitoring)
        app.logger.error(f"Internal error: {error}", exc_info=True)
        return {
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'request_id': g.get('request_id')
        }, 500
    
    # =========================================================================
    # REGISTER BLUEPRINTS
    # =========================================================================
    
    from app.api.tickets import tickets_bp
    from app.api.orders import orders_bp
    from app.api.validate import validate_bp
    from app.api.resale import resale_bp
    from app.api.clients import clients_bp
    from app.api.discounts import discounts_bp
    from app.api.admin import admin_bp
    from app.api.payments import payments_bp

    app.register_blueprint(tickets_bp, url_prefix='/api/v1')
    app.register_blueprint(orders_bp, url_prefix='/api/v1')
    app.register_blueprint(validate_bp, url_prefix='/api/v1')
    app.register_blueprint(resale_bp, url_prefix='/api/v1')
    app.register_blueprint(clients_bp, url_prefix='/api/v1')
    app.register_blueprint(discounts_bp, url_prefix='/api/v1')
    app.register_blueprint(admin_bp, url_prefix='/api/v1')
    app.register_blueprint(payments_bp, url_prefix='/api/v1')
    
    # =========================================================================
    # HEALTH CHECK (no rate limit)
    # =========================================================================
    
    @app.route('/health')
    @limiter.exempt  # No rate limit on health checks
    def health():
        """
        Health check endpoint
        ---
        tags:
          - Health
        responses:
          200:
            description: Service is healthy
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: healthy
                service:
                  type: string
                  example: ticketing
                version:
                  type: string
                  example: 1.0.0
        """
        return {
            'status': 'healthy',
            'service': 'ticketing',
            'version': '1.0.0'
        }
    
    return app