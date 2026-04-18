"""
Security utilities tests — includes OWASP Top 10 integration tests.
"""

import uuid
from datetime import timedelta

import pytest
from flask_jwt_extended import create_access_token

from app.utils.security import (
    hash_password,
    verify_password,
    generate_api_key,
    hash_api_key,
    verify_api_key,
    generate_qr_secret,
    generate_qr_payload,
    verify_qr_signature,
    generate_secure_token,
    generate_order_reference,
    sanitize_string,
)


class TestPasswordHashing:
    """Tests for password hashing functions."""

    def test_hash_password_returns_hash(self):
        """Test that hash_password returns a hash string."""
        password = "test_password_123"
        hash_result = hash_password(password)

        assert hash_result is not None
        assert hash_result != password
        assert hash_result.startswith('$argon2')

    def test_verify_password_correct(self):
        """Test that verify_password returns True for correct password."""
        password = "test_password_123"
        hash_result = hash_password(password)

        assert verify_password(password, hash_result) is True

    def test_verify_password_incorrect(self):
        """Test that verify_password returns False for incorrect password."""
        password = "test_password_123"
        hash_result = hash_password(password)

        assert verify_password("wrong_password", hash_result) is False


class TestApiKeyGeneration:
    """Tests for API key functions."""

    def test_generate_api_key_format(self):
        """Test that generated API key has correct format."""
        raw_key, hashed_key = generate_api_key()

        assert raw_key.startswith('rt_live')
        assert len(raw_key) > 20
        assert len(hashed_key) == 64  # SHA-256 hex digest

    def test_api_key_verification(self):
        """Test API key hash verification."""
        raw_key, key_hash = generate_api_key()

        assert verify_api_key(raw_key, key_hash) is True
        assert verify_api_key("wrong_key", key_hash) is False


class TestQrSecurity:
    """Tests for QR code security functions."""

    def test_generate_qr_secret_length(self):
        """Test that QR secret has correct length."""
        secret = generate_qr_secret()

        assert len(secret) == 64  # 32 bytes hex encoded

    def test_qr_payload_structure(self):
        """Test QR payload contains required fields."""
        payload = generate_qr_payload(
            ticket_id="test-ticket-id",
            event_id="test-event-id",
            qr_secret="a" * 64,
            signing_key="test-signing-key"
        )

        assert 'ticket_id' in payload
        assert 'event_id' in payload
        assert 'timestamp' in payload
        assert 'signature' in payload
        assert len(payload['signature']) == 64


class TestTokenGeneration:
    """Tests for token generation functions."""

    def test_secure_token_uniqueness(self):
        """Test that secure tokens are unique."""
        tokens = [generate_secure_token() for _ in range(100)]
        assert len(set(tokens)) == 100

    def test_order_reference_format(self):
        """Test order reference format."""
        ref = generate_order_reference()

        assert ref.startswith('ORD-')
        parts = ref.split('-')
        assert len(parts) == 3


class TestSanitization:
    """Tests for input sanitization."""

    def test_sanitize_removes_null_bytes(self):
        """Test that null bytes are removed."""
        result = sanitize_string("test\x00string")
        assert '\x00' not in result

    def test_sanitize_strips_whitespace(self):
        """Test that whitespace is stripped."""
        result = sanitize_string("  test  ")
        assert result == "test"

    def test_sanitize_truncates_length(self):
        """Test that string is truncated to max length."""
        long_string = "a" * 1000
        result = sanitize_string(long_string, max_length=100)
        assert len(result) == 100


# =============================================================================
# OWASP A01 — Broken Access Control
# =============================================================================

class TestA01BrokenAccessControl:
    """User must not be able to access or modify another user's order."""

    def test_cannot_access_other_users_order(self, client, app, sample_order, other_user_jwt):
        """User B gets 403 when requesting User A's order."""
        order, _ = sample_order
        other_token, _ = other_user_jwt

        with app.app_context():
            response = client.get(
                f'/api/v1/orders/{order.id}',
                headers={'Authorization': f'Bearer {other_token}'},
            )

        assert response.status_code == 403

    def test_cannot_confirm_other_users_order(self, client, app, sample_order, other_user_jwt):
        """User B gets 403 when trying to confirm User A's order."""
        order, _ = sample_order
        other_token, _ = other_user_jwt

        with app.app_context():
            response = client.post(
                f'/api/v1/orders/{order.id}/confirm',
                json={'payment_method': 'card', 'payment_reference': 'ref_123'},
                headers={'Authorization': f'Bearer {other_token}'},
            )

        assert response.status_code == 403

    def test_owner_can_access_own_order(self, client, app, sample_order):
        """Sanity check: order owner gets 200."""
        order, user_id = sample_order

        with app.app_context():
            token = create_access_token(identity=user_id)
            response = client.get(
                f'/api/v1/orders/{order.id}',
                headers={'Authorization': f'Bearer {token}'},
            )

        assert response.status_code == 200


