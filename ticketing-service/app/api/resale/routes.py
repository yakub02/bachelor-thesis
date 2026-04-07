"""
P2P Resale marketplace endpoints.

Security:
- Price caps enforced
- Instant QR invalidation on listing
- New QR issued to buyer
"""

from datetime import datetime

from flask import jsonify, request, g, current_app
from pydantic import ValidationError
from sqlalchemy import select

from app import db, limiter
from app.api.resale import resale_bp
from app.models import Ticket, TicketType, ResaleListing, AuditLog
from app.utils.auth import require_auth, require_user_id, get_current_user_id
from app.utils.security import generate_qr_secret
from app.utils.validators import ResaleListingCreate, ResalePurchase


@resale_bp.route('/resale/listings', methods=['GET'])
@limiter.limit("60 per minute")
@require_auth
def get_listings():
    """
    Browse active resale listings
    ---
    tags:
      - Resale
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: event_id
        in: query
        type: string
        format: uuid
        required: true
        description: Filter by event
    responses:
      200:
        description: List of active resale listings
        schema:
          type: object
          properties:
            listings:
              type: array
              items:
                $ref: '#/definitions/ResaleListing'
            count:
              type: integer
      400:
        description: event_id required
    """
    event_id = request.args.get('event_id')
    
    if not event_id:
        return jsonify({'error': 'Bad Request', 'message': 'event_id required'}), 400
    
    listings = ResaleListing.query.filter_by(
        event_id=event_id,
        status='active'
    ).order_by(ResaleListing.asking_price_cents.asc()).all()
    
    return jsonify({
        'listings': [l.to_dict() for l in listings],
        'count': len(listings)
    })


