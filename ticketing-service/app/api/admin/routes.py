"""
Admin/Organizer endpoints for event management and statistics.

Security:
- All endpoints require authentication
- Event-level access control
"""

from datetime import datetime, timedelta
from collections import defaultdict

from flask import jsonify, request, g
from sqlalchemy import func, and_, desc

from app import db, limiter
from app.api.admin import admin_bp
from app.models import (
    TicketType, Ticket, Order, OrderItem, Validation,
    DiscountCode, DiscountCodeUsage, AuditLog
)
from app.utils.auth import require_auth, check_event_access


# =============================================================================
# EVENT STATISTICS
# =============================================================================

@admin_bp.route('/admin/events/<event_id>/stats', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
def get_event_stats(event_id):
    """
    Get comprehensive event statistics
    ---
    tags:
      - Admin
    description: |
      Returns detailed sales statistics for an event including:
      - Revenue totals
      - Ticket sales by type
      - Order counts by status
      - Check-in statistics
      - Daily sales breakdown
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: event_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: Event statistics
      403:
        description: Access denied to this event
    """
    if not check_event_access(event_id):
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have access to this event'
        }), 403

    # Get all ticket types for this event
    ticket_types = TicketType.query.filter_by(event_id=event_id).all()

    # Calculate totals
    total_capacity = sum(tt.quantity_total for tt in ticket_types)
    total_sold = sum(tt.quantity_sold for tt in ticket_types)
    total_reserved = sum(tt.quantity_reserved for tt in ticket_types)
    total_available = sum(tt.quantity_available for tt in ticket_types)

    # Calculate revenue from confirmed orders
    revenue_result = db.session.query(
        func.sum(Order.total_cents),
        func.sum(Order.discount_cents)
    ).filter(
        Order.event_id == event_id,
        Order.status == 'confirmed'
    ).first()

    total_revenue = revenue_result[0] or 0
    total_discounts = revenue_result[1] or 0

    # Order counts by status
    order_counts = db.session.query(
        Order.status,
        func.count(Order.id)
    ).filter(
        Order.event_id == event_id
    ).group_by(Order.status).all()

    order_stats = {status: count for status, count in order_counts}

    # Check-in statistics
    checkin_stats = db.session.query(
        Validation.result,
        func.count(Validation.id)
    ).filter(
        Validation.event_id == event_id
    ).group_by(Validation.result).all()

    validation_breakdown = {result: count for result, count in checkin_stats}
    total_checkins = validation_breakdown.get('valid', 0)

    # Per ticket type breakdown
    ticket_type_stats = []
    for tt in ticket_types:
        # Revenue for this ticket type
        tt_revenue = db.session.query(
            func.sum(OrderItem.quantity * OrderItem.unit_price_cents)
        ).join(Order).filter(
            OrderItem.ticket_type_id == tt.id,
            Order.status == 'confirmed'
        ).scalar() or 0

        ticket_type_stats.append({
            'id': str(tt.id),
            'name': tt.name,
            'price_cents': tt.price_cents,
            'quantity_total': tt.quantity_total,
            'quantity_sold': tt.quantity_sold,
            'quantity_reserved': tt.quantity_reserved,
            'quantity_available': tt.quantity_available,
            'revenue_cents': tt_revenue,
            'is_active': tt.is_active,
            'is_on_sale': tt.is_on_sale,
            'sale_starts_at': tt.sale_starts_at.isoformat() if tt.sale_starts_at else None,
            'sale_ends_at': tt.sale_ends_at.isoformat() if tt.sale_ends_at else None
        })

    # Daily sales (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    daily_sales = db.session.query(
        func.date(Order.confirmed_at).label('date'),
        func.count(Order.id).label('orders'),
        func.sum(Order.total_cents).label('revenue')
    ).filter(
        Order.event_id == event_id,
        Order.status == 'confirmed',
        Order.confirmed_at >= thirty_days_ago
    ).group_by(func.date(Order.confirmed_at)).order_by('date').all()

    daily_sales_data = [
        {
            'date': str(row.date),
            'orders': row.orders,
            'revenue_cents': row.revenue or 0
        }
        for row in daily_sales
    ]

    # Recent orders
    recent_orders = Order.query.filter_by(
        event_id=event_id
    ).order_by(desc(Order.created_at)).limit(10).all()

    return jsonify({
        'event_id': event_id,
        'summary': {
            'total_capacity': total_capacity,
            'total_sold': total_sold,
            'total_reserved': total_reserved,
            'total_available': total_available,
            'total_revenue_cents': total_revenue,
            'total_discounts_cents': total_discounts,
            'net_revenue_cents': total_revenue,  # Already net after discounts
            'total_checkins': total_checkins,
            'checkin_rate': round(total_checkins / total_sold * 100, 1) if total_sold > 0 else 0
        },
        'orders': {
            'confirmed': order_stats.get('confirmed', 0),
            'pending': order_stats.get('pending', 0),
            'cancelled': order_stats.get('cancelled', 0),
            'expired': order_stats.get('expired', 0),
            'refunded': order_stats.get('refunded', 0)
        },
        'validations': validation_breakdown,
        'by_ticket_type': ticket_type_stats,
        'daily_sales': daily_sales_data,
        'recent_orders': [o.to_dict(include_items=True) for o in recent_orders]
    })


