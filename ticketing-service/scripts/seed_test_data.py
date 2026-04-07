#!/usr/bin/env python
"""
Seed script for test data.
Creates test ticket types and API client for development/testing.

Usage:
    python scripts/seed_test_data.py
"""

import os
import sys
import hashlib

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.ticket import TicketType, ApiClient

# Test data constants (must match frontend/src/data/testEvent.ts)
# UUIDs must be valid hex format (0-9, a-f only)
TEST_EVENT_ID = os.getenv('SEED_EVENT_ID', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
# API key should match VITE_TICKETING_API_KEY in frontend/.env
SEED_API_KEY = os.getenv('SEED_API_KEY', 'rt_dev_local_development_key_only')
SEED_USER_ID = os.getenv('SEED_USER_ID', '11111111-1111-1111-1111-111111111111')

TEST_TICKET_TYPES = [
    {
        'id': '11111111-1111-1111-1111-111111111111',
        'event_id': TEST_EVENT_ID,
        'name': 'EARLY BIRD',
        'description': 'Limited early bird tickets at a discounted price. First come, first served!',
        'price_cents': 5000,
        'currency': 'CZK',
        'quantity_total': 50,
        'max_per_order': 4,
        'resale_allowed': True,
        'resale_max_price_percent': 110,
        'is_active': True,
    },
    {
        'id': '22222222-2222-2222-2222-222222222222',
        'event_id': TEST_EVENT_ID,
        'name': 'STANDARD',
        'description': 'Standard admission ticket. Full access to all stages and areas.',
        'price_cents': 7500,
        'currency': 'CZK',
        'quantity_total': 200,
        'max_per_order': 4,
        'resale_allowed': True,
        'resale_max_price_percent': 110,
        'is_active': True,
    },
]


def seed_api_client():
    """Create or update mock API client for development."""
    print("\n[API Client]")

    # Hash the API key (SHA-256)
    api_key_hash = hashlib.sha256(SEED_API_KEY.encode()).hexdigest()

    # Check if client already exists by hash
    existing = ApiClient.query.filter_by(api_key_hash=api_key_hash).first()

    if existing:
        print(f"  [EXISTS] Mock API Client (ID: {str(existing.id)[:8]}...)")
        return

    # Create new API client
    client = ApiClient(
        name='Mock Development Client',
        api_key_hash=api_key_hash,
        rate_limit_per_minute=100,
        is_active=True,
    )
    db.session.add(client)
    db.session.commit()

    print(f"  [CREATED] Mock API Client")
    print(f"            API Key: {SEED_API_KEY}")
    print(f"            User ID: {SEED_USER_ID}")


def seed_ticket_types():
    """Create or update test ticket types."""
    print("\n[Ticket Types]")

    created_count = 0
    updated_count = 0

    for tt_data in TEST_TICKET_TYPES:
        existing = TicketType.query.get(tt_data['id'])

        if existing:
            # Update existing ticket type
            for key, value in tt_data.items():
                if key != 'id':
                    setattr(existing, key, value)
            updated_count += 1
            print(f"  [UPDATED] {tt_data['name']} (ID: {tt_data['id'][:8]}...)")
        else:
            # Create new ticket type
            ticket_type = TicketType(**tt_data)
            db.session.add(ticket_type)
            created_count += 1
            print(f"  [CREATED] {tt_data['name']} (ID: {tt_data['id'][:8]}...)")

    db.session.commit()

    print(f"  Total: {created_count} created, {updated_count} updated")
    return created_count, updated_count


def main():
    print(f"\n{'='*60}")
    print("RAVETURE Ticketing Service - Seed Test Data")
    print(f"{'='*60}")

    app = create_app(os.getenv('FLASK_ENV', 'development'))

    with app.app_context():
        # Check database connection
        try:
            db.session.execute(db.text('SELECT 1'))
            print("\nDatabase connection: OK")
        except Exception as e:
            print(f"\nDatabase connection: FAILED")
            print(f"Error: {e}")
            print("\nMake sure PostgreSQL is running and the database exists.")
            sys.exit(1)

        # Seed the data
        seed_api_client()
        created, updated = seed_ticket_types()

        # Summary
        print(f"\n{'='*60}")
        print("SEED COMPLETE")
        print(f"{'='*60}")
        print(f"\nTicket Types: {created} created, {updated} updated")
        print(f"\nTest Event ID: {TEST_EVENT_ID}")
        print(f"Mock API Key:  {SEED_API_KEY}")
        print(f"Mock User ID:  {SEED_USER_ID}")
        print(f"\nFrontend URL:  http://localhost:5173/events/{TEST_EVENT_ID}")
        print()


if __name__ == '__main__':
    main()
