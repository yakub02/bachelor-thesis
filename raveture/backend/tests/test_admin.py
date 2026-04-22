"""
Unit tests for admin routes – Task 5.
Covers: GET /users, POST /users/<id>/ban, POST /users/<id>/unban,
        PUT /users/<id>/role, GET /stats
"""

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_admin(client, app):
    """Register a new user and promote them to admin. Returns auth headers."""
    r = client.post('/api/v1/auth/register', json={
        'email': 'admin_test@example.com',
        'username': 'admin_test',
        'password': 'AdminPass123!',
    })
    token = r.get_json()['access_token']
    with app.app_context():
        from app import db
        from app.models.user import User
        user = User.query.filter_by(email='admin_test@example.com').first()
        user.role = 'admin'
        db.session.commit()
    return {'Authorization': f'Bearer {token}'}


def _make_regular_user(client):
    """Register a regular user and return their id."""
    r = client.post('/api/v1/auth/register', json={
        'email': 'regular_target@example.com',
        'username': 'regular_target',
        'password': 'RegPass123!',
    })
    return r.get_json()['user']['id']


# ---------------------------------------------------------------------------
# Test class
# ---------------------------------------------------------------------------

class TestAdminUserManagement:

    def test_get_all_users_requires_admin(self, client, app):
        """Non-admin (regular user) should receive 403."""
        # Register a plain user and get their token
        r = client.post('/api/v1/auth/register', json={
            'email': 'nonadmin@example.com',
            'username': 'nonadmin',
            'password': 'NoAdmin123!',
        })
        token = r.get_json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        resp = client.get('/api/v1/admin/users', headers=headers)
        assert resp.status_code == 403

    def test_get_all_users_as_admin(self, client, app):
        """Admin should receive 200 with a 'users' key in the response."""
        headers = _make_admin(client, app)

        resp = client.get('/api/v1/admin/users', headers=headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'users' in data

    def test_ban_user_success(self, client, app):
        """Admin banning an existing user should return 200."""
        headers = _make_admin(client, app)
        target_id = _make_regular_user(client)

        resp = client.post(f'/api/v1/admin/users/{target_id}/ban', headers=headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'banned' in data.get('message', '').lower()

    def test_unban_user_success(self, client, app):
        """Admin unbanning a previously banned user should return 200."""
        headers = _make_admin(client, app)
        target_id = _make_regular_user(client)

        # First ban the user
        client.post(f'/api/v1/admin/users/{target_id}/ban', headers=headers)

        # Then unban
        resp = client.post(f'/api/v1/admin/users/{target_id}/unban', headers=headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'unbanned' in data.get('message', '').lower()

    def test_update_user_role_success(self, client, app):
        """Admin updating a user's role to 'moderator' should return 200."""
        headers = _make_admin(client, app)
        target_id = _make_regular_user(client)

        resp = client.put(
            f'/api/v1/admin/users/{target_id}/role',
            json={'role': 'moderator'},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()
        # The response contains the updated user and change info
        assert data.get('changed', {}).get('new_role') == 'moderator'

    def test_get_system_stats_as_admin(self, client, app):
        """Admin requesting system stats should receive 200 with users/events keys."""
        headers = _make_admin(client, app)

        resp = client.get('/api/v1/admin/stats', headers=headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'users' in data
        assert 'events' in data