# =============================================================================
# BUYERS LIST
# =============================================================================

@admin_bp.route('/admin/events/<event_id>/buyers', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
def get_event_buyers(event_id):
    """
    Get list of buyers for an event
    ---
    tags:
      - Admin
    description: Paginated list of users who purchased tickets.
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: event_id
        in: path
        type: string
        format: uuid
        required: true
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
        maximum: 100
      - name: search
        in: query
        type: string
        description: Search by user ID (partial match)
    responses:
      200:
        description: List of buyers
      403:
        description: Access denied to this event
    """
    if not check_event_access(event_id):
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have access to this event'
        }), 403

    page = int(request.args.get('page', 1))
    per_page = min(int(request.args.get('per_page', 20)), 100)
    search = request.args.get('search', '')

    # Get unique buyers with aggregated stats
    buyers_query = db.session.query(
        Order.user_id,
        func.count(Order.id).label('order_count'),
        func.sum(Order.total_cents).label('total_spent'),
        func.min(Order.confirmed_at).label('first_purchase'),
        func.max(Order.confirmed_at).label('last_purchase')
    ).filter(
        Order.event_id == event_id,
        Order.status == 'confirmed'
    ).group_by(Order.user_id)

    # Apply search filter
    if search:
        buyers_query = buyers_query.filter(
            Order.user_id.cast(db.String).ilike(f'%{search}%')
        )

    # Get total count before pagination
    total_query = buyers_query.subquery()
    total = db.session.query(func.count()).select_from(total_query).scalar()

    # Apply pagination
    buyers = buyers_query.order_by(desc('total_spent')).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    # Get ticket counts for each buyer
    buyers_data = []
    for buyer in buyers:
        # Count tickets for this buyer
        tickets_count = Ticket.query.join(Order).filter(
            Order.event_id == event_id,
            Ticket.owner_id == buyer.user_id
        ).count()

        # Get their orders for this event
        orders = Order.query.filter(
            Order.event_id == event_id,
            Order.user_id == buyer.user_id,
            Order.status == 'confirmed'
        ).order_by(desc(Order.confirmed_at)).all()

        buyers_data.append({
            'user_id': str(buyer.user_id),
            'tickets_count': tickets_count,
            'order_count': buyer.order_count,
            'total_spent_cents': buyer.total_spent or 0,
            'first_purchase': buyer.first_purchase.isoformat() if buyer.first_purchase else None,
            'last_purchase': buyer.last_purchase.isoformat() if buyer.last_purchase else None,
            'orders': [o.to_dict() for o in orders]
        })

    return jsonify({
        'buyers': buyers_data,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    })


# =============================================================================
# UPDATE TICKET TYPE
# =============================================================================

