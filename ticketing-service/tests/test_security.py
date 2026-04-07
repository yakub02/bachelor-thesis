"""
Security utilities tests.
"""

import pytest
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
        api_key = generate_api_key()

        assert api_key.startswith('rt_live_')
        assert len(api_key) > 20

    def test_api_key_verification(self):
        """Test API key hash verification."""
        api_key = generate_api_key()
        key_hash = hash_api_key(api_key)

        assert verify_api_key(api_key, key_hash) is True
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
