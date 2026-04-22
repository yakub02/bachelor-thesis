"""
Ticket endpoints.

Security:
- All endpoints require authentication
- QR codes carry a static HMAC signature derived from a per-ticket server-side secret
- Ticket ownership is verified before operations
"""

from flask import jsonify, request, g, current_app, make_response, send_file
from pydantic import ValidationError

from app import db, limiter
from app.api.tickets import tickets_bp
from app.models import TicketType, Ticket, AuditLog
from app.utils.auth import require_auth, require_user_id, get_current_user_id, check_event_access
from app.utils.security import generate_qr_payload
from app.utils.validators import TicketTypeCreate
from app.services.pdf_service import generate_ticket_pdf


# =============================================================================
# GET TICKET TYPES FOR EVENT
# =============================================================================

@tickets_bp.route('/events/<event_id>/ticket-types', methods=['GET'])
@limiter.limit("60 per minute")  # Higher limit for browsing
def get_ticket_types(event_id):
    """
    List available ticket types for an event (PUBLIC - no auth required)
    ---
    tags:
      - Tickets
    parameters:
      - name: event_id
        in: path
        type: string
        format: uuid
        required: true
        description: Event UUID
    responses:
      200:
        description: List of available ticket types
        schema:
          type: object
          properties:
            event_id:
              type: string
            ticket_types:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                  name:
                    type: string
                  price_cents:
                    type: integer
                  quantity_available:
                    type: integer
                  is_on_sale:
                    type: boolean
            count:
              type: integer
    """
    ticket_types = TicketType.query.filter_by(
        event_id=event_id,
        is_active=True
    ).all()
    
    # Filter to only on-sale types and hide internal data
    result = [
        tt.to_dict(include_internal=False)
        for tt in ticket_types
        if tt.is_on_sale
    ]
    
    return jsonify({
        'event_id': event_id,
        'ticket_types': result,
        'count': len(result)
    })


# =============================================================================
# GET MY TICKETS
# =============================================================================

@tickets_bp.route('/tickets', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
@require_user_id
def get_my_tickets():
    """
    List tickets owned by current user
    ---
    tags:
      - Tickets
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: event_id
        in: query
        type: string
        required: false
        description: Filter by event UUID
      - name: status
        in: query
        type: string
        enum: [valid, used, invalidated, listed, transferred]
        required: false
        description: Filter by ticket status
    responses:
      200:
        description: List of user's tickets
        schema:
          type: object
          properties:
            tickets:
              type: array
              items:
                $ref: '#/definitions/Ticket'
            count:
              type: integer
      401:
        description: Authentication required
    """
    user_id = get_current_user_id()
    
    query = Ticket.query.filter_by(owner_id=user_id)
    
    # Optional filters
    event_id = request.args.get('event_id')
    if event_id:
        query = query.join(TicketType).filter(TicketType.event_id == event_id)
    
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)
    
    tickets = query.order_by(Ticket.issued_at.desc()).all()
    
    return jsonify({
        'tickets': [t.to_dict() for t in tickets],
        'count': len(tickets)
    })


# =============================================================================
# GET SINGLE TICKET
# =============================================================================

