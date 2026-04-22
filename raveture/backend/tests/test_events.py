"""
Event routes unit tests.
"""
import pytest
from app import db
from app.models.event import Event, Venue, Organizer
from app.models.user import User


def _make_organizer(client, app):
    """Helper: register organizer user, promote to organizer role, create Organizer record."""
    r = client.post('/api/v1/auth/register', json={
        'email': 'ev_org@example.com',
        'username': 'ev_org',
        'password': 'OrgPass123!',
    })
    token = r.get_json()['access_token']
    with app.app_context():
        user = User.query.filter_by(email='ev_org@example.com').first()
        user.role = 'organizer'
        user.is_organizer = True
        org = Organizer(
            user_id=user.id,
            name='Test Org',
            slug='test-org',
            description='desc',
        )
        db.session.add(org)
        db.session.commit()
        org_id = org.id
    headers = {'Authorization': f'Bearer {token}'}
    return headers, org_id


def _make_venue(app, user_email='ev_org@example.com'):
    """Helper: create a venue owned by a user."""
    with app.app_context():
        user = User.query.filter_by(email=user_email).first()
        venue = Venue(
            name='Test Venue',
            slug='test-venue',
            address='Test St 1',
            city='Prague',
            country='Czech Republic',
            capacity=200,
            created_by_id=user.id,
        )
        db.session.add(venue)
        db.session.commit()
        return venue.id


class TestListEvents:
    def test_list_events_returns_200(self, client):
        response = client.get('/api/v1/events')
        assert response.status_code == 200
        data = response.get_json()
        assert 'events' in data
        assert 'total' in data

    def test_list_events_empty_by_default(self, client):
        response = client.get('/api/v1/events')
        assert response.status_code == 200
        assert response.get_json()['total'] == 0


class TestGetEvent:
    def test_get_nonexistent_event_returns_404(self, client):
        response = client.get('/api/v1/events/nonexistent-slug')
        assert response.status_code == 404

    def test_get_event_by_slug(self, client, app):
        headers, org_id = _make_organizer(client, app)
        venue_id = _make_venue(app)

        r = client.post('/api/v1/events', headers=headers, json={
            'name': 'Slug Event',
            'description': 'desc',
            'starts_at': '2027-06-01T20:00:00',
            'ends_at': '2027-06-02T04:00:00',
            'venue_id': str(venue_id),
            'organizer_id': str(org_id),
            'genres': ['Techno'],
            'min_age': 18,
        })
        assert r.status_code == 201
        slug = r.get_json()['event']['slug']

        response = client.get(f'/api/v1/events/{slug}')
        assert response.status_code == 200
        assert response.get_json()['event']['slug'] == slug


class TestCreateEvent:
    def test_create_event_requires_auth(self, client):
        response = client.post('/api/v1/events', json={
            'name': 'No Auth Event',
        })
        assert response.status_code == 401

    def test_create_event_success(self, client, app):
        headers, org_id = _make_organizer(client, app)
        venue_id = _make_venue(app)

        response = client.post('/api/v1/events', headers=headers, json={
            'name': 'New Event',
            'description': 'A great event',
            'starts_at': '2027-07-01T20:00:00',
            'ends_at': '2027-07-02T04:00:00',
            'venue_id': str(venue_id),
            'organizer_id': str(org_id),
            'genres': ['House'],
            'min_age': 18,
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['event']['name'] == 'New Event'

    def test_create_event_missing_name_returns_400(self, client, app):
        headers, _ = _make_organizer(client, app)
        response = client.post('/api/v1/events', headers=headers, json={
            'description': 'No name event',
        })
        assert response.status_code == 400


class TestPublishCancelEvent:
    def test_publish_event_success(self, client, app):
        headers, org_id = _make_organizer(client, app)
        venue_id = _make_venue(app)

        r = client.post('/api/v1/events', headers=headers, json={
            'name': 'Draft Event',
            'description': 'desc',
            'starts_at': '2027-08-01T20:00:00',
            'ends_at': '2027-08-02T04:00:00',
            'venue_id': str(venue_id),
            'organizer_id': str(org_id),
            'genres': ['Trance'],
            'min_age': 18,
        })
        assert r.status_code == 201
        event_id = r.get_json()['event']['id']

        response = client.post(f'/api/v1/events/{event_id}/publish', headers=headers)
        assert response.status_code == 200
        assert response.get_json()['event']['status'] == 'published'

    def test_cancel_event_success(self, client, app):
        headers, org_id = _make_organizer(client, app)
        venue_id = _make_venue(app)

        r = client.post('/api/v1/events', headers=headers, json={
            'name': 'Cancel Event',
            'description': 'desc',
            'starts_at': '2027-09-01T20:00:00',
            'ends_at': '2027-09-02T04:00:00',
            'venue_id': str(venue_id),
            'organizer_id': str(org_id),
            'genres': ['Techno'],
            'min_age': 18,
        })
        assert r.status_code == 201
        event_id = r.get_json()['event']['id']

        client.post(f'/api/v1/events/{event_id}/publish', headers=headers, json={})
        response = client.post(f'/api/v1/events/{event_id}/cancel', headers=headers, json={})
        assert response.status_code == 200
        assert response.get_json()['event']['status'] == 'cancelled'
