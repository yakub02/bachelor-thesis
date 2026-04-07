"""
Discount code endpoints.

Security:
- Admin endpoints require authentication
- Code validation is case-insensitive
- Usage tracking for analytics and limits
"""

from datetime import datetime

from flask import jsonify, request, g, current_app
from pydantic import ValidationError
from sqlalchemy import select

from app import db, limiter
from app.api.discounts import discounts_bp
from app.models import DiscountCode, DiscountCodeUsage, AuditLog
from app.utils.auth import require_auth, require_user_id, get_current_user_id
from app.utils.validators import DiscountCodeCreate, DiscountCodeValidate, DiscountCodeUpdate


# =============================================================================
# CREATE DISCOUNT CODE (Admin/Organizer)
# =============================================================================

@discounts_bp.route('/admin/discount-codes', methods=['POST'])
@limiter.limit("20 per minute")
@require_auth
def create_discount_code():
    """
    Create a new discount code
    ---
    tags:
      - Discounts
    description: |
      Creates a promotional discount code. Supports:
      - Percentage discounts (e.g., 20% off)
      - Fixed amount discounts (e.g., 100 CZK off)
      - Event-specific or global codes
      - Usage limits (total and per-user)
      - Time-based validity
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - code
            - discount_type
            - discount_value
          properties:
            code:
              type: string
              example: FRIENDS20
              description: Unique code (case-insensitive, stored uppercase)
            event_id:
              type: string
              format: uuid
              description: Restrict to specific event (null = all events)
            discount_type:
              type: string
              enum: [percentage, fixed]
            discount_value:
              type: integer
              description: Percentage (1-100) or fixed amount in cents
            min_order_cents:
              type: integer
              default: 0
              description: Minimum order total for code to apply
            max_uses:
              type: integer
              description: Maximum total uses (null = unlimited)
            max_uses_per_user:
              type: integer
              default: 1
              description: Max uses per user (null = unlimited)
            valid_from:
              type: string
              format: date-time
            valid_until:
              type: string
              format: date-time
            description:
              type: string
              description: Internal note (e.g., "Friends & Family")
    responses:
      201:
        description: Discount code created
      400:
        description: Validation error or code already exists
    """
    try:
        data = DiscountCodeCreate(**request.get_json())
    except ValidationError as e:
        return jsonify({
            'error': 'Validation Error',
            'details': e.errors()
        }), 400

    # Check if code already exists
    existing = DiscountCode.query.filter_by(code=data.code).first()
    if existing:
        return jsonify({
            'error': 'Bad Request',
            'message': f'Discount code "{data.code}" already exists'
        }), 400

    # Validate percentage is <= 100
    if data.discount_type == 'percentage' and data.discount_value > 100:
        return jsonify({
            'error': 'Bad Request',
            'message': 'Percentage discount cannot exceed 100%'
        }), 400

    discount_code = DiscountCode(
        code=data.code,  # Already uppercase from validator
        event_id=data.event_id,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        currency=data.currency,
        min_order_cents=data.min_order_cents,
        max_uses=data.max_uses,
        max_uses_per_user=data.max_uses_per_user,
        valid_from=data.valid_from,
        valid_until=data.valid_until,
        description=data.description,
        created_by=get_current_user_id() if hasattr(g, 'user_id') else None
    )

    db.session.add(discount_code)
    db.session.flush()  # Get the ID before creating audit log

    # Audit log
    audit = AuditLog(
        action='discount_code.create',
        entity_type='discount_code',
        entity_id=discount_code.id,
        user_id=get_current_user_id() if hasattr(g, 'user_id') else None,
        ip_address=g.get('ip_address'),
        user_agent_hash=g.get('user_agent_hash'),
        new_values={
            'code': discount_code.code,
            'discount_type': discount_code.discount_type,
            'discount_value': discount_code.discount_value
        }
    )
    db.session.add(audit)

    db.session.commit()

    return jsonify({
        'discount_code': discount_code.to_dict(include_internal=True),
        'message': 'Discount code created successfully'
    }), 201


# =============================================================================
# LIST DISCOUNT CODES (Admin/Organizer)
# =============================================================================