# =============================================================================
# OWASP A02 — Cryptographic Failures
# =============================================================================

class TestA02CryptographicFailures:
    """Cryptographic primitives must meet minimum security standards."""

    def test_qr_secret_minimum_entropy(self):
        """QR secret must be at least 64 hex chars (32 bytes = 256 bits)."""
        secret = generate_qr_secret()
        assert len(secret) >= 64
        assert all(c in '0123456789abcdef' for c in secret)

    def test_qr_signature_is_sha256_length(self):
        """QR payload signature must be exactly 64 hex chars (SHA-256 output)."""
        payload = generate_qr_payload(
            ticket_id='test-ticket-id',
            event_id='test-event-id',
            qr_secret='a' * 64,
            signing_key='test-signing-key',
        )
        sig = payload['signature']
        assert len(sig) == 64
        assert all(c in '0123456789abcdef' for c in sig)

    def test_tampered_qr_signature_rejected(self, client, app, api_client, valid_ticket):
        """Scan endpoint rejects a QR payload with a tampered signature."""
        ticket, order, _ = valid_ticket
        _, raw_key = api_client

        with app.app_context():
            response = client.post(
                '/api/v1/validate/scan',
                json={
                    'ticket_id': str(ticket.id),
                    'event_id': str(order.event_id),
                    'signature': 'a' * 64,
                },
                headers={'X-API-Key': raw_key, 'Content-Type': 'application/json'},
            )

        data = response.get_json()
        assert response.status_code == 200
        assert data['result'] == 'invalid_signature'
        assert data['allowed'] is False

    def test_password_hash_uses_argon2id(self):
        """Password hashes must use Argon2id variant (not MD5, SHA1, bcrypt)."""
        result = hash_password('TestPassword123')
        assert result.startswith('$argon2id')


# =============================================================================
# OWASP A03 — Injection
# =============================================================================

class TestA03Injection:
    """Malicious inputs must be rejected by Pydantic before reaching the database."""

    def test_sql_injection_as_ticket_id_rejected(self, client, app, api_client):
        """SQL injection string as ticket_id must return 400 (invalid UUID)."""
        _, raw_key = api_client

        with app.app_context():
            response = client.post(
                '/api/v1/validate/scan',
                json={
                    'ticket_id': "1' OR '1'='1",
                    'event_id': str(uuid.uuid4()),
                    'signature': 'a' * 64,
                },
                headers={'X-API-Key': raw_key, 'Content-Type': 'application/json'},
            )

        assert response.status_code == 400

    def test_null_bytes_in_ticket_id_rejected(self, client, app, api_client):
        """Null bytes in ticket_id must return 400."""
        _, raw_key = api_client

        with app.app_context():
            response = client.post(
                '/api/v1/validate/scan',
                json={
                    'ticket_id': 'ticket\x00id',
                    'event_id': str(uuid.uuid4()),
                    'signature': 'a' * 64,
                },
                headers={'X-API-Key': raw_key, 'Content-Type': 'application/json'},
            )

        assert response.status_code == 400

    def test_oversized_signature_rejected(self, client, app, api_client):
        """Signature longer than 64 chars must return 400 (Pydantic: exactly 64 hex)."""
        _, raw_key = api_client

        with app.app_context():
            response = client.post(
                '/api/v1/validate/scan',
                json={
                    'ticket_id': str(uuid.uuid4()),
                    'event_id': str(uuid.uuid4()),
                    'signature': 'a' * 1000,
                },
                headers={'X-API-Key': raw_key, 'Content-Type': 'application/json'},
            )

        assert response.status_code == 400


# =============================================================================
# OWASP A05 — Security Misconfiguration
# =============================================================================

class TestA05SecurityMisconfiguration:
    """Every HTTP response must include required security headers."""

    def test_x_content_type_options_present(self, client):
        """X-Content-Type-Options: nosniff must be set on all responses."""
        response = client.get('/health')
        assert response.headers.get('X-Content-Type-Options') == 'nosniff'

    def test_x_frame_options_deny(self, client):
        """X-Frame-Options: DENY must be set to prevent clickjacking."""
        response = client.get('/health')
        assert response.headers.get('X-Frame-Options') == 'DENY'

    def test_x_xss_protection_present(self, client):
        """X-XSS-Protection header must be set."""
        response = client.get('/health')
        assert response.headers.get('X-XSS-Protection') == '1; mode=block'

    def test_server_header_removed(self, client):
        """Server header must be absent (prevents Flask/Werkzeug fingerprinting)."""
        response = client.get('/health')
        assert 'Server' not in response.headers


