#!/usr/bin/env python
"""
Seed ticket types for real PSYCHOSOUND events.
Run this after creating events in raveture backend.

Usage:
    python scripts/seed_real_events.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.ticket import TicketType

# Real event IDs from raveture backend
EVENTS = [
    {
        'event_id': 'f43a70ae-e91e-4a27-97ff-490d8dfc5263',
        'name': 'PSYCHOSOUND @ Artbar',
        'ticket_types': [
            {
                'name': 'EARLY BIRD',
                'description': 'Limited early bird tickets. First come, first served!',
                'price_cents': 25000,
                'currency': 'CZK',
                'quantity_total': 50,
                'max_per_order': 4,
                'resale_allowed': True,
                'resale_max_price_percent': 110,
            },
            {
                'name': 'STANDARD',
                'description': 'Standard admission. Full access to all areas.',
                'price_cents': 35000,
                'currency': 'CZK',
                'quantity_total': 150,
                'max_per_order': 4,
                'resale_allowed': True,
                'resale_max_price_percent': 110,
            },
        ]
    },
    {
        'event_id': '3ed60514-1b1e-44be-9d88-8150f168697b',
        'name': 'PSYCHOSOUND 3rd Anniversary',
        'ticket_types': [
            {
                'name': 'EARLY BIRD',
                'description': 'Limited early bird tickets for the anniversary!',
                'price_cents': 35000,
                'currency': 'CZK',
                'quantity_total': 75,
                'max_per_order': 4,
                'resale_allowed': True,
                'resale_max_price_percent': 110,
            },
            {
                'name': 'STANDARD',
                'description': 'Standard admission to the 3rd anniversary celebration.',
                'price_cents': 45000,
                'currency': 'CZK',
                'quantity_total': 100,
                'max_per_order': 4,
                'resale_allowed': True,
                'resale_max_price_percent': 110,
            },
            {
                'name': 'VIP',
                'description': 'VIP access with exclusive perks and backstage tour.',
                'price_cents': 75000,
                'currency': 'CZK',
                'quantity_total': 25,
                'max_per_order': 2,
                'resale_allowed': False,
            },
        ]
    },
]


def seed_ticket_types():
    """Create ticket types for real events."""
    print("\n[Ticket Types for Real Events]")

    for event in EVENTS:
        print(f"\n  Event: {event['name']}")
        print(f"  ID: {event['event_id']}")

        for tt_data in event['ticket_types']:
            # Check if exists
            existing = TicketType.query.filter_by(
                event_id=event['event_id'],
                name=tt_data['name']
            ).first()

            if existing:
                print(f"    [EXISTS] {tt_data['name']}")
                continue

            ticket_type = TicketType(
                event_id=event['event_id'],
                is_active=True,
                **tt_data
            )
            db.session.add(ticket_type)
            print(f"    [CREATED] {tt_data['name']} - {tt_data['price_cents']/100:.0f} CZK")

    db.session.commit()


def main():
    print(f"\n{'='*60}")
    print("RAVETURE Ticketing - Seed Real Event Ticket Types")
    print(f"{'='*60}")

    app = create_app(os.getenv('FLASK_ENV', 'development'))

    with app.app_context():
        try:
            db.session.execute(db.text('SELECT 1'))
            print("\nDatabase connection: OK")
        except Exception as e:
            print(f"\nDatabase connection: FAILED - {e}")
            sys.exit(1)

        seed_ticket_types()

        print(f"\n{'='*60}")
        print("SEED COMPLETE")
        print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