@discounts_bp.route('/admin/discount-codes', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
def list_discount_codes():
    """
    List all discount codes
    ---
    tags:
      - Discounts
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: event_id
        in: query
        type: string
        format: uuid
        required: false
        description: Filter by event
      - name: active_only
        in: query
        type: boolean
        default: false
        description: Only return active codes
    responses:
      200:
        description: List of discount codes
    """
    query = DiscountCode.query

    # Filter by event
    event_id = request.args.get('event_id')
    if event_id:
        query = query.filter(
            (DiscountCode.event_id == event_id) | (DiscountCode.event_id.is_(None))
        )

    # Filter active only
    if request.args.get('active_only', '').lower() == 'true':
        query = query.filter_by(is_active=True)

    codes = query.order_by(DiscountCode.created_at.desc()).all()

    return jsonify({
        'discount_codes': [c.to_dict(include_internal=True) for c in codes],
        'count': len(codes)
    })


# =============================================================================
# GET SINGLE DISCOUNT CODE (Admin)
# =============================================================================

@discounts_bp.route('/admin/discount-codes/<code_id>', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
def get_discount_code(code_id):
    """
    Get discount code details
    ---
    tags:
      - Discounts
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: code_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: Discount code details with usage stats
      404:
        description: Code not found
    """
    discount_code = DiscountCode.query.get(code_id)

    if not discount_code:
        return jsonify({'error': 'Not Found', 'message': 'Discount code not found'}), 404

    data = discount_code.to_dict(include_internal=True)

    # Add usage statistics
    data['usage_stats'] = {
        'total_uses': discount_code.current_uses,
        'total_discount_given_cents': db.session.query(
            db.func.sum(DiscountCodeUsage.discount_amount_cents)
        ).filter_by(discount_code_id=discount_code.id).scalar() or 0
    }

    return jsonify(data)


# =============================================================================
# UPDATE DISCOUNT CODE (Admin)
# =============================================================================

@discounts_bp.route('/admin/discount-codes/<code_id>', methods=['PUT'])
@limiter.limit("20 per minute")
@require_auth
def update_discount_code(code_id):
    """
    Update a discount code
    ---
    tags:
      - Discounts
    description: Only certain fields can be updated after creation.
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: code_id
        in: path
        type: string
        format: uuid
        required: true
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            is_active:
              type: boolean
            max_uses:
              type: integer
            valid_until:
              type: string
              format: date-time
            description:
              type: string
    responses:
      200:
        description: Discount code updated
      404:
        description: Code not found
    """
    discount_code = DiscountCode.query.get(code_id)

    if not discount_code:
        return jsonify({'error': 'Not Found', 'message': 'Discount code not found'}), 404

    try:
        data = DiscountCodeUpdate(**request.get_json())
    except ValidationError as e:
        return jsonify({
            'error': 'Validation Error',
            'details': e.errors()
        }), 400

    old_values = {}

    if data.is_active is not None:
        old_values['is_active'] = discount_code.is_active
        discount_code.is_active = data.is_active

    if data.max_uses is not None:
        old_values['max_uses'] = discount_code.max_uses
        discount_code.max_uses = data.max_uses

    if data.valid_until is not None:
        old_values['valid_until'] = discount_code.valid_until.isoformat() if discount_code.valid_until else None
        discount_code.valid_until = data.valid_until

    if data.description is not None:
        old_values['description'] = discount_code.description
        discount_code.description = data.description

    # Audit log
    if old_values:
        audit = AuditLog(
            action='discount_code.update',
            entity_type='discount_code',
            entity_id=discount_code.id,
            user_id=get_current_user_id() if hasattr(g, 'user_id') else None,
            ip_address=g.get('ip_address'),
            user_agent_hash=g.get('user_agent_hash'),
            old_values=old_values,
            new_values={k: getattr(discount_code, k) for k in old_values.keys()}
        )
        db.session.add(audit)

    db.session.commit()

    return jsonify({
        'discount_code': discount_code.to_dict(include_internal=True),
        'message': 'Discount code updated'
    })


# =============================================================================
# DELETE/DEACTIVATE DISCOUNT CODE (Admin)
# =============================================================================

@discounts_bp.route('/admin/discount-codes/<code_id>', methods=['DELETE'])
@limiter.limit("10 per minute")
@require_auth
def delete_discount_code(code_id):
    """
    Deactivate a discount code
    ---
    tags:
      - Discounts
    description: Deactivates code rather than deleting to preserve audit trail.
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: code_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: Discount code deactivated
      404:
        description: Code not found
    """
    discount_code = DiscountCode.query.get(code_id)

    if not discount_code:
        return jsonify({'error': 'Not Found', 'message': 'Discount code not found'}), 404

    discount_code.is_active = False

    # Audit log
    audit = AuditLog(
        action='discount_code.deactivate',
        entity_type='discount_code',
        entity_id=discount_code.id,
        user_id=get_current_user_id() if hasattr(g, 'user_id') else None,
        ip_address=g.get('ip_address'),
        user_agent_hash=g.get('user_agent_hash'),
        old_values={'is_active': True},
        new_values={'is_active': False}
    )
    db.session.add(audit)

    db.session.commit()

    return jsonify({
        'message': 'Discount code deactivated',
        'code': discount_code.code
    })


# =============================================================================
# VALIDATE DISCOUNT CODE (Public - for checkout)
# =============================================================================

@discounts_bp.route('/discount-codes/validate', methods=['POST'])
@limiter.limit("30 per minute")
@require_auth
@require_user_id
def validate_discount_code():
    """
    Validate and preview discount code
    ---
    tags:
      - Discounts
    description: |
      Check if a discount code is valid and calculate the discount amount.
      Does NOT apply the code - just validates and returns preview.
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - code
            - event_id
            - order_total_cents
          properties:
            code:
              type: string
              example: FRIENDS20
            event_id:
              type: string
              format: uuid
            order_total_cents:
              type: integer
              example: 100000
    responses:
      200:
        description: Code is valid
        schema:
          type: object
          properties:
            valid:
              type: boolean
            discount_code:
              type: object
            discount_amount_cents:
              type: integer
            final_total_cents:
              type: integer
      400:
        description: Code is invalid (with reason)
    """
    user_id = get_current_user_id()

    try:
        data = DiscountCodeValidate(**request.get_json())
    except ValidationError as e:
        return jsonify({
            'error': 'Validation Error',
            'details': e.errors()
        }), 400

    # Find code
    discount_code = DiscountCode.query.filter_by(code=data.code).first()

    if not discount_code:
        return jsonify({
            'valid': False,
            'error': 'Code not found',
            'message': 'This discount code does not exist'
        }), 400

    # Check if active and valid
    if not discount_code.is_valid:
        reasons = []
        if not discount_code.is_active:
            reasons.append('Code has been deactivated')
        now = datetime.utcnow()
        if discount_code.valid_from and now < discount_code.valid_from:
            reasons.append('Code is not yet active')
        if discount_code.valid_until and now > discount_code.valid_until:
            reasons.append('Code has expired')
        if discount_code.max_uses and discount_code.current_uses >= discount_code.max_uses:
            reasons.append('Code has reached maximum uses')

        return jsonify({
            'valid': False,
            'error': 'Code expired or inactive',
            'message': reasons[0] if reasons else 'Code is not valid'
        }), 400

    # Check event restriction
    if not discount_code.can_use_for_event(str(data.event_id)):
        return jsonify({
            'valid': False,
            'error': 'Wrong event',
            'message': 'This code is not valid for this event'
        }), 400

    # Check per-user limit
    if not discount_code.can_user_use(user_id):
        return jsonify({
            'valid': False,
            'error': 'Usage limit reached',
            'message': 'You have already used this code the maximum number of times'
        }), 400

    # Check minimum order
    if data.order_total_cents < discount_code.min_order_cents:
        return jsonify({
            'valid': False,
            'error': 'Minimum not met',
            'message': f'Minimum order of {discount_code.min_order_cents / 100:.2f} {discount_code.currency} required'
        }), 400

    # Calculate discount
    discount_amount = discount_code.calculate_discount(data.order_total_cents)
    final_total = max(0, data.order_total_cents - discount_amount)

    return jsonify({
        'valid': True,
        'discount_code': discount_code.to_dict(),
        'discount_amount_cents': discount_amount,
        'final_total_cents': final_total,
        'message': f'Code applied: {discount_code.discount_value}{"%" if discount_code.discount_type == "percentage" else " " + discount_code.currency} off'
    })
