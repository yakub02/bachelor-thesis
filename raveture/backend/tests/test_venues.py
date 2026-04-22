"""
Venue routes unit tests.
"""
import pytest
from app import db
from app.models.event import Venue, Organizer
from app.models.user import User


def _make_organizer(client, app):
    """Helper: register an organizer user, promote to organizer role, and create Organizer record."""
    r = client.post('/api/v1/auth/register', json={
        'email': 'venue_org@example.com',
        'username': 'venue_org',
        'password': 'OrgPass123!',
    })
    token = r.get_json()['access_token']
    with app.app_context():
        user = User.query.filter_by(email='venue_org@example.com').first()
        user.role = 'organizer'
        user.is_organizer = True
        org = Organizer(
            user_id=user.id,
            name='Venue Test Org',
            slug='venue-test-org',
        )
        db.session.add(org)
        db.session.commit()
    headers = {'Authorization': f'Bearer {token}'}
    return headers


def _create_venue_directly(app, email='venue_org@example.com'):
    """Helper: create a venue directly in the DB and return its id and slug."""
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        venue = Venue(
            name='Direct Venue',
            slug='direct-venue',
            address='Main St 1',
            city='Prague',
            country='CZ',
            capacity=300,
            created_by_id=user.id,
        )
        db.session.add(venue)
        db.session.commit()
        return venue.id, venue.slug


class TestListVenues:
    def test_list_venues_returns_200(self, client):
        response = client.get('/api/v1/venues')
        assert response.status_code == 200
        data = response.get_json()
        assert 'venues' in data

    def test_list_venues_empty_initially(self, client):
        response = client.get('/api/v1/venues')
        assert response.status_code == 200
        assert response.get_json()['venues'] == []


class TestCreateVenue:
    def test_create_venue_requires_auth(self, client):
        response = client.post('/api/v1/venues', json={
            'name': 'Some Venue',
            'city': 'Brno',
        })
        assert response.status_code == 401

    def test_create_venue_success(self, client, app):
        headers = _make_organizer(client, app)
        response = client.post('/api/v1/venues', headers=headers, json={
            'name': 'New Venue',
            'city': 'Prague',
            'address': 'Test Street 5',
            'country': 'CZ',
            'capacity': 500,
        })
        assert response.status_code == 201
        data = response.get_json()
        assert 'venue' in data
        assert data['venue']['name'] == 'New Venue'
        assert data['venue']['city'] == 'Prague'
        assert data['message'] == 'Venue created'

    def test_create_venue_missing_required_field_returns_400(self, client, app):
        headers = _make_organizer(client, app)
        # Missing 'city' which is required
        response = client.post('/api/v1/venues', headers=headers, json={
            'name': 'No City Venue',
        })
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data


class TestGetVenue:
    def test_get_nonexistent_venue_returns_404(self, client):
        response = client.get('/api/v1/venues/nonexistent-slug')
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data

    def test_get_venue_by_slug(self, client, app):
        headers = _make_organizer(client, app)
        venue_id, slug = _create_venue_directly(app)

        response = client.get(f'/api/v1/venues/{slug}')
        assert response.status_code == 200
        data = response.get_json()
        assert 'venue' in data
        assert data['venue']['slug'] == slug


class TestUpdateDeleteVenue:
    def test_update_venue_success(self, client, app):
        headers = _make_organizer(client, app)
        venue_id, slug = _create_venue_directly(app)

        response = client.put(f'/api/v1/venues/{venue_id}', headers=headers, json={
            'city': 'Brno',
            'capacity': 400,
        })
        assert response.status_code == 200
        data = response.get_json()
        assert data['venue']['city'] == 'Brno'
        assert data['venue']['capacity'] == 400
        assert data['message'] == 'Venue updated'

    def test_delete_venue_success(self, client, app):
        headers = _make_organizer(client, app)
        venue_id, slug = _create_venue_directly(app)

        response = client.delete(f'/api/v1/venues/{venue_id}', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Venue deleted'
        assert data['venue_id'] == str(venue_id)

        # Confirm it's soft-deleted (no longer in active list)
        list_resp = client.get('/api/v1/venues')
        venues = list_resp.get_json()['venues']
        venue_ids = [v['id'] for v in venues]
        assert str(venue_id) not in venue_ids
