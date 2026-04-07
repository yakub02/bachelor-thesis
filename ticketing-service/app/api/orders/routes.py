"""
Order endpoints.

Security:
- Database transactions with row-level locking prevent overselling
- Orders expire after 15 minutes if not confirmed
- All financial operations are logged
"""

import secrets
from datetime import datetime, timedelta

from flask import jsonify, request, g, current_app
from pydantic import ValidationError
from sqlalchemy import select

from app import db, limiter
from app.api.orders import orders_bp
from app.models import Order, OrderItem, TicketType, Ticket, AuditLog, DiscountCode, DiscountCodeUsage
from app.utils.auth import require_auth, require_user_id, get_current_user_id
from app.utils.security import generate_qr_secret, generate_order_reference
from app.utils.validators import OrderCreate


# =============================================================================
# CREATE ORDER (Reserve Tickets)
# =============================================================================

@orders_bp.route('/orders', methods=['POST'])
@limiter.limit("10 per minute")  # Strict limit on purchases
@require_auth
@require_user_id
def create_order():
    """
    Create a new order and reserve tickets
    ---
    tags:
      - Orders
    description: |
      Initiates the purchase flow:
      1. Validate ticket availability
      2. Reserve tickets (decrement available count)
      3. Create pending order with 15-minute expiration

      The order must be confirmed via /orders/{id}/confirm after payment.
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
            - event_id
            - items
          properties:
            event_id:
              type: string
              format: uuid
            items:
              type: array
              items:
                type: object
                required:
                  - ticket_type_id
                  - quantity
                properties:
                  ticket_type_id:
                    type: string
                    format: uuid
                  quantity:
                    type: integer
                    minimum: 1
            discount_code:
              type: string
              description: Optional promotional discount code
    responses:
      201:
        description: Order created
        schema:
          type: object
          properties:
            order:
              $ref: '#/definitions/Order'
            expires_in_seconds:
              type: integer
            message:
              type: string
      400:
        description: Validation error or tickets unavailable
      404:
        description: Ticket type not found
    """
    user_id = get_current_user_id()
    
    # Validate input
    try:
        data = OrderCreate(**request.get_json(), user_id=user_id)
    except ValidationError as e:
        return jsonify({
            'error': 'Validation Error',
            'details': e.errors()
        }), 400
    
    # Start transaction
    try:
        subtotal_cents = 0
        order_items_data = []
        discount_code_obj = None
        discount_cents = 0

        for item in data.items:
            # Lock row to prevent race conditions (overselling)
            ticket_type = db.session.execute(
                select(TicketType)
                .where(TicketType.id == item.ticket_type_id)
                .with_for_update()  # ROW-LEVEL LOCK!
            ).scalar_one_or_none()
            
            if not ticket_type:
                db.session.rollback()
                return jsonify({
                    'error': 'Not Found',
                    'message': f'Ticket type not found: {item.ticket_type_id}'
                }), 404
            
            # Check event matches
            if str(ticket_type.event_id) != str(data.event_id):
                db.session.rollback()
                return jsonify({
                    'error': 'Bad Request',
                    'message': f'Ticket type {ticket_type.name} does not belong to this event'
                }), 400
            
            # Check if on sale
            if not ticket_type.is_on_sale:
                db.session.rollback()
                return jsonify({
                    'error': 'Bad Request',
                    'message': f'Ticket type {ticket_type.name} is not currently on sale'
                }), 400
            
            # Check availability
            if ticket_type.quantity_available < item.quantity:
                db.session.rollback()
                return jsonify({
                    'error': 'Bad Request',
                    'message': f'Only {ticket_type.quantity_available} tickets available for {ticket_type.name}'
                }), 400
            
            # Check max per order
            if item.quantity > ticket_type.max_per_order:
                db.session.rollback()
                return jsonify({
                    'error': 'Bad Request',
                    'message': f'Maximum {ticket_type.max_per_order} tickets per order for {ticket_type.name}'
                }), 400
            
            # Reserve tickets
            ticket_type.quantity_reserved += item.quantity
            
            # Calculate price
            item_total = ticket_type.price_cents * item.quantity
            subtotal_cents += item_total

            order_items_data.append({
                'ticket_type': ticket_type,
                'quantity': item.quantity,
                'unit_price_cents': ticket_type.price_cents
            })

        # Handle discount code if provided
        if data.discount_code:
            discount_code_obj = DiscountCode.query.filter_by(code=data.discount_code).first()

            if not discount_code_obj:
                db.session.rollback()
                return jsonify({
                    'error': 'Bad Request',
                    'message': f'Invalid discount code: {data.discount_code}'
                }), 400

            if not discount_code_obj.is_valid:
                db.session.rollback()
                return jsonify({
                    'error': 'Bad Request',
                    'message': 'Discount code is expired or inactive'
                }), 400

            if not discount_code_obj.can_use_for_event(str(data.event_id)):
                db.session.rollback()
                return jsonify({
                    'error': 'Bad Request',
                    'message': 'Discount code is not valid for this event'
                }), 400

            if not discount_code_obj.can_user_use(user_id):
                db.session.rollback()
                return jsonify({
                    'error': 'Bad Request',
                    'message': 'You have already used this code the maximum number of times'
                }), 400

            if subtotal_cents < discount_code_obj.min_order_cents:
                db.session.rollback()
                return jsonify({
                    'error': 'Bad Request',
                    'message': f'Minimum order of {discount_code_obj.min_order_cents / 100:.2f} {discount_code_obj.currency} required for this code'
                }), 400

            # Calculate discount
            discount_cents = discount_code_obj.calculate_discount(subtotal_cents)

        # Calculate final total
        total_cents = max(0, subtotal_cents - discount_cents)

        # Create order
        expiration_minutes = current_app.config.get('ORDER_EXPIRATION_MINUTES', 15)

        order = Order(
            reference=generate_order_reference(),
            user_id=user_id,
            event_id=data.event_id,
            subtotal_cents=subtotal_cents,
            discount_cents=discount_cents,
            discount_code_id=discount_code_obj.id if discount_code_obj else None,
            total_cents=total_cents,
            currency='CZK',  # TODO: Make configurable
            expires_at=datetime.utcnow() + timedelta(minutes=expiration_minutes),
            ip_address=g.get('ip_address'),
            user_agent_hash=g.get('user_agent_hash'),
            api_client_id=g.get('api_client').id if g.get('api_client') else None
        )
        db.session.add(order)
        db.session.flush()  # Get order ID
        
        # Create order items
        for item_data in order_items_data:
            order_item = OrderItem(
                order_id=order.id,
                ticket_type_id=item_data['ticket_type'].id,
                quantity=item_data['quantity'],
                unit_price_cents=item_data['unit_price_cents']
            )
            db.session.add(order_item)
        
        # Audit log
        audit = AuditLog(
            action='order.create',
            entity_type='order',
            entity_id=order.id,
            user_id=user_id,
            ip_address=g.get('ip_address'),
            user_agent_hash=g.get('user_agent_hash'),
            new_values={
                'reference': order.reference,
                'subtotal_cents': subtotal_cents,
                'discount_cents': discount_cents,
                'total_cents': total_cents,
                'items_count': len(order_items_data),
                'discount_code': data.discount_code if data.discount_code else None
            }
        )
        db.session.add(audit)

        db.session.commit()

        response_data = {
            'order': order.to_dict(include_items=True),
            'expires_in_seconds': expiration_minutes * 60,
            'message': f'Order created. Complete payment within {expiration_minutes} minutes.'
        }

        # Add discount info to response
        if discount_code_obj:
            response_data['discount'] = {
                'code': discount_code_obj.code,
                'type': discount_code_obj.discount_type,
                'value': discount_code_obj.discount_value,
                'amount_cents': discount_cents
            }

        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Order creation failed: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal Error',
            'message': 'Failed to create order. Please try again.'
        }), 500


