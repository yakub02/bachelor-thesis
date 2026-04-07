"""
Payment routes for RAVETURE Ticketing Service.
Handles GoPay payment creation, webhooks, and status checking.
"""

from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db, limiter
from app.api.payments import payments_bp
from app.models.ticket import Order
from app.models.ticket import Ticket, TicketType
from app.services.gopay import gopay_client, PaymentItem, PaymentState


@payments_bp.route('/payments/create', methods=['POST'])
@jwt_required()
@limiter.limit('10/minute')
def create_payment():
    """
    Create a GoPay payment for an order.
    ---
    tags:
      - Payments
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - order_id
          properties:
            order_id:
              type: string
              description: Order ID to pay for
    responses:
      200:
        description: Payment created, redirect URL returned
        schema:
          type: object
          properties:
            payment_id:
              type: string
            gateway_url:
              type: string
              description: URL to redirect user to GoPay
      400:
        description: Invalid request or order state
      404:
        description: Order not found
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data or 'order_id' not in data:
        return jsonify({'error': 'order_id is required'}), 400

    order_id = data['order_id']

    # Get order
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404

    # Verify ownership
    if str(order.user_id) != user_id:
        return jsonify({'error': 'Not authorized'}), 403

    # Check order status
    if order.status != 'pending':
        return jsonify({
            'error': f'Cannot pay for order with status: {order.status}'
        }), 400

    # Check if order has expired
    from datetime import datetime
    if order.expires_at and order.expires_at < datetime.utcnow():
        order.status = 'expired'
        db.session.commit()
        return jsonify({'error': 'Order has expired'}), 400

    # Build payment items from order
    items = []
    for item in order.items:
        ticket_type = TicketType.query.get(item.ticket_type_id)
        items.append(PaymentItem(
            name=f"{ticket_type.name if ticket_type else 'Ticket'} x{item.quantity}",
            amount=item.unit_price_cents * item.quantity,
            count=1,
        ))

    # Get user email for receipt
    payer_email = data.get('email')

    # Create GoPay payment
    result = gopay_client.create_payment(
        order_number=str(order.id),
        amount=order.total_cents,
        currency=order.currency,
        description=f"RAVETURE Order {str(order.id)[:8]}",
        items=items,
        payer_email=payer_email,
    )

    if not result.success:
        current_app.logger.error(f"GoPay payment creation failed: {result.error}")
        return jsonify({
            'error': 'Payment creation failed',
            'message': result.error,
        }), 500

    # Store payment ID on order
    order.payment_id = result.payment_id
    order.payment_gateway = 'gopay'
    db.session.commit()

    return jsonify({
        'payment_id': result.payment_id,
        'gateway_url': result.gateway_url,
        'message': 'Redirect user to gateway_url to complete payment',
    })


@payments_bp.route('/payments/webhook', methods=['POST'])
@limiter.exempt  # Don't rate limit webhooks
def payment_webhook():
    """
    GoPay webhook callback.
    ---
    tags:
      - Payments
    description: |
      Called by GoPay when payment status changes.
      Verifies signature and updates order status.
    responses:
      200:
        description: Webhook processed
      400:
        description: Invalid webhook data
    """
    # GoPay sends payment ID in body or query
    payment_id = request.args.get('id') or request.json.get('id')

    if not payment_id:
        current_app.logger.warning("Webhook received without payment ID")
        return jsonify({'error': 'Missing payment ID'}), 400

    current_app.logger.info(f"Processing webhook for payment: {payment_id}")

    # Get payment status from GoPay
    result = gopay_client.get_payment_status(payment_id)

    if not result.success:
        current_app.logger.error(f"Failed to get payment status: {result.error}")
        return jsonify({'error': 'Failed to verify payment'}), 500

    # Find order by payment ID
    order = Order.query.filter_by(payment_id=payment_id).first()

    if not order:
        current_app.logger.warning(f"Order not found for payment: {payment_id}")
        return jsonify({'error': 'Order not found'}), 404

    # Handle payment state
    state = result.state

    if state == PaymentState.PAID.value:
        # Payment successful
        if order.status != 'confirmed':
            _confirm_order(order)
            current_app.logger.info(f"Order {order.id} confirmed via webhook")

    elif state == PaymentState.CANCELED.value:
        # Payment cancelled
        if order.status == 'pending':
            order.status = 'cancelled'
            db.session.commit()
            current_app.logger.info(f"Order {order.id} cancelled via webhook")

    elif state == PaymentState.TIMEOUTED.value:
        # Payment timed out
        if order.status == 'pending':
            order.status = 'expired'
            db.session.commit()
            current_app.logger.info(f"Order {order.id} expired via webhook")

    elif state == PaymentState.REFUNDED.value:
        # Payment refunded
        order.status = 'refunded'
        # Mark tickets as refunded
        for ticket in Ticket.query.filter_by(order_id=order.id):
            ticket.status = 'refunded'
        db.session.commit()
        current_app.logger.info(f"Order {order.id} refunded via webhook")

    return jsonify({
        'status': 'processed',
        'payment_id': payment_id,
        'state': state,
    })


@payments_bp.route('/payments/status/<payment_id>', methods=['GET'])
@jwt_required()
@limiter.limit('30/minute')
def get_payment_status(payment_id: str):
    """
    Get payment status from GoPay.
    ---
    tags:
      - Payments
    security:
      - BearerAuth: []
    parameters:
      - name: payment_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Payment status
        schema:
          type: object
          properties:
            payment_id:
              type: string
            state:
              type: string
            order_id:
              type: string
            order_status:
              type: string
    """
    user_id = get_jwt_identity()

    # Find order by payment ID
    order = Order.query.filter_by(payment_id=payment_id).first()

    if not order:
        return jsonify({'error': 'Payment not found'}), 404

    # Verify ownership
    if str(order.user_id) != user_id:
        return jsonify({'error': 'Not authorized'}), 403

    # Get current status from GoPay
    result = gopay_client.get_payment_status(payment_id)

    if not result.success:
        return jsonify({
            'error': 'Failed to get payment status',
            'message': result.error,
        }), 500

    # If payment is now PAID but order not confirmed, confirm it
    if result.state == PaymentState.PAID.value and order.status == 'pending':
        _confirm_order(order)

    return jsonify({
        'payment_id': payment_id,
        'state': result.state,
        'order_id': str(order.id),
        'order_status': order.status,
    })


@payments_bp.route('/payments/callback', methods=['GET'])
def payment_callback():
    """
    Handle redirect back from GoPay.
    ---
    tags:
      - Payments
    description: |
      User is redirected here after payment.
      Verifies payment status and redirects to frontend.
    parameters:
      - name: id
        in: query
        type: string
        description: GoPay payment ID
      - name: order
        in: query
        type: string
        description: Order number/ID
    responses:
      302:
        description: Redirect to frontend
    """
    import os
    from flask import redirect

    payment_id = request.args.get('id')
    order_number = request.args.get('order')

    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')

    if not payment_id:
        return redirect(f"{frontend_url}/checkout/error?reason=missing_payment_id")

    # Get payment status
    result = gopay_client.get_payment_status(payment_id)

    if result.success and result.state == PaymentState.PAID.value:
        # Payment successful
        return redirect(f"{frontend_url}/checkout/success?payment={payment_id}&order={order_number}")
    elif result.state == PaymentState.CANCELED.value:
        # Payment cancelled
        return redirect(f"{frontend_url}/checkout/cancelled?order={order_number}")
    else:
        # Payment pending or failed
        return redirect(f"{frontend_url}/checkout/pending?payment={payment_id}&order={order_number}")


def _confirm_order(order: Order) -> None:
    """
    Confirm order and generate tickets.

    Args:
        order: Order to confirm
    """
    from app.utils.qr_generator import generate_qr_payload, sign_payload
    import uuid

    order.status = 'confirmed'
    order.confirmed_at = __import__('datetime').datetime.utcnow()
    order.payment_method = 'gopay'

    # Generate tickets for each item
    for item in order.items:
        ticket_type = TicketType.query.get(item.ticket_type_id)
        if not ticket_type:
            continue

        for _ in range(item.quantity):
            ticket = Ticket(
                id=uuid.uuid4(),
                ticket_type_id=item.ticket_type_id,
                event_id=order.event_id,
                order_id=order.id,
                owner_id=order.user_id,
                original_price_cents=item.unit_price_cents,
                status='valid',
            )
            db.session.add(ticket)
            db.session.flush()

            # Generate QR code data
            qr_payload = generate_qr_payload(ticket)
            ticket.qr_code_data = sign_payload(qr_payload)

        # Update ticket type availability
        if ticket_type.quantity_available is not None:
            ticket_type.quantity_available = max(0, ticket_type.quantity_available - item.quantity)

    db.session.commit()
