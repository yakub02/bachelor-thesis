"""
Authentication tests.
"""


class TestRegistration:
    """Tests for user registration."""

    def test_register_success(self, client):
        """Test successful registration."""
        response = client.post('/api/v1/auth/register', json={
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'SecurePass123',
        })

        assert response.status_code == 201
        data = response.get_json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['user']['email'] == 'newuser@example.com'

    def test_register_duplicate_email(self, client):
        """Test registration with existing email fails."""
        # First registration
        client.post('/api/v1/auth/register', json={
            'email': 'duplicate@example.com',
            'username': 'user1',
            'password': 'SecurePass123',
        })

        # Second registration with same email
        response = client.post('/api/v1/auth/register', json={
            'email': 'duplicate@example.com',
            'username': 'user2',
            'password': 'SecurePass123',
        })

        assert response.status_code == 409
        assert 'already registered' in response.get_json()['error']

    def test_register_weak_password(self, client):
        """Test registration with weak password fails."""
        response = client.post('/api/v1/auth/register', json={
            'email': 'weak@example.com',
            'username': 'weakuser',
            'password': 'weak',
        })

        assert response.status_code == 400

    def test_register_invalid_username(self, client):
        """Test registration with invalid username fails."""
        response = client.post('/api/v1/auth/register', json={
            'email': 'invalid@example.com',
            'username': '123invalid',  # Starts with number
            'password': 'SecurePass123',
        })

        assert response.status_code == 400


class TestLogin:
    """Tests for user login."""

    def test_login_success(self, client):
        """Test successful login."""
        # Register first
        client.post('/api/v1/auth/register', json={
            'email': 'login@example.com',
            'username': 'loginuser',
            'password': 'SecurePass123',
        })

        # Login
        response = client.post('/api/v1/auth/login', json={
            'email': 'login@example.com',
            'password': 'SecurePass123',
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
        assert 'refresh_token' in data

    def test_login_wrong_password(self, client):
        """Test login with wrong password fails."""
        # Register first
        client.post('/api/v1/auth/register', json={
            'email': 'wrongpass@example.com',
            'username': 'wrongpassuser',
            'password': 'SecurePass123',
        })

        # Login with wrong password
        response = client.post('/api/v1/auth/login', json={
            'email': 'wrongpass@example.com',
            'password': 'WrongPassword123',
        })

        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        """Test login with nonexistent user fails."""
        response = client.post('/api/v1/auth/login', json={
            'email': 'nonexistent@example.com',
            'password': 'SomePassword123',
        })

        assert response.status_code == 401


class TestTokenRefresh:
    """Tests for token refresh."""

    def test_refresh_token(self, client):
        """Test token refresh."""
        # Register and get tokens
        response = client.post('/api/v1/auth/register', json={
            'email': 'refresh@example.com',
            'username': 'refreshuser',
            'password': 'SecurePass123',
        })

        refresh_token = response.get_json()['refresh_token']

        # Refresh
        response = client.post('/api/v1/auth/refresh', headers={
            'Authorization': f'Bearer {refresh_token}'
        })

        assert response.status_code == 200
        assert 'access_token' in response.get_json()


class TestMe:
    """Tests for /me endpoint."""

    def test_get_me(self, client, auth_headers):
        """Test getting current user info."""
        response = client.get('/api/v1/auth/me', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert 'user' in data
        assert data['user']['username'] == 'testuser'

    def test_get_me_unauthorized(self, client):
        """Test /me without auth fails."""
        response = client.get('/api/v1/auth/me')

        assert response.status_code == 401