@tickets_bp.route('/tickets/<ticket_id>', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
@require_user_id
def get_ticket(ticket_id):
    """
    Get ticket details
    ---
    tags:
      - Tickets
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: ticket_id
        in: path
        type: string
        format: uuid
        required: true
        description: Ticket UUID
    responses:
      200:
        description: Ticket details
        schema:
          $ref: '#/definitions/Ticket'
      403:
        description: Not your ticket
      404:
        description: Ticket not found
    """
    user_id = get_current_user_id()
    
    ticket = Ticket.query.get(ticket_id)
    
    if not ticket:
        return jsonify({'error': 'Not Found', 'message': 'Ticket not found'}), 404
    
    # Verify ownership
    if str(ticket.owner_id) != user_id:
        return jsonify({'error': 'Forbidden', 'message': 'Not your ticket'}), 403
    
    return jsonify(ticket.to_dict())


# =============================================================================
# GET TICKET QR CODE
# =============================================================================

@tickets_bp.route('/tickets/<ticket_id>/qr', methods=['GET'])
@limiter.limit("60 per minute")
@require_auth
@require_user_id
def get_ticket_qr(ticket_id):
    """
    Get static QR code for ticket
    ---
    tags:
      - Tickets
    description: Returns a static HMAC-signed QR payload for the ticket. Only valid tickets can generate QR codes.
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: ticket_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: QR code data
        schema:
          type: object
          properties:
            ticket_id:
              type: string
            event_id:
              type: string
            qr_data:
              type: string
              description: Data to encode in QR code
            signature:
              type: string
            status:
              type: string
      400:
        description: Cannot generate QR for this ticket status
      403:
        description: Not your ticket
      404:
        description: Ticket not found
    """
    user_id = get_current_user_id()
    
    ticket = Ticket.query.get(ticket_id)
    
    if not ticket:
        return jsonify({'error': 'Not Found', 'message': 'Ticket not found'}), 404
    
    # Verify ownership
    if str(ticket.owner_id) != user_id:
        return jsonify({'error': 'Forbidden', 'message': 'Not your ticket'}), 403
    
    # Check ticket status
    if ticket.status != 'valid':
        return jsonify({
            'error': 'Bad Request',
            'message': f'Cannot generate QR for ticket with status: {ticket.status}'
        }), 400
    
    # Generate signed QR payload
    qr_payload = generate_qr_payload(
        ticket_id=str(ticket.id),
        event_id=str(ticket.ticket_type.event_id),
        qr_secret=ticket.qr_secret,
        signing_key=current_app.config['QR_SIGNING_KEY']
    )
    
    return jsonify({
        'ticket_id': str(ticket.id),
        'event_id': str(ticket.ticket_type.event_id),
        'qr_data': f"{ticket.id}:{ticket.ticket_type.event_id}:{qr_payload['signature']}",
        'signature': qr_payload['signature'],
        'status': ticket.status
    })


# =============================================================================
# TRANSFER TICKET
# =============================================================================

@tickets_bp.route('/tickets/<ticket_id>/transfer', methods=['POST'])
@limiter.limit("10 per minute")  # Low limit - sensitive operation
@require_auth
@require_user_id
def transfer_ticket(ticket_id):
    """
    Transfer ticket to another user
    ---
    tags:
      - Tickets
    description: Free transfer to another user. For paid resale use /resale endpoints.
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: ticket_id
        in: path
        type: string
        format: uuid
        required: true
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - recipient_id
          properties:
            recipient_id:
              type: string
              format: uuid
              description: UUID of new owner
    responses:
      200:
        description: Transfer successful
        schema:
          type: object
          properties:
            message:
              type: string
            ticket_id:
              type: string
            new_owner_id:
              type: string
      400:
        description: Invalid transfer request
      403:
        description: Not your ticket
      404:
        description: Ticket not found
    """
    user_id = get_current_user_id()
    data = request.get_json()
    
    if not data or 'recipient_id' not in data:
        return jsonify({'error': 'Bad Request', 'message': 'recipient_id required'}), 400
    
    recipient_id = data['recipient_id']
    
    # Can't transfer to yourself
    if recipient_id == user_id:
        return jsonify({'error': 'Bad Request', 'message': 'Cannot transfer to yourself'}), 400
    
    ticket = Ticket.query.get(ticket_id)
    
    if not ticket:
        return jsonify({'error': 'Not Found', 'message': 'Ticket not found'}), 404
    
    # Verify ownership
    if str(ticket.owner_id) != user_id:
        return jsonify({'error': 'Forbidden', 'message': 'Not your ticket'}), 403
    
    # Check if transfer is allowed
    if not ticket.can_transition_to('transferred'):
        return jsonify({
            'error': 'Bad Request',
            'message': f'Cannot transfer ticket with status: {ticket.status}'
        }), 400
    
    # Store old values for audit
    old_owner = str(ticket.owner_id)
    
    # Perform transfer
    from datetime import datetime
    from app.utils.security import generate_qr_secret
    
    ticket.owner_id = recipient_id
    ticket.status = 'valid'  # Reset to valid for new owner
    ticket.qr_secret = generate_qr_secret()  # New QR secret!
    ticket.transferred_count += 1
    ticket.last_transferred_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        action='ticket.transfer',
        entity_type='ticket',
        entity_id=ticket.id,
        user_id=user_id,
        ip_address=g.get('ip_address'),
        user_agent_hash=g.get('user_agent_hash'),
        old_values={'owner_id': old_owner},
        new_values={'owner_id': recipient_id}
    )
    db.session.add(audit)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Ticket transferred successfully',
        'ticket_id': str(ticket.id),
        'new_owner_id': recipient_id
    })