@resale_bp.route('/resale/list', methods=['POST'])
@limiter.limit("10 per minute")
@require_auth
@require_user_id
def create_listing():
    """
    List a ticket for resale
    ---
    tags:
      - Resale
    description: |
      Immediately invalidates the ticket's QR code.
      Price must be within allowed range (max 110% of original).
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
            - ticket_id
            - asking_price_cents
          properties:
            ticket_id:
              type: string
              format: uuid
            asking_price_cents:
              type: integer
              description: Must not exceed max resale price
    responses:
      201:
        description: Ticket listed
        schema:
          type: object
          properties:
            message:
              type: string
            listing:
              $ref: '#/definitions/ResaleListing'
            warning:
              type: string
      400:
        description: Validation error or price exceeds maximum
      403:
        description: Not your ticket
      404:
        description: Ticket not found
    """
    user_id = get_current_user_id()
    
    try:
        data = ResaleListingCreate(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation Error', 'details': e.errors()}), 400
    
    try:
        # Lock ticket
        ticket = db.session.execute(
            select(Ticket)
            .where(Ticket.id == data.ticket_id)
            .with_for_update()
        ).scalar_one_or_none()
        
        if not ticket:
            return jsonify({'error': 'Not Found', 'message': 'Ticket not found'}), 404
        
        # Verify ownership
        if str(ticket.owner_id) != user_id:
            db.session.rollback()
            return jsonify({'error': 'Forbidden', 'message': 'Not your ticket'}), 403
        
        # Check if can be listed
        if not ticket.can_transition_to('listed'):
            db.session.rollback()
            return jsonify({
                'error': 'Bad Request',
                'message': f'Cannot list ticket with status: {ticket.status}'
            }), 400
        
        # Check if resale is allowed
        ticket_type = ticket.ticket_type
        if not ticket_type.resale_allowed:
            db.session.rollback()
            return jsonify({
                'error': 'Bad Request',
                'message': 'Resale not allowed for this ticket type'
            }), 400
        
        # Check price cap
        max_price = int(ticket_type.price_cents * ticket_type.resale_max_price_percent / 100)
        if data.asking_price_cents > max_price:
            db.session.rollback()
            return jsonify({
                'error': 'Bad Request',
                'message': f'Price exceeds maximum allowed ({max_price} cents)'
            }), 400
        
        # Check for existing listing
        existing = ResaleListing.query.filter_by(
            ticket_id=ticket.id,
            status='active'
        ).first()
        
        if existing:
            db.session.rollback()
            return jsonify({
                'error': 'Bad Request',
                'message': 'Ticket already listed for resale'
            }), 400
        
        # Update ticket status (invalidates QR!)
        ticket.status = 'listed'
        
        # Create listing
        listing = ResaleListing(
            ticket_id=ticket.id,
            seller_id=user_id,
            event_id=ticket_type.event_id,
            asking_price_cents=data.asking_price_cents,
            original_price_cents=ticket_type.price_cents
        )
        db.session.add(listing)
        
        # Audit log
        audit = AuditLog(
            action='resale.list',
            entity_type='ticket',
            entity_id=ticket.id,
            user_id=user_id,
            ip_address=g.get('ip_address'),
            new_values={
                'asking_price_cents': data.asking_price_cents,
                'original_price_cents': ticket_type.price_cents
            }
        )
        db.session.add(audit)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Ticket listed for resale',
            'listing': listing.to_dict(),
            'warning': 'Your QR code is now invalid until you cancel the listing or the ticket is sold'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Listing creation failed: {e}", exc_info=True)
        return jsonify({'error': 'Internal Error', 'message': 'Failed to create listing'}), 500


@resale_bp.route('/resale/list/<listing_id>', methods=['DELETE'])
@limiter.limit("10 per minute")
@require_auth
@require_user_id
def cancel_listing(listing_id):
    """
    Cancel resale listing
    ---
    tags:
      - Resale
    description: Cancels listing and restores ticket with fresh QR code
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: listing_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: Listing cancelled
        schema:
          type: object
          properties:
            message:
              type: string
            ticket_id:
              type: string
      400:
        description: Cannot cancel listing with this status
      403:
        description: Not your listing
      404:
        description: Listing not found
    """
    user_id = get_current_user_id()
    
    try:
        listing = db.session.execute(
            select(ResaleListing)
            .where(ResaleListing.id == listing_id)
            .with_for_update()
        ).scalar_one_or_none()
        
        if not listing:
            return jsonify({'error': 'Not Found', 'message': 'Listing not found'}), 404
        
        if str(listing.seller_id) != user_id:
            db.session.rollback()
            return jsonify({'error': 'Forbidden', 'message': 'Not your listing'}), 403
        
        if listing.status != 'active':
            db.session.rollback()
            return jsonify({
                'error': 'Bad Request',
                'message': f'Cannot cancel listing with status: {listing.status}'
            }), 400
        
        # Restore ticket
        ticket = listing.ticket
        ticket.status = 'valid'
        ticket.qr_secret = generate_qr_secret()  # Fresh QR!
        
        # Update listing
        listing.status = 'cancelled'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Listing cancelled',
            'ticket_id': str(ticket.id)
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal Error', 'message': 'Failed to cancel listing'}), 500


@resale_bp.route('/resale/buy/<listing_id>', methods=['POST'])
@limiter.limit("10 per minute")
@require_auth
@require_user_id
def buy_listing(listing_id):
    """
    Purchase a resale ticket
    ---
    tags:
      - Resale
    description: Transfers ownership and issues fresh QR code to buyer
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: listing_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: Purchase successful
        schema:
          type: object
          properties:
            message:
              type: string
            ticket:
              $ref: '#/definitions/Ticket'
      400:
        description: Listing unavailable or cannot buy own listing
      404:
        description: Listing not found
    """
    user_id = get_current_user_id()
    
    try:
        listing = db.session.execute(
            select(ResaleListing)
            .where(ResaleListing.id == listing_id)
            .with_for_update()
        ).scalar_one_or_none()
        
        if not listing:
            return jsonify({'error': 'Not Found', 'message': 'Listing not found'}), 404
        
        if listing.status != 'active':
            db.session.rollback()
            return jsonify({
                'error': 'Bad Request',
                'message': 'Listing no longer available'
            }), 400
        
        # Can't buy your own
        if str(listing.seller_id) == user_id:
            db.session.rollback()
            return jsonify({
                'error': 'Bad Request',
                'message': 'Cannot buy your own listing'
            }), 400
        
        ticket = listing.ticket
        old_owner = str(ticket.owner_id)
        
        # Transfer ticket
        ticket.owner_id = user_id
        ticket.status = 'valid'
        ticket.qr_secret = generate_qr_secret()  # NEW QR for buyer!
        ticket.transferred_count += 1
        ticket.last_transferred_at = datetime.utcnow()
        
        # Update listing
        listing.status = 'sold'
        listing.buyer_id = user_id
        listing.sold_at = datetime.utcnow()
        
        # Audit log
        audit = AuditLog(
            action='resale.purchase',
            entity_type='ticket',
            entity_id=ticket.id,
            user_id=user_id,
            ip_address=g.get('ip_address'),
            old_values={'owner_id': old_owner},
            new_values={
                'owner_id': user_id,
                'price_paid_cents': listing.asking_price_cents
            }
        )
        db.session.add(audit)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Ticket purchased successfully',
            'ticket': ticket.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Resale purchase failed: {e}", exc_info=True)
        return jsonify({'error': 'Internal Error', 'message': 'Purchase failed'}), 500