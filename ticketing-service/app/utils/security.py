"""
Security utilities for Ticketing Service.
All cryptographic operations are centralized here.
"""

import hmac
import hashlib
import secrets
from datetime import datetime
from typing import Tuple, Optional


from argon2 import PasswordHasher,Type
from argon2.exceptions import VerifyMismatchError, InvalidHashError

# =============================================================================
# PASSWORD HASHING (Argon2id - winner of Password Hashing Competition)
# =============================================================================

# Argon2id configuration (OWASP recommended)
# - memory_cost: 64MB RAM required
# - time_cost: 3 iterations
# - parallelism: 4 threads
_password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  #64MB
    parallelism=4,
    hash_len=32,
    salt_len=16,
    type=Type.ID
)

def hash_password(password: str) -> str:
    """

    Hash password using Argon2id.
    Returns string that includes algorithm params + salt + hash.

    """

    return _password_hasher.hash(password)


def verify_password(password: str, hash: str) -> bool:
    """
    Verify password against Argon2id hash
     Constant-time comparison to prevent timing attacks.
    """
    try:
        _password_hasher.verify(hash, password)
        return True
    except (VerifyMismatchError, InvalidHashError):
        return False
    
def password_needs_rehash(hash: str) -> bool:
    """Check if password hash needs to be updated (params changed)."""
    return _password_hasher.check_needs_rehash(hash)

# API KEY GEN & VERIFICATION

def generate_api_key() ->Tuple[str, str]:
    """
    Generate new API key for external clients.
    Returns (raw_key, hashed_key).
    Raw key is shown once to user, hashed key is stored in DB.
    """

    # 32 bytes = 256 bits of entropy
    raw_key = f"rt_live{secrets.token_urlsafe(32)}"
    hashed_key = hash_api_key(raw_key)
    return raw_key, hashed_key

def hash_api_key(api_key: str) -> str:
    """Hash API key using SHA-256 for storage."""
    return hashlib.sha256(api_key.encode('utf-8')).hexdigest()

def verify_api_key(provided_key: str, stored_hash: str) -> bool:
    """
    Verify API key using constant-time comparison.
    Prevents timing attacks.
    """
    provided_hash = hash_api_key(provided_key)
    return hmac.compare_digest(provided_hash, stored_hash)


# QR CODE SIGNING (HMAC-SHA256, static per-ticket signature).
# Rotation is deferred to the mobile app; web tickets use a static signature
# that still cannot be forged without access to both the server signing_key
# and the per-ticket qr_secret stored in the database.


def generate_qr_secret() -> str:
    """Generate cryptographically secure secret for QR signing."""
    return secrets.token_hex(32)    # 256 bits

def generate_qr_payload(
        ticket_id: str,
        event_id: str,
        qr_secret: str,
        signing_key: str,
        timestamp: Optional[float] = None,
) -> dict:
    """
    Generate signed static QR payload.

    The signature is a function of (ticket_id, event_id, qr_secret) only — it
    does not change over time. Security still rests on the attacker needing
    both the global signing_key and the per-ticket qr_secret (both server-only)
    to produce a valid signature.

    Args:
        ticket_id: UUID of the ticket
        event_id: UUID of the event
        qr_secret: Per-ticket secret stored in DB
        signing_key: Global signing key from environment
        timestamp: Ignored (kept for backwards compatibility with callers/tests)

    Returns:
        Dict with payload data and signature
    """
    message = f"{ticket_id}:{event_id}:{qr_secret}"

    signature = hmac.new(
        signing_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return {
        'ticket_id': ticket_id,
        'event_id': event_id,
        'signature': signature,
    }

def verify_qr_signature(
    ticket_id: str,
    event_id: str,
    qr_secret: str,
    signing_key: str,
    provided_signature: str,
    timestamp: Optional[float] = None,
) -> Tuple[bool, str]:
    """
    Verify static QR signature.

    Returns:
        Tuple of (is_valid, error_message)
    """
    message = f"{ticket_id}:{event_id}:{qr_secret}"

    expected_signature = hmac.new(
        signing_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    if hmac.compare_digest(expected_signature, provided_signature):
        return True, "valid"

    return False, "invalid_signature"


# =============================================================================
# TOKEN GENERATION
# =============================================================================

def generate_secure_token(length: int = 32) -> str:
    """Generate URL-safe token for various purposes."""
    return secrets.token_urlsafe(length)


def generate_order_reference() -> str:
    """Generate unique order reference number."""
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M')
    random_part = secrets.token_hex(4).upper()
    return f"ORD-{timestamp}-{random_part}"


# =============================================================================
# INPUT SANITIZATION
# =============================================================================

def sanitize_string(value: str, max_length: int = 255) -> str:
    """Basic string sanitization."""
    if not isinstance(value, str):
        raise ValueError("Expected string input")
    
    # Remove null bytes
    value = value.replace('\x00', '')
    
    # Truncate to max length
    value = value[:max_length]
    
    # Strip whitespace
    value = value.strip()
    
    return value