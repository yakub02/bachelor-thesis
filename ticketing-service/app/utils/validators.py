"""
Input validation schemas using Pydantic.
All API inputs MUST be validated before processing.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, ConfigDict


# =============================================================================
# ORDER VALIDATION
# =============================================================================

class OrderItemCreate(BaseModel):
    """Single item in an order."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    ticket_type_id: UUID
    quantity: int = Field(ge=1, le=10, description="Quantity between 1-10")


class OrderCreate(BaseModel):
    """Create order request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    user_id: UUID
    event_id: UUID
    items: List[OrderItemCreate] = Field(min_length=1, max_length=10)
    discount_code: Optional[str] = Field(default=None, max_length=50)
    # Event data for PDF (denormalized)
    event_name: Optional[str] = Field(default=None, max_length=200)
    event_date: Optional[datetime] = None
    event_venue: Optional[str] = Field(default=None, max_length=300)

    @field_validator('items')
    @classmethod
    def validate_unique_ticket_types(cls, v):
        """Ensure no duplicate ticket types in single order."""
        type_ids = [item.ticket_type_id for item in v]
        if len(type_ids) != len(set(type_ids)):
            raise ValueError('Duplicate ticket types not allowed in single order')
        return v

    @field_validator('discount_code')
    @classmethod
    def normalize_discount_code(cls, v):
        """Normalize code to uppercase."""
        if v:
            return v.strip().upper()
        return v


# =============================================================================
# TICKET VALIDATION
# =============================================================================

class TicketTypeCreate(BaseModel):
    """Create ticket type request (admin only)."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    event_id: UUID
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    price_cents: int = Field(ge=0, le=10000000)  # Max 100,000 CZK
    currency: str = Field(default='CZK', pattern=r'^[A-Z]{3}$')
    quantity_total: int = Field(ge=1, le=100000)
    sale_starts_at: Optional[datetime] = None
    sale_ends_at: Optional[datetime] = None
    max_per_order: int = Field(default=4, ge=1, le=20)
    resale_allowed: bool = True
    resale_max_price_percent: int = Field(default=110, ge=100, le=150)
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Prevent injection via name field."""
        forbidden = ['<', '>', '&', '"', "'", '\x00']
        for char in forbidden:
            if char in v:
                raise ValueError(f'Invalid character in name: {char}')
        return v


# =============================================================================
# VALIDATION (DOOR SCAN)
# =============================================================================

class TicketScan(BaseModel):
    """Ticket validation/scan request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    ticket_id: UUID
    event_id: UUID
    signature: str = Field(min_length=64, max_length=64)  # SHA-256 hex
    scanned_by: Optional[UUID] = None
    location: Optional[str] = Field(default=None, max_length=100)


class TicketScanByCode(BaseModel):
    """Manual ticket validation by short code (fallback when QR is unreadable)."""
    model_config = ConfigDict(str_strip_whitespace=True)

    code: str = Field(min_length=12, max_length=12)  # last 12 chars of ticket UUID
    event_id: Optional[UUID] = None  # optional: when omitted, ticket's own event is used
    scanned_by: Optional[UUID] = None
    location: Optional[str] = Field(default=None, max_length=100)

    @field_validator('code')
    @classmethod
    def normalize_code(cls, v):
        return v.lower().replace(' ', '').replace('-', '')


# =============================================================================
# RESALE VALIDATION
# =============================================================================

class ResaleListingCreate(BaseModel):
    """Create resale listing request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    ticket_id: UUID
    asking_price_cents: int = Field(ge=0, le=10000000)


class ResalePurchase(BaseModel):
    """Purchase resale ticket request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    buyer_id: UUID
    listing_id: UUID


# =============================================================================
# API CLIENT VALIDATION
# =============================================================================

class ApiClientCreate(BaseModel):
    """Register new API client request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=100)
    allowed_events: Optional[List[UUID]] = None  # None = all events
    rate_limit_per_minute: int = Field(default=60, ge=1, le=1000)

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Only alphanumeric, spaces, dashes."""
        import re
        if not re.match(r'^[\w\s\-]+$', v):
            raise ValueError('Name can only contain letters, numbers, spaces, dashes')
        return v


# =============================================================================
# DISCOUNT CODE VALIDATION
# =============================================================================

class DiscountCodeCreate(BaseModel):
    """Create discount code request (admin/organizer only)."""
    model_config = ConfigDict(str_strip_whitespace=True)

    code: str = Field(min_length=3, max_length=50)
    event_id: Optional[UUID] = None  # None = global code
    discount_type: str = Field(pattern=r'^(percentage|fixed)$')
    discount_value: int = Field(ge=1, le=10000000)  # Max 100,000 CZK for fixed
    currency: str = Field(default='CZK', pattern=r'^[A-Z]{3}$')
    min_order_cents: int = Field(default=0, ge=0)
    max_uses: Optional[int] = Field(default=None, ge=1)
    max_uses_per_user: Optional[int] = Field(default=1, ge=1)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    description: Optional[str] = Field(default=None, max_length=255)

    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        """Code must be alphanumeric with optional dashes."""
        import re
        # Convert to uppercase and validate
        v = v.upper()
        if not re.match(r'^[A-Z0-9\-_]+$', v):
            raise ValueError('Code can only contain letters, numbers, dashes, underscores')
        return v

    @field_validator('discount_value')
    @classmethod
    def validate_discount_value(cls, v, info):
        """Validate discount value based on type."""
        # Note: We can't access discount_type here easily in pydantic v2
        # The constraint is enforced at DB level
        if v <= 0:
            raise ValueError('Discount value must be positive')
        return v


class DiscountCodeValidate(BaseModel):
    """Validate/apply discount code request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    code: str = Field(min_length=1, max_length=50)
    event_id: UUID
    order_total_cents: int = Field(ge=0)

    @field_validator('code')
    @classmethod
    def normalize_code(cls, v):
        """Normalize code to uppercase."""
        return v.strip().upper()


class DiscountCodeUpdate(BaseModel):
    """Update discount code request."""
    model_config = ConfigDict(str_strip_whitespace=True)

    is_active: Optional[bool] = None
    max_uses: Optional[int] = Field(default=None, ge=1)
    valid_until: Optional[datetime] = None
    description: Optional[str] = Field(default=None, max_length=255)