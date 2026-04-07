#!/usr/bin/env python
"""
Seed script for admin user.
Creates admin account for development/testing.

Usage:
    python scripts/seed_admin.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.user import User
from app.utils.security import hash_password


ADMIN_DATA = {
    'email': 'admin@raveture.cz',
    'username': 'admin',
    'password': 'admin123',
    'display_name': 'RAVETURE Admin',
    'role': 'admin',
    'is_verified': True,
    'is_active': True,
}


def seed_admin():
    """Create or update admin user."""
    print("\n[Admin User]")

    # Delete existing admin if exists
    existing = User.query.filter_by(email=ADMIN_DATA['email']).first()
    if existing:
        print(f"  [DELETE] {existing.username}")
        db.session.delete(existing)
        db.session.flush()

    # Create fresh admin
    admin = User(
        email=ADMIN_DATA['email'],
        username=ADMIN_DATA['username'],
        password_hash=hash_password(ADMIN_DATA['password']),
        display_name=ADMIN_DATA['display_name'],
        role=ADMIN_DATA['role'],
        is_verified=ADMIN_DATA['is_verified'],
        is_active=ADMIN_DATA['is_active'],
    )
    db.session.add(admin)
    db.session.commit()

    print(f"  [CREATED] {admin.username}")
    print(f"            Email: {admin.email}")
    print(f"            Password: {ADMIN_DATA['password']}")
    print(f"            Role: {admin.role}")


def main():
    print(f"\n{'='*60}")
    print("RAVETURE Backend - Seed Admin")
    print(f"{'='*60}")

    app = create_app(os.getenv('FLASK_ENV', 'development'))

    with app.app_context():
        try:
            db.session.execute(db.text('SELECT 1'))
            print("\nDatabase connection: OK")
        except Exception as e:
            print(f"\nDatabase connection: FAILED - {e}")
            sys.exit(1)

        seed_admin()

        print(f"\n{'='*60}")
        print("✓ SEED COMPLETE")
        print(f"{'='*60}")
        print(f"\nLogin: {ADMIN_DATA['email']}")
        print(f"Password: {ADMIN_DATA['password']}")
        print()


if __name__ == '__main__':
    main()
