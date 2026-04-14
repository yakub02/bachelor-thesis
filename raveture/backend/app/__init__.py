"""
RAVETURE Backend Application Factory.

Main platform backend handling:
- User authentication and profiles
- Event management
- Forum discussions
- Media library
- Historical archive
"""

import os
import uuid
import uuid7
import hashlib
from datetime import datetime

from flask import Flask, jsonify, request, g
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flasgger import Swagger

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address)


def create_app(config_name: str = 'default') -> Flask:
    """
    Application factory for RAVETURE Backend.

    Args:
        config_name: Configuration to use (development, production, testing)

    Returns:
        Configured Flask application
    """
    app = Flask(__name__)

    # Load configuration
    from app.config import config
    app.config.from_object(config.get(config_name, config['default']))

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # CORS configuration
    cors_origins = app.config.get('CORS_ORIGINS', '*')
    if isinstance(cors_origins, str):
        cors_origins = [o.strip() for o in cors_origins.split(',')]
    CORS(app,
         origins=cors_origins,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

    # Rate limiting
    limiter.init_app(app)

    # Swagger documentation
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

    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "RAVETURE API",
            "description": "Backend API for RAVETURE Platform",
            "version": "1.0.0",
            "contact": {
                "name": "RAVETURE Team"
            }
        },
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "JWT token: Bearer <token>"
            }
        },
        "security": [{"Bearer": []}]
    }

    Swagger(app, config=swagger_config, template=swagger_template)

    # Request hooks
    @app.before_request
    def before_request():
        """Set up request context."""
        g.request_id = str(uuid7.uuid7())[:8]
        g.request_start = datetime.utcnow()
        g.ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if g.ip_address and ',' in g.ip_address:
            g.ip_address = g.ip_address.split(',')[0].strip()

        # Hash user agent for privacy
        user_agent = request.headers.get('User-Agent', '')
        g.user_agent_hash = hashlib.sha256(user_agent.encode()).hexdigest()[:16]

    @app.after_request
    def after_request(response):
        """Add security headers and request tracking."""
        response.headers['X-Request-ID'] = g.get('request_id', 'unknown')
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'

        # CORS headers (manual fallback)
        origin = request.headers.get('Origin')
        allowed_origins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'

        # Remove server header
        response.headers.pop('Server', None)

        return response

    # Error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': str(error.description) if hasattr(error, 'description') else 'Invalid request',
            'request_id': g.get('request_id')
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication required',
            'request_id': g.get('request_id')
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'error': 'Forbidden',
            'message': 'Access denied',
            'request_id': g.get('request_id')
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': 'Resource not found',
            'request_id': g.get('request_id')
        }), 404

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            'error': 'Too Many Requests',
            'message': 'Rate limit exceeded. Please slow down.',
            'request_id': g.get('request_id')
        }), 429

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'request_id': g.get('request_id')
        }), 500

    # Register blueprints
    from app.api.auth import auth_bp
    from app.api.users import users_bp
    from app.api.events import events_bp
    from app.api.forum import forum_bp
    from app.api.media import media_bp
    from app.api.archive import archive_bp
    from app.api.uploads import uploads_bp
    from app.api.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(users_bp, url_prefix='/api/v1/users')
    app.register_blueprint(events_bp, url_prefix='/api/v1')
    app.register_blueprint(forum_bp, url_prefix='/api/v1/forum')
    app.register_blueprint(media_bp, url_prefix='/api/v1/media')
    app.register_blueprint(archive_bp, url_prefix='/api/v1/archive')
    app.register_blueprint(uploads_bp, url_prefix='/api/v1')
    app.register_blueprint(admin_bp, url_prefix='/api/v1/admin')

    # Serve uploaded files
    from flask import send_from_directory

    @app.route('/uploads/<path:filename>')
    @limiter.exempt
    def serve_upload(filename):
        """Serve uploaded files."""
        upload_folder = app.config.get('UPLOAD_FOLDER', 'uploads')
        if not os.path.isabs(upload_folder):
            upload_folder = os.path.join(app.root_path, '..', upload_folder)
        return send_from_directory(upload_folder, filename)

    # Health check
    @app.route('/health')
    @limiter.exempt
    def health_check():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'service': 'raveture-backend',
            'timestamp': datetime.utcnow().isoformat()
        })

    return app