# =============================================================================
# OWASP A07 — Identification & Authentication Failures
# =============================================================================

class TestA07AuthenticationFailures:
    """Endpoints must reject missing, invalid, and expired credentials."""

    def test_no_credentials_rejected(self, client, app, sample_order):
        """Request with no auth header must return 401."""
        order, _ = sample_order

        with app.app_context():
            response = client.get(f'/api/v1/orders/{order.id}')

        assert response.status_code == 401

    def test_invalid_api_key_rejected(self, client, app, sample_order):
        """Request with wrong API key must return 401."""
        order, _ = sample_order

        with app.app_context():
            response = client.get(
                f'/api/v1/orders/{order.id}',
                headers={'X-API-Key': 'totally_invalid_key'},
            )

        assert response.status_code == 401

    def test_malformed_jwt_rejected(self, client, app, sample_order):
        """Request with garbage JWT must return 401."""
        order, _ = sample_order

        with app.app_context():
            response = client.get(
                f'/api/v1/orders/{order.id}',
                headers={'Authorization': 'Bearer this.is.not.a.jwt'},
            )

        assert response.status_code == 401

    def test_expired_jwt_rejected(self, client, app, sample_order):
        """Request with expired JWT must return 401."""
        order, user_id = sample_order

        with app.app_context():
            expired_token = create_access_token(
                identity=user_id,
                expires_delta=timedelta(seconds=-3600),
            )
            response = client.get(
                f'/api/v1/orders/{order.id}',
                headers={'Authorization': f'Bearer {expired_token}'},
            )

        assert response.status_code == 401


# =============================================================================
# OWASP A09 — Security Logging & Monitoring Failures
# =============================================================================

class TestA09SecurityLogging:
    """Every ticket scan attempt must be recorded in the Validation table."""

    def test_scan_nonexistent_ticket_is_logged(self, client, app, api_client):
        """Scanning a non-existent ticket ID must create a Validation record."""
        from app.models.ticket import Validation
        _, raw_key = api_client

        with app.app_context():
            before_count = Validation.query.count()
            client.post(
                '/api/v1/validate/scan',
                json={
                    'ticket_id': str(uuid.uuid4()),
                    'event_id': str(uuid.uuid4()),
                    'signature': 'a' * 64,
                },
                headers={'X-API-Key': raw_key, 'Content-Type': 'application/json'},
            )
            after_count = Validation.query.count()
            last = Validation.query.order_by(Validation.scanned_at.desc()).first()

        assert after_count == before_count + 1
        assert last.result == 'not_found'

    def test_scan_invalid_signature_is_logged(self, client, app, api_client, valid_ticket):
        """Scanning with a wrong signature must be recorded as invalid_signature."""
        from app.models.ticket import Validation
        ticket, order, _ = valid_ticket
        _, raw_key = api_client

        with app.app_context():
            before_count = Validation.query.count()
            client.post(
                '/api/v1/validate/scan',
                json={
                    'ticket_id': str(ticket.id),
                    'event_id': str(order.event_id),
                    'signature': 'b' * 64,
                },
                headers={'X-API-Key': raw_key, 'Content-Type': 'application/json'},
            )
            after_count = Validation.query.count()
            last = Validation.query.order_by(Validation.scanned_at.desc()).first()

        assert after_count == before_count + 1
        assert last.result == 'invalid_signature'
        assert last.ticket_id == ticket.id

    def test_successful_scan_is_logged(self, client, app, api_client, valid_ticket):
        """A valid scan must be recorded as valid in the Validation table."""
        from app.models.ticket import Validation
        ticket, order, _ = valid_ticket
        _, raw_key = api_client

        with app.app_context():
            correct_signature = generate_qr_payload(
                ticket_id=str(ticket.id),
                event_id=str(order.event_id),
                qr_secret=ticket.qr_secret,
                signing_key=app.config['QR_SIGNING_KEY'],
            )['signature']

            before_count = Validation.query.count()
            client.post(
                '/api/v1/validate/scan',
                json={
                    'ticket_id': str(ticket.id),
                    'event_id': str(order.event_id),
                    'signature': correct_signature,
                },
                headers={'X-API-Key': raw_key, 'Content-Type': 'application/json'},
            )
            after_count = Validation.query.count()
            last = Validation.query.order_by(Validation.scanned_at.desc()).first()

        assert after_count == before_count + 1
        assert last.result == 'valid'
        assert last.ticket_id == ticket.id
