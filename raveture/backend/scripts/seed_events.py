#!/usr/bin/env python
"""
Seed script for PSYCHOSOUND events.
Creates venue, organizer, and featured events for development/testing.

Usage:
    python scripts/seed_events.py
"""

import os
import sys
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.user import User
from app.models.event import Event, Organizer, Venue
from app.utils.security import hash_password


# =============================================================================
# SEED DATA
# =============================================================================

VENUE_DATA = {
    'name': 'Artbar',
    'slug': 'artbar',
    'description': 'Underground club in the heart of the city. Industrial vibes, powerful sound system.',
    'address': 'Stroupežnického 493/10',
    'city': 'Prague',
    'country': 'CZ',
    'postal_code': '150 00',
    'capacity': 200,
    'is_active': True,
}

ORGANIZER_DATA = {
    'name': 'PSYCHOSOUND',
    'slug': 'psychosound',
    'description': 'Underground techno collective bringing the hardest beats to Prague since 2023.',
    'instagram_url': 'https://instagram.com/psychosound.cz',
    'is_verified': True,
}

USER_DATA = {
    'email': 'organizer@psychosound.cz',
    'username': 'psychosound',
    'password': 'dev-password-123',  # Only for development!
    'display_name': 'PSYCHOSOUND',
    'role': 'organizer',
    'is_verified': True,
    'is_active': True,
}

EVENTS_DATA = [
    {
        'name': 'PSYCHOSOUND @ Artbar',
        'slug': 'psychosound-artbar-apr-2026',
        'short_description': 'Monthly dose of underground techno. No compromise.',
        'description': '''PSYCHOSOUND returns to Artbar with another night of uncompromising techno.

Expect:
• Pounding kicks
• Hypnotic loops
• Industrial atmosphere
• No commercial bullshit

Dress code: Dark
18+''',
        'starts_at': datetime(2026, 4, 24, 22, 0, tzinfo=timezone.utc),
        'ends_at': datetime(2026, 4, 25, 6, 0, tzinfo=timezone.utc),
        'doors_open_at': datetime(2026, 4, 24, 21, 30, tzinfo=timezone.utc),
        'genres': ['techno', 'industrial', 'hard techno'],
        'event_type': 'club_night',
        'status': 'published',
        'is_featured': True,
        'ticketing_enabled': True,
        'min_age': 18,
    },
    {
        'name': 'PSYCHOSOUND 3rd Anniversary',
        'slug': 'psychosound-3rd-anniversary-2026',
        'short_description': '3 years of underground resistance. The biggest PSYCHOSOUND yet.',
        'description': '''🔊 PSYCHOSOUND 3RD ANNIVERSARY 🔊

Three years of bringing the underground sound to Prague.
This is not just a party - it's a celebration of everyone who believes in real techno.

Special extended set times
Surprise guests
Limited capacity

Be part of the movement.

18+ | Dark dress code recommended''',
        'starts_at': datetime(2026, 7, 17, 22, 0, tzinfo=timezone.utc),
        'ends_at': datetime(2026, 7, 18, 8, 0, tzinfo=timezone.utc),
        'doors_open_at': datetime(2026, 7, 17, 21, 0, tzinfo=timezone.utc),
        'genres': ['techno', 'industrial', 'hard techno', 'acid'],
        'event_type': 'club_night',
        'status': 'published',
        'is_featured': True,
        'ticketing_enabled': True,
        'min_age': 18,
    },
]


# =============================================================================
# SEED FUNCTIONS
# =============================================================================

def seed_user():
    """Create or get organizer user."""
    print("\n[User]")

    existing = User.query.filter_by(email=USER_DATA['email']).first()
    if existing:
        # Update password hash to fix potential hash algorithm mismatch
        existing.password_hash = hash_password(USER_DATA['password'])
        db.session.flush()
        print(f"  [EXISTS] {existing.username} (ID: {str(existing.id)[:8]}...) - password reset")
        return existing

    user = User(
        email=USER_DATA['email'],
        username=USER_DATA['username'],
        password_hash=hash_password(USER_DATA['password']),
        display_name=USER_DATA['display_name'],
        role=USER_DATA['role'],
        is_verified=USER_DATA['is_verified'],
        is_active=USER_DATA['is_active'],
    )
    db.session.add(user)
    db.session.flush()

    print(f"  [CREATED] {user.username}")
    print(f"            Email: {user.email}")
    print(f"            Password: {USER_DATA['password']}")

    return user


def seed_venue():
    """Create or get venue."""
    print("\n[Venue]")

    existing = Venue.query.filter_by(slug=VENUE_DATA['slug']).first()
    if existing:
        print(f"  [EXISTS] {existing.name} (ID: {str(existing.id)[:8]}...)")
        return existing

    venue = Venue(**VENUE_DATA)
    db.session.add(venue)
    db.session.flush()

    print(f"  [CREATED] {venue.name}, {venue.city}")

    return venue


def seed_organizer(user):
    """Create or get organizer."""
    print("\n[Organizer]")

    existing = Organizer.query.filter_by(slug=ORGANIZER_DATA['slug']).first()
    if existing:
        print(f"  [EXISTS] {existing.name} (ID: {str(existing.id)[:8]}...)")
        return existing

    organizer = Organizer(
        user_id=user.id,
        **ORGANIZER_DATA
    )
    db.session.add(organizer)
    db.session.flush()

    print(f"  [CREATED] {organizer.name}")

    return organizer


def seed_events(organizer, venue):
    """Create events."""
    print("\n[Events]")

    created_count = 0

    for event_data in EVENTS_DATA:
        existing = Event.query.filter_by(slug=event_data['slug']).first()

        if existing:
            print(f"  [EXISTS] {existing.name} (ID: {str(existing.id)[:8]}...)")
            continue

        event = Event(
            organizer_id=organizer.id,
            venue_id=venue.id,
            **event_data
        )
        event.published_at = datetime.now(timezone.utc)

        db.session.add(event)
        created_count += 1
        print(f"  [CREATED] {event.name}")
        print(f"            Date: {event.starts_at.strftime('%d.%m.%Y %H:%M')}")
        print(f"            Featured: {event.is_featured}")

    return created_count


def main():
    print(f"\n{'='*60}")
    print("RAVETURE Backend - Seed PSYCHOSOUND Events")
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
        user = seed_user()
        venue = seed_venue()
        organizer = seed_organizer(user)
        created = seed_events(organizer, venue)

        db.session.commit()

        # Summary
        print(f"\n{'='*60}")
        print("SEED COMPLETE")
        print(f"{'='*60}")
        print(f"\nEvents created: {created}")
        print(f"Organizer: {organizer.name}")
        print(f"Venue: {venue.name}, {venue.city}")

        # List all featured events
        featured = Event.query.filter_by(is_featured=True, status='published').all()
        print(f"\nFeatured events in database: {len(featured)}")
        for e in featured:
            print(f"  - {e.name} ({e.starts_at.strftime('%d.%m.%Y')})")

        print(f"\nTest login:")
        print(f"  Email: {USER_DATA['email']}")
        print(f"  Password: {USER_DATA['password']}")
        print()


if __name__ == '__main__':
    main()
