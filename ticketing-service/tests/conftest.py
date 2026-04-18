"""
Pytest fixtures for ticketing service tests.
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from flask_jwt_extended import create_access_token

from app import create_app, db
from app.models.ticket import ApiClient, Order, OrderItem, Ticket, TicketType
from app.utils.security import generate_qr_secret


@pytest.fixture
def app():
    """Create application for testing."""
    app = create_app('testing')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create CLI runner."""
    return app.test_cli_runner()


@pytest.fixture
def api_client(app):
    """Create an active ApiClient in the DB and return (client_record, raw_key)."""
    raw_key = 'rt_live_test_key_abc123'
    key_hash = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()
    record = ApiClient(
        name='Test Client',
        api_key_hash=key_hash,
        is_active=True,
        rate_limit_per_minute=100,
    )
    db.session.add(record)
    db.session.commit()
    return record, raw_key


@pytest.fixture
def user_jwt(app):
    """Return (jwt_token, user_id) for a test user."""
    user_id = str(uuid.uuid4())
    with app.app_context():
        token = create_access_token(identity=user_id)
    return token, user_id


@pytest.fixture
def other_user_jwt(app):
    """Return (jwt_token, user_id) for a second distinct test user."""
    user_id = str(uuid.uuid4())
    with app.app_context():
        token = create_access_token(identity=user_id)
    return token, user_id


@pytest.fixture
def sample_ticket_type(app):
    """Create and return a TicketType with 100 available tickets."""
    event_id = uuid.uuid4()
    tt = TicketType(
        event_id=event_id,
        name='General Admission',
        price_cents=50000,
        currency='CZK',
        quantity_total=100,
        quantity_sold=0,
        quantity_reserved=0,
    )
    db.session.add(tt)
    db.session.commit()
    return tt


@pytest.fixture
def sample_order(app, api_client, sample_ticket_type):
    """Create a pending order owned by a specific user. Returns (order, user_id str)."""
    client_record, _ = api_client
    user_id = uuid.uuid4()
    order = Order(
        reference='ORD-TEST-001',
        user_id=user_id,
        event_id=sample_ticket_type.event_id,
        status='pending',
        total_cents=50000,
        subtotal_cents=50000,
        currency='CZK',
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        api_client_id=client_record.id,
    )
    db.session.add(order)
    db.session.flush()

    item = OrderItem(
        order_id=order.id,
        ticket_type_id=sample_ticket_type.id,
        quantity=1,
        unit_price_cents=50000,
    )
    db.session.add(item)
    db.session.commit()
    return order, str(user_id)


@pytest.fixture
def valid_ticket(app, sample_order, sample_ticket_type):
    """Create a valid ticket for the sample order. Returns (ticket, order, user_id str)."""
    order, user_id = sample_order
    ticket = Ticket(
        ticket_type_id=sample_ticket_type.id,
        order_id=order.id,
        owner_id=order.user_id,
        original_owner_id=order.user_id,
        status='valid',
        qr_secret=generate_qr_secret(),
    )
    db.session.add(ticket)
    db.session.commit()
    return ticket, order, user_id
