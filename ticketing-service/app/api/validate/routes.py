"""
Ticket validation endpoints (door entry).

Security:
- QR signature verification
- Real-time status check
- All attempts logged
"""

from datetime import datetime

from flask import jsonify, request, g, current_app
from pydantic import ValidationError

from app import db, limiter
from app.api.validate import validate_bp
from app.models import Ticket, TicketType, Validation
from app.utils.auth import require_auth
from app.utils.security import verify_qr_signature
from app.utils.validators import TicketScan, TicketScanByCode


@validate_bp.route('/validate/scan', methods=['POST'])
@limiter.limit("300 per minute")  # High limit for door scanners
@require_auth
def scan_ticket():
    """
    Validate ticket at door entry
    ---
    tags:
      - Validation
    description: Verifies QR code signature and marks ticket as used if valid
    security:
      - ApiKeyAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - ticket_id
            - event_id
            - signature
          properties:
            ticket_id:
              type: string
              format: uuid
            event_id:
              type: string
              format: uuid
            signature:
              type: string
              description: Hex string from QR code
            scanned_by:
              type: string
              format: uuid
              description: Staff user ID
            location:
              type: string
              example: Main Entrance
    responses:
      200:
        description: Validation result
        schema:
          type: object
          properties:
            result:
              type: string
              enum: [valid, already_used, invalid_signature, invalid_status, wrong_event, not_found]
            allowed:
              type: boolean
            message:
              type: string
            ticket_type:
              type: string
              description: Only present if valid
      400:
        description: Validation error in request
    """
    try:
        data = TicketScan(**request.get_json())
    except ValidationError as e:
        return jsonify({
            'error': 'Validation Error',
            'details': e.errors()
        }), 400
    
    # Find ticket
    ticket = Ticket.query.get(str(data.ticket_id))
    
    # Determine result
    result = None
    result_details = None
    
    if not ticket:
        result = 'not_found'
        result_details = 'Ticket ID not in database'
    
    elif str(ticket.ticket_type.event_id) != str(data.event_id):
        result = 'wrong_event'
        result_details = f'Ticket is for different event'
    
    elif ticket.status == 'used':
        result = 'already_used'
        result_details = f'Used at {ticket.used_at.isoformat()}'
    
    elif ticket.status != 'valid':
        result = 'invalid_status'
        result_details = f'Ticket status: {ticket.status}'
    
    else:
        # Verify QR signature
        is_valid, error = verify_qr_signature(
            ticket_id=str(data.ticket_id),
            event_id=str(data.event_id),
            qr_secret=ticket.qr_secret,
            signing_key=current_app.config['QR_SIGNING_KEY'],
            provided_signature=data.signature
        )
        
        if not is_valid:
            result = 'invalid_signature'
            result_details = 'QR code signature verification failed'
        else:
            result = 'valid'
            ticket.status = 'used'
            ticket.used_at = datetime.utcnow()
    
    # Log validation attempt (always, regardless of result)
    validation = Validation(
        ticket_id=ticket.id if ticket else None,
        event_id=data.event_id,
        result=result,
        result_details=result_details,
        scanned_by=data.scanned_by,
        location=data.location,
        ip_address=g.get('ip_address'),
        user_agent_hash=g.get('user_agent_hash')
    )
    db.session.add(validation)
    db.session.commit()
    
    # Response
    response = {
        'result': result,
        'allowed': result == 'valid',
        'message': {
            'valid': '✓ Entry granted',
            'already_used': '✗ Ticket already used',
            'invalid_signature': '✗ Invalid QR code',
            'invalid_status': '✗ Ticket not valid',
            'wrong_event': '✗ Wrong event',
            'not_found': '✗ Ticket not found'
        }.get(result, '✗ Error')
    }
    
    if result == 'valid' and ticket:
        response['ticket_type'] = ticket.ticket_type.name
    
    return jsonify(response)