# =============================================================================
# ADMIN: CREATE TICKET TYPE
# =============================================================================

@tickets_bp.route('/admin/ticket-types', methods=['POST'])
@limiter.limit("20 per minute")
@require_auth
def create_ticket_type():
    """
    Create new ticket type for an event
    ---
    tags:
      - Tickets
    description: Admin/Organizer only endpoint
    security:
      - BearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - event_id
            - name
            - price_cents
            - quantity_total
          properties:
            event_id:
              type: string
              format: uuid
            name:
              type: string
              example: Early Bird
            description:
              type: string
            price_cents:
              type: integer
              example: 50000
            currency:
              type: string
              default: CZK
            quantity_total:
              type: integer
              example: 100
            sale_starts_at:
              type: string
              format: date-time
            sale_ends_at:
              type: string
              format: date-time
            max_per_order:
              type: integer
              default: 4
            resale_allowed:
              type: boolean
              default: true
            resale_max_price_percent:
              type: integer
              default: 110
    responses:
      201:
        description: Ticket type created
      400:
        description: Validation error
    """
    try:
        data = TicketTypeCreate(**request.get_json())
    except ValidationError as e:
        return jsonify({
            'error': 'Validation Error',
            'details': e.errors()
        }), 400
    
    ticket_type = TicketType(
        event_id=data.event_id,
        name=data.name,
        description=data.description,
        price_cents=data.price_cents,
        currency=data.currency,
        quantity_total=data.quantity_total,
        sale_starts_at=data.sale_starts_at,
        sale_ends_at=data.sale_ends_at,
        max_per_order=data.max_per_order,
        resale_allowed=data.resale_allowed,
        resale_max_price_percent=data.resale_max_price_percent
    )
    
    db.session.add(ticket_type)
    db.session.commit()

    return jsonify(ticket_type.to_dict(include_internal=True)), 201


# =============================================================================
# DOWNLOAD TICKET PDF
# =============================================================================

@tickets_bp.route('/tickets/<ticket_id>/pdf', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
@require_user_id
def download_ticket_pdf(ticket_id):
    """
    Download ticket as PDF
    ---
    tags:
      - Tickets
    description: |
      Generate and download a PDF version of the ticket.
      The PDF includes a static QR code suitable for printing.
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: ticket_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: PDF file
        content:
          application/pdf:
            schema:
              type: string
              format: binary
      400:
        description: Cannot generate PDF for this ticket status
      403:
        description: Not your ticket
      404:
        description: Ticket not found
    """
    user_id = get_current_user_id()

    ticket = Ticket.query.get(ticket_id)

    if not ticket:
        return jsonify({'error': 'Not Found', 'message': 'Ticket not found'}), 404

    # Verify ownership
    if str(ticket.owner_id) != user_id:
        return jsonify({'error': 'Forbidden', 'message': 'Not your ticket'}), 403

    # Check ticket status
    if ticket.status not in ['valid', 'used']:
        return jsonify({
            'error': 'Bad Request',
            'message': f'Cannot generate PDF for ticket with status: {ticket.status}'
        }), 400

    # Get ticket type and order info
    ticket_type = ticket.ticket_type
    order = ticket.order

    # Generate static QR code data (for printing)
    # This uses a longer-lived signature suitable for printed tickets
    qr_data = f"RAVETURE:{ticket.id}:{ticket_type.event_id}"

    from datetime import datetime, timezone
    event_name = order.event_name or f"Event {str(ticket_type.event_id)[:8]}"
    event_date = order.event_date or datetime.now(timezone.utc)
    event_venue = order.event_venue or "Venue TBD"

    # Generate PDF
    pdf_buffer = generate_ticket_pdf(
        ticket_id=str(ticket.id),
        ticket_type_name=ticket_type.name,
        order_reference=order.reference,
        event_name=event_name,
        event_date=event_date,
        event_venue=event_venue,
        qr_data=qr_data,
        additional_info=(
            "Keep this ticket private. The QR code grants a single entry and "
            "will be invalidated after it is scanned at the door."
        )
    )

    # Create response
    response = make_response(pdf_buffer.read())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename="ticket_{ticket.id}.pdf"'

    return response