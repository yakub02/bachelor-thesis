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