@validate_bp.route('/validate/scan-by-code', methods=['POST'])
@limiter.limit("60 per minute")
@require_auth
def scan_ticket_by_code():
    """
    Validate ticket by short numeric code (manual entry fallback).
    ---
    tags:
      - Validation
    description: >
      Fallback for door staff when a QR code cannot be scanned (damaged print,
      dead phone battery). Looks up a ticket by the last 12 characters of its
      UUID and marks it as used if valid. Skips cryptographic signature check
      since the caller is authenticated staff and all attempts are logged.
    security:
      - ApiKeyAuth: []
      - JWT: []
    """
    try:
        data = TicketScanByCode(**request.get_json())
    except ValidationError as e:
        return jsonify({
            'error': 'Validation Error',
            'details': e.errors()
        }), 400

    # Find ticket whose UUID ends with the provided code.
    # UUIDs are stored lowercase; match on the stringified form.
    code = data.code
    ticket = Ticket.query.filter(
        db.cast(Ticket.id, db.String).like(f'%{code}')
    ).first()

    result = None
    result_details = None

    if not ticket:
        result = 'not_found'
        result_details = 'No ticket matches the provided code'

    elif data.event_id is not None and str(ticket.ticket_type.event_id) != str(data.event_id):
        result = 'wrong_event'
        result_details = 'Ticket is for a different event'

    elif ticket.status == 'used':
        result = 'already_used'
        result_details = f'Used at {ticket.used_at.isoformat()}'

    elif ticket.status != 'valid':
        result = 'invalid_status'
        result_details = f'Ticket status: {ticket.status}'

    else:
        result = 'valid'
        ticket.status = 'used'
        ticket.used_at = datetime.utcnow()

    # event_id for the audit log: prefer the caller's context, fall back to the
    # ticket's own event, and finally to a zero-UUID sentinel for not_found
    # scans where there is no event context at all.
    log_event_id = (
        str(data.event_id) if data.event_id is not None
        else str(ticket.ticket_type.event_id) if ticket
        else '00000000-0000-0000-0000-000000000000'
    )

    validation = Validation(
        ticket_id=ticket.id if ticket else None,
        event_id=log_event_id,
        result=result,
        result_details=result_details,
        scanned_by=data.scanned_by,
        location=data.location or 'Manual entry',
        ip_address=g.get('ip_address'),
        user_agent_hash=g.get('user_agent_hash')
    )
    db.session.add(validation)
    db.session.commit()

    response = {
        'result': result,
        'allowed': result == 'valid',
        'message': {
            'valid': '✓ Entry granted',
            'already_used': '✗ Ticket already used',
            'invalid_status': '✗ Ticket not valid',
            'wrong_event': '✗ Wrong event',
            'not_found': '✗ Ticket not found'
        }.get(result, '✗ Error')
    }

    if result == 'valid' and ticket:
        response['ticket_type'] = ticket.ticket_type.name

    return jsonify(response)


@validate_bp.route('/validate/stats/<event_id>', methods=['GET'])
@limiter.limit("60 per minute")
@require_auth
def get_validation_stats(event_id):
    """
    Get entry statistics for event
    ---
    tags:
      - Validation
    security:
      - ApiKeyAuth: []
    parameters:
      - name: event_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: Event entry statistics
        schema:
          type: object
          properties:
            event_id:
              type: string
            total_scans:
              type: integer
            entries_granted:
              type: integer
            rejected:
              type: integer
            breakdown:
              type: object
              additionalProperties:
                type: integer
    """
    
    stats = db.session.query(
        Validation.result,
        db.func.count(Validation.id)
    ).filter(
        Validation.event_id == event_id
    ).group_by(
        Validation.result
    ).all()
    
    result_counts = {r: c for r, c in stats}
    
    return jsonify({
        'event_id': event_id,
        'total_scans': sum(result_counts.values()),
        'entries_granted': result_counts.get('valid', 0),
        'rejected': sum(c for r, c in result_counts.items() if r != 'valid'),
        'breakdown': result_counts
    })