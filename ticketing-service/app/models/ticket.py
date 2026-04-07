"""
Database models for RAVETURE Ticketing Service.
Security-first design with audit logging and proper constraints.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Index, CheckConstraint, event
from sqlalchemy.dialects.postgresql import UUID, ARRAY

from app import db


# =============================================================================
# TICKET TYPE MODEL
# =============================================================================

class TicketType(db.Model):
    """
    Defines ticket categories for an event (Early Bird, Regular, VIP).
    
    Security considerations:
    - quantity_sold uses CHECK constraint to prevent negative values
    - Optimistic locking via version column for concurrent updates
    """
    __tablename__ = 'ticket_types'
    __table_args__ = (
        # Prevent overselling at database level
        CheckConstraint(
            'quantity_sold >= 0 AND quantity_sold <= quantity_total',
            name='check_quantity_sold_valid'
        ),
        CheckConstraint(
            'quantity_reserved >= 0',
            name='check_quantity_reserved_positive'
        ),
        CheckConstraint(
            'price_cents >= 0',
            name='check_price_positive'
        ),
        CheckConstraint(
            'resale_max_price_percent >= 100 AND resale_max_price_percent <= 200',
            name='check_resale_percent_valid'
        ),
        # Index for common queries
        Index('idx_ticket_types_event_status', 'event_id', 'is_active'),
    )
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = db.Column(UUID(as_uuid=True), nullable=False, index=True)
    
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    price_cents = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(3), default='CZK', nullable=False)
    
    quantity_total = db.Column(db.Integer, nullable=False)
    quantity_sold = db.Column(db.Integer, default=0, nullable=False)
    quantity_reserved = db.Column(db.Integer, default=0, nullable=False)
    
    sale_starts_at = db.Column(db.DateTime(timezone=True))
    sale_ends_at = db.Column(db.DateTime(timezone=True))
    
    max_per_order = db.Column(db.Integer, default=4, nullable=False)
    
    resale_allowed = db.Column(db.Boolean, default=True, nullable=False)
    resale_max_price_percent = db.Column(db.Integer, default=110, nullable=False)
    
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Optimistic locking
    version = db.Column(db.Integer, default=1, nullable=False)
    
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tickets = db.relationship('Ticket', back_populates='ticket_type', lazy='dynamic')
    order_items = db.relationship('OrderItem', back_populates='ticket_type', lazy='dynamic')
    
    @property
    def quantity_available(self) -> int:
        """Calculate available tickets (thread-safe read)."""
        return max(0, self.quantity_total - self.quantity_sold - self.quantity_reserved)
    
    @property
    def is_on_sale(self) -> bool:
        """Check if tickets are currently on sale."""
        now = datetime.now(timezone.utc)
        if not self.is_active:
            return False
        if self.sale_starts_at and now < self.sale_starts_at:
            return False
        if self.sale_ends_at and now > self.sale_ends_at:
            return False
        return self.quantity_available > 0
    
    def to_dict(self, include_internal: bool = False) -> dict:
        """Convert to dictionary for JSON response."""
        data = {
            'id': str(self.id),
            'event_id': str(self.event_id),
            'name': self.name,
            'description': self.description,
            'price_cents': self.price_cents,
            'currency': self.currency,
            'quantity_available': self.quantity_available,
            'is_on_sale': self.is_on_sale,
            'sale_starts_at': self.sale_starts_at.isoformat() if self.sale_starts_at else None,
            'sale_ends_at': self.sale_ends_at.isoformat() if self.sale_ends_at else None,
            'max_per_order': self.max_per_order,
            'resale_allowed': self.resale_allowed
        }
        
        # Internal fields (admin only)
        if include_internal:
            data.update({
                'quantity_total': self.quantity_total,
                'quantity_sold': self.quantity_sold,
                'quantity_reserved': self.quantity_reserved,
                'resale_max_price_percent': self.resale_max_price_percent,
                'is_active': self.is_active,
                'version': self.version
            })
        
        return data


# =============================================================================
# TICKET MODEL
# =============================================================================

class Ticket(db.Model):
    """
    Individual ticket instance owned by a user.
    
    Security considerations:
    - qr_secret is unique per ticket, never exposed to client
    - status transitions are validated in application layer
    - transferred_count tracks resale history
    """
    __tablename__ = 'tickets'
    __table_args__ = (
        CheckConstraint(
            "status IN ('valid', 'used', 'invalidated', 'listed', 'transferred')",
            name='check_ticket_status_valid'
        ),
        CheckConstraint(
            'transferred_count >= 0',
            name='check_transferred_count_positive'
        ),
        Index('idx_tickets_owner_status', 'owner_id', 'status'),
        Index('idx_tickets_order', 'order_id'),
    )
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_type_id = db.Column(
        UUID(as_uuid=True), 
        db.ForeignKey('ticket_types.id', ondelete='RESTRICT'),
        nullable=False
    )
    order_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey('orders.id', ondelete='RESTRICT'),
        nullable=False
    )
    
    owner_id = db.Column(UUID(as_uuid=True), nullable=False, index=True)
    original_owner_id = db.Column(UUID(as_uuid=True), nullable=False)  # First buyer
    
    status = db.Column(db.String(20), default='valid', nullable=False)
    
    # QR Security - NEVER expose qr_secret to client
    qr_secret = db.Column(db.String(64), nullable=False, unique=True)
    
    issued_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    used_at = db.Column(db.DateTime(timezone=True))
    invalidated_at = db.Column(db.DateTime(timezone=True))
    
    # Resale tracking
    transferred_count = db.Column(db.Integer, default=0, nullable=False)
    last_transferred_at = db.Column(db.DateTime(timezone=True))
    
    # Relationships
    ticket_type = db.relationship('TicketType', back_populates='tickets')
    order = db.relationship('Order', back_populates='tickets')
    validations = db.relationship('Validation', back_populates='ticket', lazy='dynamic')
    resale_listing = db.relationship('ResaleListing', back_populates='ticket', uselist=False)
    
    # Valid status transitions
    VALID_TRANSITIONS = {
        'valid': ['used', 'invalidated', 'listed'],
        'listed': ['valid', 'transferred', 'invalidated'],
        'transferred': ['valid'],  # After transfer, becomes valid for new owner
        'used': [],  # Terminal state
        'invalidated': []  # Terminal state
    }
    
    def can_transition_to(self, new_status: str) -> bool:
        """Check if status transition is allowed."""
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])
    
    def to_dict(self, include_qr: bool = False) -> dict:
        """Convert to dictionary for JSON response."""
        data = {
            'id': str(self.id),
            'ticket_type_id': str(self.ticket_type_id),
            'order_id': str(self.order_id),
            'owner_id': str(self.owner_id),
            'status': self.status,
            'issued_at': self.issued_at.isoformat(),
            'used_at': self.used_at.isoformat() if self.used_at else None,
            'transferred_count': self.transferred_count
        }

        # Include ticket type name, event info and resale fields
        if self.ticket_type:
            data['ticket_type_name'] = self.ticket_type.name
            data['event_id'] = str(self.ticket_type.event_id)
            data['price_cents'] = self.ticket_type.price_cents
            data['currency'] = self.ticket_type.currency
            data['resale_allowed'] = self.ticket_type.resale_allowed
            data['resale_max_price_percent'] = self.ticket_type.resale_max_price_percent

        # Include ticket code for display
        if self.status in ['valid', 'used', 'listed']:
            data['code'] = str(self.id)[-12:]

        # Include active resale listing info for listed tickets
        if self.status == 'listed' and self.resale_listing and self.resale_listing.status == 'active':
            data['resale_listing'] = {
                'id': str(self.resale_listing.id),
                'asking_price_cents': self.resale_listing.asking_price_cents,
                'original_price_cents': self.resale_listing.original_price_cents,
                'listed_at': self.resale_listing.listed_at.isoformat(),
            }

        # QR data only when explicitly requested and ticket is valid
        if include_qr and self.status == 'valid':
            from app.utils.security import generate_qr_payload
            from flask import current_app

            qr_payload = generate_qr_payload(
                ticket_id=str(self.id),
                event_id=str(self.ticket_type.event_id),
                qr_secret=self.qr_secret,
                signing_key=current_app.config['QR_SIGNING_KEY']
            )
            data['qr'] = qr_payload

        return data


# =============================================================================
# ORDER MODEL
# =============================================================================

class Order(db.Model):
    """
    Purchase record with expiration for reservations.
    
    Security considerations:
    - expires_at enforced at DB level
    - payment_reference never contains full card numbers
    """
    __tablename__ = 'orders'
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'cancelled', 'refunded', 'expired')",
            name='check_order_status_valid'
        ),
        CheckConstraint(
            'total_cents >= 0',
            name='check_total_positive'
        ),
        Index('idx_orders_user_status', 'user_id', 'status'),
        Index('idx_orders_event', 'event_id'),
        Index('idx_orders_expires', 'expires_at', postgresql_where=db.text("status = 'pending'")),
    )
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference = db.Column(db.String(30), unique=True, nullable=False)  # Human-readable
    
    user_id = db.Column(UUID(as_uuid=True), nullable=False, index=True)
    event_id = db.Column(UUID(as_uuid=True), nullable=False)
    
    status = db.Column(db.String(20), default='pending', nullable=False)
    
    total_cents = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(3), default='CZK', nullable=False)
    
    # Payment info (no sensitive data!)
    payment_method = db.Column(db.String(50))
    payment_reference = db.Column(db.String(200))  # Transaction ID only

    # Discount applied
    discount_code_id = db.Column(UUID(as_uuid=True), db.ForeignKey('discount_codes.id'), nullable=True)
    discount_cents = db.Column(db.Integer, default=0, nullable=False)  # Discount amount applied
    subtotal_cents = db.Column(db.Integer, nullable=False)  # Original total before discount
    
    # Timestamps
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    confirmed_at = db.Column(db.DateTime(timezone=True))
    cancelled_at = db.Column(db.DateTime(timezone=True))
    
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Client tracking (for multi-tenant)
    api_client_id = db.Column(UUID(as_uuid=True), db.ForeignKey('api_clients.id'))
    
    # IP tracking for fraud prevention
    ip_address = db.Column(db.String(45))  # IPv6 max length
    user_agent_hash = db.Column(db.String(64))  # SHA-256 of user agent
    
    # Relationships
    items = db.relationship('OrderItem', back_populates='order', lazy='dynamic')
    tickets = db.relationship('Ticket', back_populates='order', lazy='dynamic')
    api_client = db.relationship('ApiClient', back_populates='orders')
    
    @property
    def is_expired(self) -> bool:
        """Check if pending order has expired."""
        if self.status != 'pending':
            return False
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return now > expires
    
    def to_dict(self, include_items: bool = False) -> dict:
        data = {
            'id': str(self.id),
            'reference': self.reference,
            'user_id': str(self.user_id),
            'event_id': str(self.event_id),
            'status': self.status,
            'subtotal_cents': self.subtotal_cents,
            'discount_cents': self.discount_cents,
            'total_cents': self.total_cents,
            'currency': self.currency,
            'expires_at': self.expires_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }

        if self.discount_code_id:
            data['discount_code_id'] = str(self.discount_code_id)

        if self.confirmed_at:
            data['confirmed_at'] = self.confirmed_at.isoformat()

        if include_items:
            data['items'] = [item.to_dict() for item in self.items]

        return data


# =============================================================================
# ORDER ITEM MODEL
# =============================================================================

class OrderItem(db.Model):
    """Line item in an order."""
    __tablename__ = 'order_items'
    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_quantity_positive'),
        CheckConstraint('unit_price_cents >= 0', name='check_unit_price_positive'),
    )
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey('orders.id', ondelete='CASCADE'),
        nullable=False
    )
    ticket_type_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey('ticket_types.id', ondelete='RESTRICT'),
        nullable=False
    )
    
    quantity = db.Column(db.Integer, nullable=False)
    unit_price_cents = db.Column(db.Integer, nullable=False)  # Price at time of purchase
    
    # Relationships
    order = db.relationship('Order', back_populates='items')
    ticket_type = db.relationship('TicketType', back_populates='order_items')
    
    @property
    def subtotal_cents(self) -> int:
        return self.quantity * self.unit_price_cents
    
    def to_dict(self) -> dict:
        return {
            'id': str(self.id),
            'ticket_type_id': str(self.ticket_type_id),
            'ticket_type_name': self.ticket_type.name if self.ticket_type else None,
            'quantity': self.quantity,
            'unit_price_cents': self.unit_price_cents,
            'subtotal_cents': self.subtotal_cents
        }


# =============================================================================
# RESALE LISTING MODEL
# =============================================================================

class ResaleListing(db.Model):
    """
    Active resale offers in P2P marketplace.
    
    Security: Price cap enforced at application layer (not DB)
    because it depends on ticket_type.resale_max_price_percent.
    """
    __tablename__ = 'resale_listings'
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'sold', 'cancelled', 'expired')",
            name='check_listing_status_valid'
        ),
        CheckConstraint(
            'asking_price_cents > 0',
            name='check_asking_price_positive'
        ),
        Index('idx_resale_active_event', 'event_id', postgresql_where=db.text("status = 'active'")),
    )
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey('tickets.id', ondelete='CASCADE'),
        unique=True,
        nullable=False
    )
    
    seller_id = db.Column(UUID(as_uuid=True), nullable=False, index=True)
    event_id = db.Column(UUID(as_uuid=True), nullable=False)  # Denormalized for queries
    
    asking_price_cents = db.Column(db.Integer, nullable=False)
    original_price_cents = db.Column(db.Integer, nullable=False)  # For reference
    
    status = db.Column(db.String(20), default='active', nullable=False)
    
    buyer_id = db.Column(UUID(as_uuid=True))  # Set when sold
    
    listed_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    sold_at = db.Column(db.DateTime(timezone=True))
    expires_at = db.Column(db.DateTime(timezone=True))  # Optional listing expiration
    
    # Relationships
    ticket = db.relationship('Ticket', back_populates='resale_listing')
    
    def to_dict(self) -> dict:
        data = {
            'id': str(self.id),
            'ticket_id': str(self.ticket_id),
            'event_id': str(self.event_id),
            'asking_price_cents': self.asking_price_cents,
            'original_price_cents': self.original_price_cents,
            'status': self.status,
            'listed_at': self.listed_at.isoformat()
        }

        # Include ticket type info for marketplace display
        if self.ticket and self.ticket.ticket_type:
            data['ticket_type_name'] = self.ticket.ticket_type.name
            data['currency'] = self.ticket.ticket_type.currency

        return data


# =============================================================================
# VALIDATION MODEL (Door Entry Log)
# =============================================================================

class Validation(db.Model):
    """
    Entry scan log - every scan attempt is recorded.
    Immutable audit trail.
    """
    __tablename__ = 'validations'
    __table_args__ = (
        CheckConstraint(
            "result IN ('valid', 'already_used', 'invalid_signature', 'invalid_status', 'wrong_event', 'not_found')",
            name='check_validation_result_valid'
        ),
        Index('idx_validations_event_time', 'event_id', 'scanned_at'),
        Index('idx_validations_ticket', 'ticket_id'),
    )
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    ticket_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tickets.id'))  # Nullable for not_found
    event_id = db.Column(UUID(as_uuid=True), nullable=False)
    
    result = db.Column(db.String(20), nullable=False)
    result_details = db.Column(db.String(200))  # Additional context
    
    scanned_by = db.Column(UUID(as_uuid=True))  # Staff user ID
    location = db.Column(db.String(100))  # "Main Entrance", "VIP Gate"
    
    # Request metadata
    ip_address = db.Column(db.String(45))
    user_agent_hash = db.Column(db.String(64))
    
    scanned_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    ticket = db.relationship('Ticket', back_populates='validations')
    
    def to_dict(self) -> dict:
        return {
            'id': str(self.id),
            'ticket_id': str(self.ticket_id) if self.ticket_id else None,
            'event_id': str(self.event_id),
            'result': self.result,
            'location': self.location,
            'scanned_at': self.scanned_at.isoformat()
        }


# =============================================================================
# API CLIENT MODEL (Multi-tenant)
# =============================================================================

class ApiClient(db.Model):
    """
    External API client credentials (e.g., PSYCHOSOUND).
    
    Security:
    - API key is hashed (SHA-256), never stored raw
    - Rate limiting per client
    - Optional event restrictions
    """
    __tablename__ = 'api_clients'
    __table_args__ = (
        CheckConstraint(
            'rate_limit_per_minute > 0 AND rate_limit_per_minute <= 1000',
            name='check_rate_limit_valid'
        ),
    )
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    name = db.Column(db.String(100), nullable=False)
    api_key_hash = db.Column(db.String(64), nullable=False, unique=True)
    
    # Restrictions
    allowed_events = db.Column(ARRAY(UUID(as_uuid=True)))  # NULL = all events
    rate_limit_per_minute = db.Column(db.Integer, default=60, nullable=False)
    
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Metadata
    contact_email = db.Column(db.String(255))
    webhook_url = db.Column(db.String(500))  # For order notifications
    
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    last_used_at = db.Column(db.DateTime(timezone=True))
    
    # Relationships
    orders = db.relationship('Order', back_populates='api_client', lazy='dynamic')
    
    def can_access_event(self, event_id: str) -> bool:
        """Check if client can access specific event."""
        if self.allowed_events is None:
            return True
        return uuid.UUID(event_id) in self.allowed_events
    
    def to_dict(self) -> dict:
        return {
            'id': str(self.id),
            'name': self.name,
            'is_active': self.is_active,
            'rate_limit_per_minute': self.rate_limit_per_minute,
            'allowed_events': [str(e) for e in self.allowed_events] if self.allowed_events else None,
            'created_at': self.created_at.isoformat()
        }


# =============================================================================
# AUDIT LOG MODEL (Security Trail)
# =============================================================================

class AuditLog(db.Model):
    """
    Immutable audit log for security-sensitive operations.
    Never delete records from this table.
    """
    __tablename__ = 'audit_logs'
    __table_args__ = (
        Index('idx_audit_entity', 'entity_type', 'entity_id'),
        Index('idx_audit_user', 'user_id'),
        Index('idx_audit_time', 'created_at'),
    )
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # What happened
    action = db.Column(db.String(50), nullable=False)  # e.g., 'ticket.validate', 'order.confirm'
    entity_type = db.Column(db.String(50), nullable=False)  # e.g., 'ticket', 'order'
    entity_id = db.Column(UUID(as_uuid=True), nullable=False)
    
    # Who did it
    user_id = db.Column(UUID(as_uuid=True))  # Can be NULL for system actions
    api_client_id = db.Column(UUID(as_uuid=True))
    
    # Context
    ip_address = db.Column(db.String(45))
    user_agent_hash = db.Column(db.String(64))
    
    # What changed (JSON)
    old_values = db.Column(db.JSON)
    new_values = db.Column(db.JSON)
    
    # Metadata
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)


# =============================================================================
# EVENT LISTENERS (Automatic Audit Logging)
# =============================================================================

def log_ticket_status_change(mapper, connection, target):
    """Log ticket status changes automatically."""
    from sqlalchemy import inspect
    
    state = inspect(target)
    
    # Check if status changed
    history = state.attrs.status.history
    if history.has_changes() and history.deleted:
        old_status = history.deleted[0]
        new_status = target.status
        
        # Insert audit log
        connection.execute(
            AuditLog.__table__.insert().values(
                action='ticket.status_change',
                entity_type='ticket',
                entity_id=target.id,
                user_id=target.owner_id,
                old_values={'status': old_status},
                new_values={'status': new_status}
            )
        )


# Register event listener
event.listen(Ticket, 'after_update', log_ticket_status_change)


# =============================================================================
# DISCOUNT CODE MODEL
# =============================================================================

class DiscountCode(db.Model):
    """
    Promotional discount codes for events.

    Supports:
    - Percentage discounts (e.g., 20% off)
    - Fixed amount discounts (e.g., 100 CZK off)
    - Usage limits (max uses, uses per user)
    - Time-limited validity
    - Event-specific or global codes
    """
    __tablename__ = 'discount_codes'
    __table_args__ = (
        CheckConstraint(
            "discount_type IN ('percentage', 'fixed')",
            name='check_discount_type_valid'
        ),
        CheckConstraint(
            'discount_value > 0',
            name='check_discount_value_positive'
        ),
        CheckConstraint(
            'max_uses IS NULL OR max_uses > 0',
            name='check_max_uses_positive'
        ),
        CheckConstraint(
            'current_uses >= 0',
            name='check_current_uses_non_negative'
        ),
        CheckConstraint(
            'max_uses_per_user IS NULL OR max_uses_per_user > 0',
            name='check_max_uses_per_user_positive'
        ),
        # Percentage must be <= 100
        CheckConstraint(
            "discount_type != 'percentage' OR discount_value <= 100",
            name='check_percentage_max_100'
        ),
        Index('idx_discount_codes_code', 'code', unique=True),
        Index('idx_discount_codes_event', 'event_id'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Code itself - case insensitive, stored uppercase
    code = db.Column(db.String(50), nullable=False, unique=True)

    # Optional event restriction (NULL = all events)
    event_id = db.Column(UUID(as_uuid=True), nullable=True, index=True)

    # Discount configuration
    discount_type = db.Column(db.String(20), nullable=False)  # 'percentage' or 'fixed'
    discount_value = db.Column(db.Integer, nullable=False)  # percentage (1-100) or cents
    currency = db.Column(db.String(3), default='CZK', nullable=False)  # For fixed discounts

    # Optional: minimum order amount for code to be valid
    min_order_cents = db.Column(db.Integer, default=0, nullable=False)

    # Usage limits
    max_uses = db.Column(db.Integer, nullable=True)  # NULL = unlimited
    current_uses = db.Column(db.Integer, default=0, nullable=False)
    max_uses_per_user = db.Column(db.Integer, default=1, nullable=True)  # NULL = unlimited

    # Time validity
    valid_from = db.Column(db.DateTime(timezone=True), nullable=True)
    valid_until = db.Column(db.DateTime(timezone=True), nullable=True)

    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Metadata
    description = db.Column(db.String(255))  # Internal note, e.g., "Friends & Family"
    created_by = db.Column(UUID(as_uuid=True))  # Organizer who created it

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    usages = db.relationship('DiscountCodeUsage', back_populates='discount_code', lazy='dynamic')

    @property
    def is_valid(self) -> bool:
        """Check if code is currently usable."""
        if not self.is_active:
            return False

        now = datetime.now(timezone.utc)

        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        if self.max_uses is not None and self.current_uses >= self.max_uses:
            return False

        return True

    @property
    def uses_remaining(self) -> Optional[int]:
        """Get remaining uses, or None if unlimited."""
        if self.max_uses is None:
            return None
        return max(0, self.max_uses - self.current_uses)

    def calculate_discount(self, order_total_cents: int) -> int:
        """Calculate discount amount in cents."""
        if self.discount_type == 'percentage':
            return int(order_total_cents * self.discount_value / 100)
        else:  # fixed
            return min(self.discount_value, order_total_cents)  # Can't exceed order total

    def can_use_for_event(self, event_id: str) -> bool:
        """Check if code applies to specific event."""
        if self.event_id is None:
            return True  # Global code
        return str(self.event_id) == str(event_id)

    def user_uses_count(self, user_id: str) -> int:
        """Get number of times user has used this code."""
        return DiscountCodeUsage.query.filter_by(
            discount_code_id=self.id,
            user_id=user_id
        ).count()

    def can_user_use(self, user_id: str) -> bool:
        """Check if user can still use this code."""
        if self.max_uses_per_user is None:
            return True
        return self.user_uses_count(user_id) < self.max_uses_per_user

    def to_dict(self, include_internal: bool = False) -> dict:
        """Convert to dictionary for JSON response."""
        data = {
            'id': str(self.id),
            'code': self.code,
            'discount_type': self.discount_type,
            'discount_value': self.discount_value,
            'currency': self.currency,
            'is_valid': self.is_valid,
            'valid_from': self.valid_from.isoformat() if self.valid_from else None,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
        }

        if include_internal:
            data.update({
                'event_id': str(self.event_id) if self.event_id else None,
                'min_order_cents': self.min_order_cents,
                'max_uses': self.max_uses,
                'current_uses': self.current_uses,
                'uses_remaining': self.uses_remaining,
                'max_uses_per_user': self.max_uses_per_user,
                'is_active': self.is_active,
                'description': self.description,
                'created_at': self.created_at.isoformat()
            })

        return data


class DiscountCodeUsage(db.Model):
    """
    Tracks individual uses of discount codes.
    Used to enforce per-user limits and provide usage analytics.
    """
    __tablename__ = 'discount_code_usages'
    __table_args__ = (
        Index('idx_discount_usage_code_user', 'discount_code_id', 'user_id'),
        Index('idx_discount_usage_order', 'order_id'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    discount_code_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey('discount_codes.id', ondelete='CASCADE'),
        nullable=False
    )
    order_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey('orders.id', ondelete='CASCADE'),
        nullable=False
    )
    user_id = db.Column(UUID(as_uuid=True), nullable=False)

    # Snapshot of discount applied
    discount_amount_cents = db.Column(db.Integer, nullable=False)

    used_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    discount_code = db.relationship('DiscountCode', back_populates='usages')
    order = db.relationship('Order', backref='discount_usage')

    def to_dict(self) -> dict:
        return {
            'id': str(self.id),
            'discount_code_id': str(self.discount_code_id),
            'order_id': str(self.order_id),
            'user_id': str(self.user_id),
            'discount_amount_cents': self.discount_amount_cents,
            'used_at': self.used_at.isoformat()
        }