# =============================================================================
# GET ORDER
# =============================================================================

@orders_bp.route('/orders/<order_id>', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
@require_user_id
def get_order(order_id):
    """
    Get order details
    ---
    tags:
      - Orders
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: order_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: Order details
        schema:
          $ref: '#/definitions/Order'
      403:
        description: Not your order
      404:
        description: Order not found
    """
    user_id = get_current_user_id()
    
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Not Found', 'message': 'Order not found'}), 404
    
    # Verify ownership
    if str(order.user_id) != user_id:
        return jsonify({'error': 'Forbidden', 'message': 'Not your order'}), 403
    
    return jsonify(order.to_dict(include_items=True))


# =============================================================================
# CONFIRM ORDER (After Payment)
# =============================================================================

@orders_bp.route('/orders/<order_id>/confirm', methods=['POST'])
@limiter.limit("10 per minute")
@require_auth
@require_user_id
def confirm_order(order_id):
    """
    Confirm order after payment
    ---
    tags:
      - Orders
    description: |
      Validates order is still pending and not expired, creates ticket records,
      moves quantity from reserved to sold, and marks order as confirmed.
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: order_id
        in: path
        type: string
        format: uuid
        required: true
      - name: body
        in: body
        required: false
        schema:
          type: object
          properties:
            payment_method:
              type: string
              example: card
            payment_reference:
              type: string
              example: txn_123456
    responses:
      200:
        description: Order confirmed
        schema:
          type: object
          properties:
            message:
              type: string
            order:
              $ref: '#/definitions/Order'
            tickets:
              type: array
              items:
                $ref: '#/definitions/Ticket'
      400:
        description: Order expired or invalid status
      403:
        description: Not your order
      404:
        description: Order not found
    """
    user_id = get_current_user_id()
    data = request.get_json() or {}
    
    try:
        # Lock order row
        order = db.session.execute(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        ).scalar_one_or_none()
        
        if not order:
            return jsonify({'error': 'Not Found', 'message': 'Order not found'}), 404
        
        # Verify ownership
        if str(order.user_id) != user_id:
            db.session.rollback()
            return jsonify({'error': 'Forbidden', 'message': 'Not your order'}), 403
        
        # Check status
        if order.status != 'pending':
            db.session.rollback()
            return jsonify({
                'error': 'Bad Request',
                'message': f'Order cannot be confirmed (status: {order.status})'
            }), 400
        
        # Check expiration
        if order.is_expired:
            order.status = 'expired'
            
            # Release reserved tickets
            for item in order.items:
                ticket_type = db.session.execute(
                    select(TicketType)
                    .where(TicketType.id == item.ticket_type_id)
                    .with_for_update()
                ).scalar_one()
                ticket_type.quantity_reserved -= item.quantity
            
            db.session.commit()
            
            return jsonify({
                'error': 'Bad Request',
                'message': 'Order has expired. Please create a new order.'
            }), 400
        
        # Update order
        order.status = 'confirmed'
        order.confirmed_at = datetime.utcnow()
        order.payment_method = data.get('payment_method')
        order.payment_reference = data.get('payment_reference')
        
        # Create tickets
        tickets_created = []
        
        for item in order.items:
            # Update ticket type counts
            ticket_type = db.session.execute(
                select(TicketType)
                .where(TicketType.id == item.ticket_type_id)
                .with_for_update()
            ).scalar_one()
            
            ticket_type.quantity_reserved -= item.quantity
            ticket_type.quantity_sold += item.quantity
            
            # Create individual tickets
            for _ in range(item.quantity):
                ticket = Ticket(
                    ticket_type_id=ticket_type.id,
                    order_id=order.id,
                    owner_id=user_id,
                    original_owner_id=user_id,
                    qr_secret=generate_qr_secret(),
                    status='valid'
                )
                db.session.add(ticket)
                tickets_created.append(ticket)
        
        # Record discount code usage if applicable
        if order.discount_code_id and order.discount_cents > 0:
            discount_code = DiscountCode.query.get(order.discount_code_id)
            if discount_code:
                # Increment usage counter
                discount_code.current_uses += 1

                # Record individual usage
                usage = DiscountCodeUsage(
                    discount_code_id=order.discount_code_id,
                    order_id=order.id,
                    user_id=user_id,
                    discount_amount_cents=order.discount_cents
                )
                db.session.add(usage)

        # Audit log
        audit = AuditLog(
            action='order.confirm',
            entity_type='order',
            entity_id=order.id,
            user_id=user_id,
            ip_address=g.get('ip_address'),
            user_agent_hash=g.get('user_agent_hash'),
            old_values={'status': 'pending'},
            new_values={
                'status': 'confirmed',
                'tickets_created': len(tickets_created),
                'discount_applied_cents': order.discount_cents
            }
        )
        db.session.add(audit)

        db.session.commit()

        return jsonify({
            'message': 'Order confirmed successfully',
            'order': order.to_dict(),
            'tickets': [t.to_dict() for t in tickets_created]
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Order confirmation failed: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal Error',
            'message': 'Failed to confirm order. Please contact support.'
        }), 500


# =============================================================================
# CANCEL ORDER
# =============================================================================

@orders_bp.route('/orders/<order_id>/cancel', methods=['POST'])
@limiter.limit("10 per minute")
@require_auth
@require_user_id
def cancel_order(order_id):
    """
    Cancel a pending order
    ---
    tags:
      - Orders
    description: Cancels order and releases reserved tickets. Only pending orders can be cancelled.
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: order_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: Order cancelled
        schema:
          type: object
          properties:
            message:
              type: string
            order:
              $ref: '#/definitions/Order'
      400:
        description: Only pending orders can be cancelled
      403:
        description: Not your order
      404:
        description: Order not found
    """
    user_id = get_current_user_id()
    
    try:
        order = db.session.execute(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        ).scalar_one_or_none()
        
        if not order:
            return jsonify({'error': 'Not Found', 'message': 'Order not found'}), 404
        
        # Verify ownership
        if str(order.user_id) != user_id:
            db.session.rollback()
            return jsonify({'error': 'Forbidden', 'message': 'Not your order'}), 403
        
        # Check status
        if order.status != 'pending':
            db.session.rollback()
            return jsonify({
                'error': 'Bad Request',
                'message': f'Only pending orders can be cancelled (status: {order.status})'
            }), 400
        
        # Release reserved tickets
        for item in order.items:
            ticket_type = db.session.execute(
                select(TicketType)
                .where(TicketType.id == item.ticket_type_id)
                .with_for_update()
            ).scalar_one()
            ticket_type.quantity_reserved -= item.quantity
        
        order.status = 'cancelled'
        order.cancelled_at = datetime.utcnow()
        
        # Audit log
        audit = AuditLog(
            action='order.cancel',
            entity_type='order',
            entity_id=order.id,
            user_id=user_id,
            ip_address=g.get('ip_address'),
            user_agent_hash=g.get('user_agent_hash'),
            old_values={'status': 'pending'},
            new_values={'status': 'cancelled'}
        )
        db.session.add(audit)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Order cancelled successfully',
            'order': order.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Order cancellation failed: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal Error',
            'message': 'Failed to cancel order'
        }), 500


# =============================================================================
# GET MY ORDERS
# =============================================================================

@orders_bp.route('/orders', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
@require_user_id
def get_my_orders():
    """
    List orders for current user
    ---
    tags:
      - Orders
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: status
        in: query
        type: string
        enum: [pending, confirmed, cancelled, refunded, expired]
        required: false
      - name: limit
        in: query
        type: integer
        default: 20
        maximum: 100
        required: false
    responses:
      200:
        description: List of orders
        schema:
          type: object
          properties:
            orders:
              type: array
              items:
                $ref: '#/definitions/Order'
            count:
              type: integer
    """
    user_id = get_current_user_id()
    
    query = Order.query.filter_by(user_id=user_id)
    
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)
    
    limit = min(int(request.args.get('limit', 20)), 100)
    
    orders = query.order_by(Order.created_at.desc()).limit(limit).all()
    
    return jsonify({
        'orders': [o.to_dict() for o in orders],
        'count': len(orders)
    })