@admin_bp.route('/admin/ticket-types/<ticket_type_id>', methods=['PUT'])
@limiter.limit("20 per minute")
@require_auth
def update_ticket_type(ticket_type_id):
    """
    Update a ticket type
    ---
    tags:
      - Admin
    description: |
      Update ticket type settings. Note:
      - Cannot decrease quantity_total (only increase)
      - Cannot change price or name after creation
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: ticket_type_id
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
            quantity_total:
              type: integer
              description: Can only increase, not decrease
            sale_starts_at:
              type: string
              format: date-time
            sale_ends_at:
              type: string
              format: date-time
            max_per_order:
              type: integer
            description:
              type: string
    responses:
      200:
        description: Ticket type updated
      400:
        description: Invalid update (e.g., decreasing quantity)
      403:
        description: Access denied
      404:
        description: Ticket type not found
    """
    ticket_type = TicketType.query.get(ticket_type_id)

    if not ticket_type:
        return jsonify({'error': 'Not Found', 'message': 'Ticket type not found'}), 404

    if not check_event_access(str(ticket_type.event_id)):
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have access to this event'
        }), 403

    data = request.get_json()
    old_values = {}

    # Update allowed fields
    if 'is_active' in data:
        old_values['is_active'] = ticket_type.is_active
        ticket_type.is_active = data['is_active']

    if 'quantity_total' in data:
        new_quantity = data['quantity_total']
        if new_quantity < ticket_type.quantity_sold:
            return jsonify({
                'error': 'Bad Request',
                'message': f'Cannot set quantity below sold amount ({ticket_type.quantity_sold})'
            }), 400
        old_values['quantity_total'] = ticket_type.quantity_total
        ticket_type.quantity_total = new_quantity

    if 'sale_starts_at' in data:
        old_values['sale_starts_at'] = ticket_type.sale_starts_at.isoformat() if ticket_type.sale_starts_at else None
        ticket_type.sale_starts_at = datetime.fromisoformat(data['sale_starts_at']) if data['sale_starts_at'] else None

    if 'sale_ends_at' in data:
        old_values['sale_ends_at'] = ticket_type.sale_ends_at.isoformat() if ticket_type.sale_ends_at else None
        ticket_type.sale_ends_at = datetime.fromisoformat(data['sale_ends_at']) if data['sale_ends_at'] else None

    if 'max_per_order' in data:
        old_values['max_per_order'] = ticket_type.max_per_order
        ticket_type.max_per_order = max(1, min(20, data['max_per_order']))

    if 'description' in data:
        old_values['description'] = ticket_type.description
        ticket_type.description = data['description']

    # Audit log
    if old_values:
        audit = AuditLog(
            action='ticket_type.update',
            entity_type='ticket_type',
            entity_id=ticket_type.id,
            ip_address=g.get('ip_address'),
            user_agent_hash=g.get('user_agent_hash'),
            old_values=old_values,
            new_values={k: getattr(ticket_type, k) for k in old_values.keys()}
        )
        db.session.add(audit)

    db.session.commit()

    return jsonify({
        'ticket_type': ticket_type.to_dict(include_internal=True),
        'message': 'Ticket type updated'
    })


# =============================================================================
# DISCOUNT CODE STATS
# =============================================================================

@admin_bp.route('/admin/events/<event_id>/discount-stats', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
def get_discount_stats(event_id):
    """
    Get discount code usage statistics for an event
    ---
    tags:
      - Admin
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: event_id
        in: path
        type: string
        format: uuid
        required: true
    responses:
      200:
        description: Discount statistics
    """
    if not check_event_access(event_id):
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have access to this event'
        }), 403

    # Get all discount codes applicable to this event
    codes = DiscountCode.query.filter(
        (DiscountCode.event_id == event_id) | (DiscountCode.event_id.is_(None))
    ).all()

    code_stats = []
    total_discount_given = 0

    for code in codes:
        # Get usages for this event
        usages = db.session.query(
            func.count(DiscountCodeUsage.id).label('count'),
            func.sum(DiscountCodeUsage.discount_amount_cents).label('total')
        ).join(Order).filter(
            DiscountCodeUsage.discount_code_id == code.id,
            Order.event_id == event_id
        ).first()

        usage_count = usages.count or 0
        discount_amount = usages.total or 0
        total_discount_given += discount_amount

        if usage_count > 0:  # Only include codes that were used
            code_stats.append({
                'code': code.code,
                'discount_type': code.discount_type,
                'discount_value': code.discount_value,
                'uses': usage_count,
                'total_discount_cents': discount_amount,
                'is_active': code.is_active,
                'max_uses': code.max_uses,
                'current_uses': code.current_uses
            })

    return jsonify({
        'event_id': event_id,
        'total_discount_given_cents': total_discount_given,
        'codes_used_count': len(code_stats),
        'codes': sorted(code_stats, key=lambda x: x['total_discount_cents'], reverse=True)
    })


# =============================================================================
# CHECKIN DETAILS
# =============================================================================

@admin_bp.route('/admin/events/<event_id>/checkins', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
def get_checkin_details(event_id):
    """
    Get detailed check-in/validation logs
    ---
    tags:
      - Admin
    security:
      - ApiKeyAuth: []
      - BearerAuth: []
    parameters:
      - name: event_id
        in: path
        type: string
        format: uuid
        required: true
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 50
      - name: result
        in: query
        type: string
        enum: [valid, already_used, invalid_signature, invalid_status, wrong_event, not_found]
    responses:
      200:
        description: Check-in logs
    """
    if not check_event_access(event_id):
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have access to this event'
        }), 403

    page = int(request.args.get('page', 1))
    per_page = min(int(request.args.get('per_page', 50)), 100)
    result_filter = request.args.get('result')

    query = Validation.query.filter_by(event_id=event_id)

    if result_filter:
        query = query.filter_by(result=result_filter)

    total = query.count()

    validations = query.order_by(desc(Validation.scanned_at)).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    # Enrich with ticket type info
    validation_data = []
    for v in validations:
        data = v.to_dict()
        if v.ticket:
            data['ticket_type_name'] = v.ticket.ticket_type.name
            data['ticket_owner_id'] = str(v.ticket.owner_id)
        validation_data.append(data)

    return jsonify({
        'validations': validation_data,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    })
