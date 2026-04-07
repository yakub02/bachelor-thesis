"""
Security utilities for RAVETURE Backend.
Password hashing, token generation, and security helpers.
"""

import secrets
import hashlib
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHash

# Argon2id configuration (OWASP recommended)
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """
    Hash a password using Argon2id.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    return ph.hash(password)


def verify_password(password: str, hash: str) -> bool:
    """
    Verify a password against its hash.

    Args:
        password: Plain text password to verify
        hash: Stored password hash

    Returns:
        True if password matches, False otherwise
    """
    try:
        ph.verify(hash, password)
        return True
    except (VerifyMismatchError, InvalidHash):
        return False


def password_needs_rehash(hash: str) -> bool:
    """
    Check if password hash needs to be updated.

    Args:
        hash: Current password hash

    Returns:
        True if hash should be regenerated
    """
    return ph.check_needs_rehash(hash)


def generate_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token.

    Args:
        length: Length of token in bytes (output will be 2x in hex)

    Returns:
        Hex-encoded random token
    """
    return secrets.token_hex(length)


def generate_verification_token() -> str:
    """Generate email verification token."""
    return generate_token(32)


def generate_reset_token() -> str:
    """Generate password reset token."""
    return generate_token(32)


def hash_string(value: str) -> str:
    """
    Create SHA-256 hash of a string.

    Args:
        value: String to hash

    Returns:
        Hex-encoded SHA-256 hash
    """
    return hashlib.sha256(value.encode()).hexdigest()


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """
    Sanitize a string input.

    - Removes null bytes
    - Strips whitespace
    - Truncates to max length

    Args:
        value: Input string
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    if not value:
        return ''

    # Remove null bytes
    value = value.replace('\x00', '')

    # Strip whitespace
    value = value.strip()

    # Truncate
    if len(value) > max_length:
        value = value[:max_length]

    return value


def generate_slug(name: str) -> str:
    """
    Generate URL-safe slug from a name.

    Args:
        name: Name to convert

    Returns:
        URL-safe slug
    """
    import re

    # Lowercase
    slug = name.lower()

    # Replace spaces and special chars with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug)

    # Remove leading/trailing hyphens
    slug = slug.strip('-')

    # Collapse multiple hyphens
    slug = re.sub(r'-+', '-', slug)

    return slug
