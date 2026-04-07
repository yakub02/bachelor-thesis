"""
Authentication routes.
Handles user registration, login, logout, and token refresh.
"""

from datetime import datetime, timedelta
import os

from flask import request, jsonify, g, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from pydantic import ValidationError

from app import db, limiter
from app.api.auth import auth_bp
from app.models.user import User, UserPreferences
from app.utils.security import hash_password, verify_password, generate_verification_token, generate_reset_token
from app.utils.validators import UserRegister, UserLogin, ForgotPassword, ResetPassword


@auth_bp.route('/register', methods=['POST'])
@limiter.limit('5/minute')
def register():
    """
    Register a new user.
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - email
            - username
            - password
          properties:
            email:
              type: string
            username:
              type: string
            password:
              type: string
            display_name:
              type: string
    responses:
      201:
        description: User created successfully
      400:
        description: Validation error
      409:
        description: Email or username already exists
    """
    try:
        data = UserRegister(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    # Check if email exists
    if User.query.filter_by(email=data.email).first():
        return jsonify({'error': 'Email already registered'}), 409

    # Check if username exists
    if User.query.filter_by(username=data.username).first():
        return jsonify({'error': 'Username already taken'}), 409

    # Create user
    user = User(
        email=data.email,
        username=data.username,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        verification_token=generate_verification_token(),
    )

    db.session.add(user)
    db.session.flush()  # Get the user.id before creating preferences

    # Create default preferences
    preferences = UserPreferences(user_id=user.id)
    db.session.add(preferences)

    db.session.commit()

    # Generate tokens
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'message': 'User created successfully',
        'user': user.to_dict(include_private=True),
        'access_token': access_token,
        'refresh_token': refresh_token,
    }), 201


@auth_bp.route('/login', methods=['POST'])
@limiter.limit('10/minute')
def login():
    """
    Login user.
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
            password:
              type: string
    responses:
      200:
        description: Login successful
      401:
        description: Invalid credentials
    """
    try:
        data = UserLogin(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    user = User.query.filter_by(email=data.email).first()

    if not user or not verify_password(data.password, user.password_hash):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 401

    # Update last login
    user.last_login_at = datetime.utcnow()
    db.session.commit()

    # Generate tokens
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(include_private=True),
        'access_token': access_token,
        'refresh_token': refresh_token,
    })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Refresh access token.
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Token refreshed
    """
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)

    return jsonify({
        'access_token': access_token,
    })


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout user (client should discard tokens).
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Logout successful
    """
    # In a production system, you might want to blacklist the token
    return jsonify({'message': 'Logout successful'})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """
    Get current user info.
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Current user info
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'user': user.to_dict(include_private=True),
        'preferences': user.preferences.to_dict() if user.preferences else None,
    })


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit('3/minute')
def forgot_password():
    """
    Request password reset email.
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - email
          properties:
            email:
              type: string
    responses:
      200:
        description: Reset email sent (always returns success for security)
    """
    try:
        data = ForgotPassword(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    # Find user by email
    user = User.query.filter_by(email=data.email).first()

    if user and user.is_active:
        # Generate reset token
        token = generate_reset_token()
        expiry_hours = current_app.config.get('PASSWORD_RESET_EXPIRY_HOURS', 24)

        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=expiry_hours)
        db.session.commit()

        # Build reset URL
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password?token={token}"

        # Send email
        try:
            from app.services.email import email_service
            email_service.send_password_reset(
                email=user.email,
                username=user.display_name or user.username,
                reset_url=reset_url,
                expiry_hours=expiry_hours,
            )
        except Exception as e:
            current_app.logger.error(f"Failed to send password reset email: {e}")

    # Always return success to prevent email enumeration
    return jsonify({
        'message': 'If an account with that email exists, a password reset link has been sent.'
    })


@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit('5/minute')
def reset_password():
    """
    Reset password using token.
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - token
            - new_password
          properties:
            token:
              type: string
            new_password:
              type: string
    responses:
      200:
        description: Password reset successful
      400:
        description: Invalid or expired token
    """
    try:
        data = ResetPassword(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    # Find user by reset token
    user = User.query.filter_by(reset_token=data.token).first()

    if not user:
        return jsonify({'error': 'Invalid or expired reset token'}), 400

    # Check token expiry
    if not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        # Clear expired token
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        return jsonify({'error': 'Reset token has expired'}), 400

    # Update password
    user.password_hash = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()

    return jsonify({
        'message': 'Password has been reset successfully. You can now login with your new password.'
    })


@auth_bp.route('/verify-reset-token', methods=['POST'])
@limiter.limit('10/minute')
def verify_reset_token():
    """
    Verify if a reset token is valid.
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - token
          properties:
            token:
              type: string
    responses:
      200:
        description: Token validity status
    """
    data = request.get_json()
    token = data.get('token') if data else None

    if not token:
        return jsonify({'valid': False, 'error': 'Token is required'}), 400

    user = User.query.filter_by(reset_token=token).first()

    if not user:
        return jsonify({'valid': False, 'error': 'Invalid token'})

    if not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        return jsonify({'valid': False, 'error': 'Token has expired'})

    return jsonify({'valid': True})
