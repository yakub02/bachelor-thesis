"""
API Client management endpoints.

For registering external clients (like PSYCHOSOUND).
"""

from flask import jsonify, request, g
from pydantic import ValidationError

from app import db, limiter
from app.api.clients import clients_bp
from app.models import ApiClient
from app.utils.auth import require_jwt  # Admin only
from app.utils.security import generate_api_key
from app.utils.validators import ApiClientCreate


@clients_bp.route('/clients', methods=['POST'])
@limiter.limit("5 per minute")
@require_jwt  # Only authenticated admins
def register_client():
    """
    Register new API client
    ---
    tags:
      - Clients
    description: Returns the raw API key ONCE - it cannot be retrieved again
    security:
      - BearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
              example: PSYCHOSOUND
            allowed_events:
              type: array
              items:
                type: string
                format: uuid
              description: List of event UUIDs (null = all events)
            rate_limit_per_minute:
              type: integer
              default: 60
              minimum: 1
              maximum: 1000
    responses:
      201:
        description: Client created
        schema:
          type: object
          properties:
            client:
              $ref: '#/definitions/ApiClient'
            api_key:
              type: string
              description: Save this - cannot be retrieved again
            warning:
              type: string
      400:
        description: Validation error
    """
    try:
        data = ApiClientCreate(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation Error', 'details': e.errors()}), 400
    
    # Generate API key
    raw_key, hashed_key = generate_api_key()
    
    client = ApiClient(
        name=data.name,
        api_key_hash=hashed_key,
        allowed_events=data.allowed_events,
        rate_limit_per_minute=data.rate_limit_per_minute
    )
    
    db.session.add(client)
    db.session.commit()
    
    return jsonify({
        'client': client.to_dict(),
        'api_key': raw_key,
        'warning': 'Save this API key now - it cannot be retrieved again!'
    }), 201


@clients_bp.route('/clients/me', methods=['GET'])
@limiter.limit("30 per minute")
def get_current_client():
    """
    Get current API client info
    ---
    tags:
      - Clients
    description: Returns info about the API client making the request
    security:
      - ApiKeyAuth: []
    responses:
      200:
        description: Client info
        schema:
          $ref: '#/definitions/ApiClient'
      401:
        description: API key required or invalid
    """
    from app.utils.auth import require_api_key
    
    api_key = request.headers.get('X-API-Key')
    if not api_key:
        return jsonify({'error': 'Unauthorized', 'message': 'API key required'}), 401
    
    from app.utils.auth import _validate_api_key
    client = _validate_api_key(api_key)
    
    if not client:
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid API key'}), 401
    
    return jsonify(client.to_dict())