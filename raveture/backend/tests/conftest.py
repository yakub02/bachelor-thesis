"""
Pytest fixtures for RAVETURE Backend tests.
"""

import pytest
from app import create_app, db


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
def auth_headers(client):
    """Create authenticated user and return headers."""
    # Register user
    response = client.post('/api/v1/auth/register', json={
        'email': 'test@example.com',
        'username': 'testuser',
        'password': 'TestPass123',
    })

    data = response.get_json()
    token = data.get('access_token')

    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def organizer_headers(client):
    """Create authenticated organizer user and return headers."""
    response = client.post('/api/v1/auth/register', json={
        'email': 'organizer@example.com',
        'username': 'organizeruser',
        'password': 'OrganizerPass123',
    })
    data = response.get_json()
    token = data.get('access_token')

    # Promote to organizer directly in DB
    from app import db
    from app.models import User
    with client.application.app_context():
        user = User.query.filter_by(email='organizer@example.com').first()
        user.role = 'organizer'
        user.is_organizer = True
        db.session.commit()

    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def admin_headers(client):
    """Create authenticated admin user and return headers."""
    response = client.post('/api/v1/auth/register', json={
        'email': 'admin@example.com',
        'username': 'adminuser',
        'password': 'AdminPass123',
    })
    data = response.get_json()
    token = data.get('access_token')

    from app import db
    from app.models import User
    with client.application.app_context():
        user = User.query.filter_by(email='admin@example.com').first()
        user.role = 'admin'
        db.session.commit()

    return {'Authorization': f'Bearer {token}'}
