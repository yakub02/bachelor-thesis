"""
Security utilities for Ticketing Service.
All cryptographic operations are centralized here.
"""

import hmac
import hashlib
import secrets
import time
from datetime import datetime, timedelta
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


# QR CODE SIGNING (HMAC-SHA256 with time-based rotation.)

# QR code validity window in seconds
QR_ROTATION_INTERVAL = 120  # TODO: set back to 30 for production
QR_GRACE_PERIOD = 30  # Accept previous window for sync issues


def generate_qr_secret() -> str:
    """Generate cryptographically secure secret for QR signing."""
    return secrets.token_hex(32)    # 256 bits  

def generate_qr_payload(
        ticket_id: str,
        event_id: str,
        qr_secret: str,
        signing_key: str,
        timestamp: Optional[float] = None
) -> dict:
    """
       Generate signed QR payload with time-based rotation.
    
    Args:
        ticket_id: UUID of the ticket
        event_id: UUID of the event
        qr_secret: Per-ticket secret stored in DB
        signing_key: Global signing key from environment
        timestamp: Optional timestamp for testing
    
    Returns:
        Dict with payload data and signature
    """
    if timestamp is None:
        timestamp = time.time()
    
    # Time window (changes every QR_ROTATION_INTERVAL seconds)
    time_window = int(timestamp // QR_ROTATION_INTERVAL)

    # Create message to sign
    message = f"{ticket_id}:{event_id}:{qr_secret}:{time_window}"

    # Generate HMAC-SHA256 signature
    signature = hmac.new(
        signing_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return {
        'ticket_id': ticket_id,
        'event_id': event_id,
        'timestamp': int(timestamp),
        'window': time_window,
        'signature': signature,
        'expires_in': QR_ROTATION_INTERVAL - int(timestamp % QR_ROTATION_INTERVAL)
    }

def verify_qr_signature(
    ticket_id: str,
    event_id: str,
    qr_secret: str,
    signing_key: str,
    provided_signature: str,
    timestamp: Optional[float] = None
) -> Tuple[bool, str]:
    """
    Verify QR signature with grace period for clock sync.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if timestamp is None:
        timestamp = time.time()
    
    current_window = int(timestamp // QR_ROTATION_INTERVAL)
    
    # Check current window and previous (grace period)
    for window_offset in [0, -1]:
        window = current_window + window_offset
        message = f"{ticket_id}:{event_id}:{qr_secret}:{window}"
        
        expected_signature = hmac.new(
            signing_key.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Constant-time comparison
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