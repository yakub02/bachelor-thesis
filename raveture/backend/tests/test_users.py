"""
Unit tests for user management routes.
Covers profile, follow/unfollow, and preferences endpoints.
"""

import pytest


def _register_and_get_headers(client, email, username):
    r = client.post('/api/v1/auth/register', json={
        'email': email,
        'username': username,
        'password': 'TestPass123!',
    })
    data = r.get_json()
    return {'Authorization': f'Bearer {data["access_token"]}'}, data['user']['id']


class TestMyProfile:
    def test_get_my_profile_requires_auth(self, client):
        """GET /me without token returns 401."""
        r = client.get('/api/v1/users/me')
        assert r.status_code == 401

    def test_get_my_profile_returns_user(self, client):
        """GET /me with valid token returns the user object."""
        headers, user_id = _register_and_get_headers(client, 'profile@test.com', 'profileuser')
        r = client.get('/api/v1/users/me', headers=headers)
        assert r.status_code == 200
        data = r.get_json()
        assert 'user' in data
        assert data['user']['id'] == user_id

    def test_update_my_profile_success(self, client):
        """PUT /me updates display_name and bio."""
        headers, user_id = _register_and_get_headers(client, 'update@test.com', 'updateuser')
        r = client.put('/api/v1/users/me', headers=headers, json={
            'display_name': 'New Name',
            'bio': 'Hello world',
        })
        assert r.status_code == 200
        data = r.get_json()
        assert data['message'] == 'Profile updated'
        assert data['user']['display_name'] == 'New Name'
        assert data['user']['bio'] == 'Hello world'


class TestFollowUnfollow:
    def test_follow_user_success(self, client):
        """POST /<user_id>/follow follows another user."""
        headers_a, id_a = _register_and_get_headers(client, 'usera@test.com', 'usera')
        headers_b, id_b = _register_and_get_headers(client, 'userb@test.com', 'userb')

        r = client.post(f'/api/v1/users/{id_b}/follow', headers=headers_a)
        assert r.status_code == 200
        data = r.get_json()
        assert data['message'] == 'Now following user'

    def test_unfollow_user_success(self, client):
        """DELETE /<user_id>/follow unfollows a user."""
        headers_a, id_a = _register_and_get_headers(client, 'followa@test.com', 'followa')
        headers_b, id_b = _register_and_get_headers(client, 'followb@test.com', 'followb')

        # First follow
        client.post(f'/api/v1/users/{id_b}/follow', headers=headers_a)

        # Then unfollow
        r = client.delete(f'/api/v1/users/{id_b}/follow', headers=headers_a)
        assert r.status_code == 200
        data = r.get_json()
        assert data['message'] == 'Unfollowed user'


class TestPreferences:
    def test_get_preferences_returns_200(self, client):
        """GET /me/preferences returns preferences object."""
        headers, user_id = _register_and_get_headers(client, 'prefs@test.com', 'prefsuser')
        r = client.get('/api/v1/users/me/preferences', headers=headers)
        assert r.status_code == 200
        data = r.get_json()
        assert 'preferences' in data

    def test_update_preferences_success(self, client):
        """PUT /me/preferences sets preferred_genres."""
        headers, user_id = _register_and_get_headers(client, 'prefsupd@test.com', 'prefsupduser')
        r = client.put('/api/v1/users/me/preferences', headers=headers, json={
            'preferred_genres': ['Techno', 'House'],
        })
        assert r.status_code == 200
        data = r.get_json()
        assert data['message'] == 'Preferences updated'
        assert data['preferences']['preferred_genres'] == ['Techno', 'House']
