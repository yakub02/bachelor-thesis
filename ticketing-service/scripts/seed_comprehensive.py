#!/usr/bin/env python3
"""
Comprehensive seed data script for RAVETURE project.

Seeds BOTH databases:
- raveture_db (main backend)
- ticketing_db (ticketing service)

Usage:
    python seed_comprehensive.py

Requirements:
    pip install psycopg2-binary argon2-cffi
"""

import sys
import uuid
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple

import psycopg2
from psycopg2.extras import execute_values, register_uuid
from argon2 import PasswordHasher

# Allow psycopg2 to serialize Python uuid.UUID objects natively
register_uuid()

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

RAVETURE_DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'raveture_db',
    'user': 'postgres',
    'password': 'root'
}

TICKETING_DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'ticketing_db',
    'user': 'postgres',
    'password': 'root'
}

# =============================================================================
# PASSWORD HASHING
# =============================================================================

ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


def hash_password(password: str) -> str:
    """Hash password using Argon2."""
    return ph.hash(password)


def hash_api_key(api_key: str) -> str:
    """Hash API key using SHA-256."""
    return hashlib.sha256(api_key.encode()).hexdigest()


# =============================================================================
# FIXED UUIDs FOR CROSS-DB REFERENCES
# =============================================================================

# User IDs (fixed for idempotency)
ADMIN_USER_ID      = uuid.UUID('83ababd5-6207-461c-846e-5020f3c75d25')
ORGANIZER_USER_ID  = uuid.UUID('d27bef1b-b890-4838-8607-59ea50e14f6f')
USER1_ID           = uuid.UUID('23be9152-d7ef-4203-ab6b-b8067d91856c')
USER2_ID           = uuid.UUID('3b56502f-7ee0-40ec-bf95-4efab8c5e8e3')
USER3_ID           = uuid.UUID('7fa3f3c4-d697-4559-ba81-84727c2b1a73')
USER4_ID           = uuid.UUID('2b219ae9-d814-4158-9640-d1aa1cbf759b')
USER5_ID           = uuid.UUID('473b04ba-2cce-4afc-b2b9-0ee99a34d33d')
USER6_ID           = uuid.UUID('bca06d28-ce1d-40e5-b304-d16480e31ecd')

# Organizer ID (fixed for idempotency)
ORGANIZER_ID = uuid.UUID('70e0fbf1-f236-485d-a5de-29bfa74d6fd4')

# Venue IDs (fixed for idempotency)
VENUE_ARTBAR_ID      = uuid.UUID('d22cd729-6fd2-482e-aac5-55938ce8b232')
VENUE_MEETFACTORY_ID = uuid.UUID('6b7cab47-fad7-4df3-8a90-5b9afaa67d29')
VENUE_CROSS_ID       = uuid.UUID('1682770f-4f76-45c0-9464-2590efd209b1')

# Event IDs (fixed, shared between raveture_db and ticketing_db)
EVENT1_ID = uuid.UUID('a60270d2-59ed-4da5-baf8-663c2dea761f')
EVENT2_ID = uuid.UUID('f98d5ac0-5deb-4d61-85df-31c19eccd046')
EVENT3_ID = uuid.UUID('03d2a5fd-377c-47f6-a3a5-9ab42e4d036f')


# =============================================================================
# SEED DATA DEFINITIONS
# =============================================================================

USERS = [
    # Admin
    {
        'id': ADMIN_USER_ID,
        'email': 'admin@raveture.cz',
        'username': 'admin',
        'password': 'Admin123!',
        'display_name': 'Admin',
        'role': 'admin',
        'is_verified': True,
        'is_active': True,
        'bio': None,
        'location': None
    },
    # Organizer
    {
        'id': ORGANIZER_USER_ID,
        'email': 'organizer@raveture.cz',
        'username': 'psychosound',
        'password': 'Organizer123!',
        'display_name': 'PSYCHOSOUND Crew',
        'role': 'organizer',
        'is_verified': True,
        'is_active': True,
        'bio': 'Underground techno collective from Prague',
        'location': 'Prague, CZ'
    },
    # Regular users
    {
        'id': USER1_ID,
        'email': 'user1@raveture.cz',
        'username': 'user1',
        'password': 'User123!',
        'display_name': 'Jakub Novák',
        'role': 'user',
        'is_verified': True,
        'is_active': True,
        'bio': None,
        'location': None
    },
    {
        'id': USER2_ID,
        'email': 'user2@raveture.cz',
        'username': 'user2',
        'password': 'User123!',
        'display_name': 'Tereza Horáková',
        'role': 'user',
        'is_verified': True,
        'is_active': True,
        'bio': None,
        'location': None
    },
    {
        'id': USER3_ID,
        'email': 'user3@raveture.cz',
        'username': 'user3',
        'password': 'User123!',
        'display_name': 'Martin Dvořák',
        'role': 'user',
        'is_verified': True,
        'is_active': True,
        'bio': None,
        'location': None
    },
    {
        'id': USER4_ID,
        'email': 'user4@raveture.cz',
        'username': 'user4',
        'password': 'User123!',
        'display_name': 'Lucie Procházková',
        'role': 'user',
        'is_verified': True,
        'is_active': True,
        'bio': None,
        'location': None
    },
    {
        'id': USER5_ID,
        'email': 'user5@raveture.cz',
        'username': 'user5',
        'password': 'User123!',
        'display_name': 'Ondřej Krejčí',
        'role': 'user',
        'is_verified': True,
        'is_active': True,
        'bio': None,
        'location': None
    },
    {
        'id': USER6_ID,
        'email': 'user6@raveture.cz',
        'username': 'user6',
        'password': 'User123!',
        'display_name': 'Markéta Svobodová',
        'role': 'user',
        'is_verified': True,
        'is_active': True,
        'bio': None,
        'location': None
    }
]

ORGANIZER = {
    'id': ORGANIZER_ID,
    'user_id': ORGANIZER_USER_ID,
    'name': 'PSYCHOSOUND',
    'slug': 'psychosound',
    'description': 'Brno-based techno collective bringing the underground sound to Czech Republic since 2020.',
    'is_verified': True,
    'website_url': 'https://psychosound.cz'
}

VENUES = [
    {
        'id': VENUE_ARTBAR_ID,
        'name': 'Artbar',
        'slug': 'artbar',
        'address': 'Štefánikova 1',
        'city': 'Brno',
        'country': 'CZ',
        'capacity': 400,
        'description': 'Intimate underground club in Prague 7',
        'is_active': True
    },
    {
        'id': VENUE_MEETFACTORY_ID,
        'name': 'MeetFactory',
        'slug': 'meetfactory',
        'address': 'Ke Sklárně 15',
        'city': 'Prague',
        'country': 'CZ',
        'capacity': 800,
        'description': 'Industrial cultural space in Prague 5',
        'is_active': True
    },
    {
        'id': VENUE_CROSS_ID,
        'name': 'Cross Club',
        'slug': 'cross-club',
        'address': 'Plynární 23',
        'city': 'Prague',
        'country': 'CZ',
        'capacity': 500,
        'description': 'Legendary steampunk venue in Holešovice',
        'is_active': True
    }
]

EVENTS = [
    {
        'id': EVENT1_ID,
        'organizer_id': ORGANIZER_ID,
        'venue_id': VENUE_ARTBAR_ID,
        'name': 'PSYCHOSOUND Vol. 12',
        'slug': 'psychosound-vol-12',
        'description': 'Brutalist techno night featuring Prague\'s finest underground artists. Prepare for an uncompromising sonic assault.',
        'starts_at': datetime(2026, 5, 10, 22, 0, tzinfo=timezone.utc),
        'ends_at': datetime(2026, 5, 11, 6, 0, tzinfo=timezone.utc),
        'doors_open_at': datetime(2026, 5, 10, 21, 30, tzinfo=timezone.utc),
        'genres': ['techno', 'industrial'],
        'event_type': 'club_night',
        'status': 'published',
        'is_featured': True,
        'ticketing_enabled': True,
        'min_age': 18
    },
    {
        'id': EVENT2_ID,
        'organizer_id': ORGANIZER_ID,
        'venue_id': VENUE_MEETFACTORY_ID,
        'name': 'RAVE @ MeetFactory',
        'slug': 'rave-meetfactory-2026',
        'description': 'Six floors, twelve hours of uncompromising techno. The biggest underground event of the summer.',
        'starts_at': datetime(2026, 6, 20, 21, 0, tzinfo=timezone.utc),
        'ends_at': datetime(2026, 6, 21, 7, 0, tzinfo=timezone.utc),
        'doors_open_at': datetime(2026, 6, 20, 20, 30, tzinfo=timezone.utc),
        'genres': ['techno', 'acid', 'industrial'],
        'event_type': 'club_night',
        'status': 'published',
        'is_featured': False,
        'ticketing_enabled': True,
        'min_age': 18
    },
    {
        'id': EVENT3_ID,
        'organizer_id': ORGANIZER_ID,
        'venue_id': VENUE_CROSS_ID,
        'name': 'CLOSING PARTY 2026',
        'slug': 'closing-party-2026',
        'description': 'End of season farewell - last underground event of the year. Go out with a bang.',
        'starts_at': datetime(2026, 9, 5, 20, 0, tzinfo=timezone.utc),
        'ends_at': datetime(2026, 9, 6, 8, 0, tzinfo=timezone.utc),
        'doors_open_at': datetime(2026, 9, 5, 19, 30, tzinfo=timezone.utc),
        'genres': ['techno', 'industrial', 'acid'],
        'event_type': 'club_night',
        'status': 'published',
        'is_featured': False,
        'ticketing_enabled': True,
        'min_age': 18
    }
]


# =============================================================================
# RAVETURE_DB SEEDING FUNCTIONS
# =============================================================================

def seed_raveture_db(conn):
    """Seed the main RAVETURE backend database."""
    cursor = conn.cursor()
    now = datetime.now(timezone.utc)

    print("\n=== SEEDING RAVETURE_DB ===\n")

    # Clear existing seed data
    print("Clearing existing data...")
    cursor.execute("TRUNCATE TABLE event_interests, event_artists, events, organizers, venues, users RESTART IDENTITY CASCADE")
    conn.commit()
    print("[OK] Tables cleared\n")

    # 1. Users
    print("Creating users...")
    user_values = []
    for user in USERS:
        password_hash = hash_password(user['password'])
        user_values.append((
            user['id'],
            user['email'],
            user['username'],
            password_hash,
            user['display_name'],
            user['role'],
            user['is_verified'],
            user['is_active'],
            now,
            user.get('bio'),
            user.get('location')
        ))

    execute_values(
        cursor,
        """
        INSERT INTO users (
            id, email, username, password_hash, display_name, role,
            is_verified, is_active, created_at, bio, location
        ) VALUES %s
        ON CONFLICT DO NOTHING
        """,
        user_values
    )
    print(f"[OK] Created {len(USERS)} users")

    # 2. Organizer
    print("Creating organizer profile...")
    cursor.execute(
        """
        INSERT INTO organizers (
            id, user_id, name, slug, description, is_verified, website_url, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        """,
        (
            ORGANIZER['id'],
            ORGANIZER['user_id'],
            ORGANIZER['name'],
            ORGANIZER['slug'],
            ORGANIZER['description'],
            ORGANIZER['is_verified'],
            ORGANIZER['website_url'],
            now
        )
    )
    print("[OK] Created organizer: PSYCHOSOUND")

    # 3. Venues
    print("Creating venues...")
    venue_values = []
    for venue in VENUES:
        venue_values.append((
            venue['id'],
            venue['name'],
            venue['slug'],
            venue['address'],
            venue['city'],
            venue['country'],
            venue['capacity'],
            venue['description'],
            venue['is_active'],
            now
        ))

    execute_values(
        cursor,
        """
        INSERT INTO venues (
            id, name, slug, address, city, country, capacity, description, is_active, created_at
        ) VALUES %s
        ON CONFLICT DO NOTHING
        """,
        venue_values
    )
    print(f"[OK] Created {len(VENUES)} venues")

    # 4. Events
    print("Creating events...")
    for event in EVENTS:
        cursor.execute(
            """
            INSERT INTO events (
                id, organizer_id, venue_id, name, slug, description,
                starts_at, ends_at, doors_open_at, genres, event_type,
                status, is_featured, ticketing_enabled, min_age,
                view_count, interested_count, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (
                event['id'],
                event['organizer_id'],
                event['venue_id'],
                event['name'],
                event['slug'],
                event['description'],
                event['starts_at'],
                event['ends_at'],
                event['doors_open_at'],
                event['genres'],
                event['event_type'],
                event['status'],
                event['is_featured'],
                event['ticketing_enabled'],
                event['min_age'],
                0,
                0,
                now
            )
        )
    print(f"[OK] Created {len(EVENTS)} events")

    conn.commit()
    print("\n[OK] RAVETURE_DB seeding complete!\n")


# =============================================================================
# TICKETING_DB SEEDING FUNCTIONS
# =============================================================================

def seed_ticketing_db(conn):
    """Seed the ticketing service database."""
    cursor = conn.cursor()
    now = datetime.now(timezone.utc)

    print("=== SEEDING TICKETING_DB ===\n")

    # Clear existing seed data
    print("Clearing existing data...")
    cursor.execute("TRUNCATE TABLE resale_listings, validations, audit_logs, discount_code_usages, tickets, order_items, orders, discount_codes, ticket_types, api_clients RESTART IDENTITY CASCADE")
    conn.commit()
    print("[OK] Tables cleared\n")

    # 1. API Client
    print("Creating API client...")
    api_client_id = uuid.uuid4()
    api_key_raw = "rt_dev_local_development_key_only"
    api_key_hash_value = hash_api_key(api_key_raw)

    cursor.execute(
        """
        INSERT INTO api_clients (
            id, name, api_key_hash, is_active, rate_limit_per_minute, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        """,
        (
            api_client_id,
            "RAVETURE Frontend",
            api_key_hash_value,
            True,
            200,
            now
        )
    )
    print(f"[OK] Created API client (key: {api_key_raw})")

    # 2. Ticket Types
    print("Creating ticket types...")

    ticket_types = []

    # Event 1 ticket types
    tt_event1_early = uuid.uuid4()
    tt_event1_standard = uuid.uuid4()
    tt_event1_vip = uuid.uuid4()

    ticket_types.extend([
        (tt_event1_early, EVENT1_ID, "EARLY BIRD", "Limited early bird tickets", 49900, "CZK", 50, 0, 0, None, None, 4, True, 110, True, 1, now, now),
        (tt_event1_standard, EVENT1_ID, "STANDARD", "Standard admission", 79900, "CZK", 150, 0, 0, None, None, 4, True, 110, True, 1, now, now),
        (tt_event1_vip, EVENT1_ID, "VIP", "VIP access with perks", 149900, "CZK", 30, 0, 0, None, None, 4, False, 110, True, 1, now, now),
    ])

    # Event 2 ticket types
    tt_event2_early = uuid.uuid4()
    tt_event2_standard = uuid.uuid4()
    tt_event2_vip = uuid.uuid4()

    ticket_types.extend([
        (tt_event2_early, EVENT2_ID, "EARLY BIRD", "Limited early bird tickets", 59900, "CZK", 80, 0, 0, None, None, 4, True, 110, True, 1, now, now),
        (tt_event2_standard, EVENT2_ID, "STANDARD", "Standard admission", 89900, "CZK", 200, 0, 0, None, None, 4, True, 110, True, 1, now, now),
        (tt_event2_vip, EVENT2_ID, "VIP BACKSTAGE", "Backstage access", 199900, "CZK", 20, 0, 0, None, None, 4, False, 110, True, 1, now, now),
    ])

    # Event 3 ticket types
    tt_event3_general = uuid.uuid4()
    tt_event3_presale = uuid.uuid4()

    ticket_types.extend([
        (tt_event3_general, EVENT3_ID, "GENERAL ADMISSION", "General admission", 69900, "CZK", 300, 0, 0, None, None, 4, True, 110, True, 1, now, now),
        (tt_event3_presale, EVENT3_ID, "PRESALE", "Early presale price", 49900, "CZK", 100, 0, 0, None, None, 4, True, 110, True, 1, now, now),
    ])

    execute_values(
        cursor,
        """
        INSERT INTO ticket_types (
            id, event_id, name, description, price_cents, currency,
            quantity_total, quantity_sold, quantity_reserved,
            sale_starts_at, sale_ends_at, max_per_order,
            resale_allowed, resale_max_price_percent, is_active, version,
            created_at, updated_at
        ) VALUES %s
        ON CONFLICT DO NOTHING
        """,
        ticket_types
    )
    print(f"[OK] Created {len(ticket_types)} ticket types")

    # 3. Discount Codes
    print("Creating discount codes...")
    discount_codes = []

    dc_earlyrave = uuid.uuid4()
    dc_vip50 = uuid.uuid4()
    dc_welcome10 = uuid.uuid4()

    discount_codes = [
        (dc_earlyrave, "EARLYRAVE", EVENT1_ID, "percentage", 20, "CZK", 0, 50, 0, 1, now, datetime(2026, 5, 1, tzinfo=timezone.utc), True, "Early bird promo", now, now),
        (dc_vip50, "VIP50", EVENT1_ID, "fixed", 5000, "CZK", 0, 10, 0, 1, now, None, True, "VIP discount", now, now),
        (dc_welcome10, "WELCOME10", None, "percentage", 10, "CZK", 0, 200, 0, 1, now, None, True, "Welcome discount", now, now),
    ]

    execute_values(
        cursor,
        """
        INSERT INTO discount_codes (
            id, code, event_id, discount_type, discount_value, currency,
            min_order_cents, max_uses, current_uses, max_uses_per_user,
            valid_from, valid_until, is_active, description, created_at, updated_at
        ) VALUES %s
        ON CONFLICT DO NOTHING
        """,
        discount_codes
    )
    print("[OK] Created 3 discount codes")

    # 4. Orders and Tickets
    print("Creating orders and tickets...")

    orders_created = 0
    tickets_created = 0

    # Helper function to create order
    def create_order(user_id: uuid.UUID, event_id: uuid.UUID, ticket_type_ids: List[uuid.UUID], unit_prices: List[int]) -> Tuple[uuid.UUID, List[uuid.UUID]]:
        nonlocal orders_created, tickets_created

        order_id = uuid.uuid4()
        reference = f"RVT-{secrets.token_hex(3).upper()}"
        subtotal = sum(unit_prices)
        total = subtotal
        expires_at = now + timedelta(days=30)

        cursor.execute(
            """
            INSERT INTO orders (
                id, reference, user_id, event_id, status,
                subtotal_cents, discount_cents, total_cents, currency,
                expires_at, confirmed_at, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order_id, reference, user_id, event_id, 'confirmed',
                subtotal, 0, total, 'CZK',
                expires_at, now, now, now
            )
        )

        # Create order items
        for tt_id, price in zip(ticket_type_ids, unit_prices):
            cursor.execute(
                """
                INSERT INTO order_items (
                    id, order_id, ticket_type_id, quantity, unit_price_cents
                ) VALUES (%s, %s, %s, %s, %s)
                """,
                (uuid.uuid4(), order_id, tt_id, 1, price)
            )

        # Create tickets
        ticket_ids = []
        for tt_id in ticket_type_ids:
            ticket_id = uuid.uuid4()
            qr_secret = secrets.token_hex(32)

            cursor.execute(
                """
                INSERT INTO tickets (
                    id, ticket_type_id, order_id, owner_id, original_owner_id,
                    status, qr_secret, issued_at, transferred_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    ticket_id, tt_id, order_id, user_id, user_id,
                    'valid', qr_secret, now, 0
                )
            )

            # Update ticket type quantity_sold
            cursor.execute(
                """
                UPDATE ticket_types
                SET quantity_sold = quantity_sold + 1
                WHERE id = %s
                """,
                (tt_id,)
            )

            ticket_ids.append(ticket_id)
            tickets_created += 1

        orders_created += 1
        return order_id, ticket_ids

    # user1: 2 tickets to event 1 (STANDARD), 1 ticket event 2 (EARLY BIRD)
    create_order(USER1_ID, EVENT1_ID, [tt_event1_standard, tt_event1_standard], [79900, 79900])
    create_order(USER1_ID, EVENT2_ID, [tt_event2_early], [59900])

    # user2: 1 ticket event 1 (VIP), 1 ticket event 2 (STANDARD)
    create_order(USER2_ID, EVENT1_ID, [tt_event1_vip], [149900])
    create_order(USER2_ID, EVENT2_ID, [tt_event2_standard], [89900])

    # user3: 2 tickets event 1 (EARLY BIRD)
    order_id_user3, ticket_ids_user3 = create_order(USER3_ID, EVENT1_ID, [tt_event1_early, tt_event1_early], [49900, 49900])

    # user4: 1 ticket event 2 (STANDARD)
    create_order(USER4_ID, EVENT2_ID, [tt_event2_standard], [89900])

    # user5: 1 ticket event 1 (STANDARD)
    create_order(USER5_ID, EVENT1_ID, [tt_event1_standard], [79900])

    print(f"[OK] Created {orders_created} orders with {tickets_created} tickets")

    # 5. Resale Listing
    print("Creating resale listing...")
    # user3 lists one of their EARLY BIRD tickets for resale
    resale_ticket_id = ticket_ids_user3[0]

    # Update ticket status to 'listed'
    cursor.execute(
        """
        UPDATE tickets
        SET status = 'listed'
        WHERE id = %s
        """,
        (resale_ticket_id,)
    )

    # Create resale listing
    resale_listing_id = uuid.uuid4()
    cursor.execute(
        """
        INSERT INTO resale_listings (
            id, ticket_id, seller_id, event_id,
            asking_price_cents, original_price_cents,
            status, listed_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            resale_listing_id,
            resale_ticket_id,
            USER3_ID,
            EVENT1_ID,
            55000,
            49900,
            'active',
            now
        )
    )
    print("[OK] Created 1 resale listing")

    conn.commit()
    print("\n[OK] TICKETING_DB seeding complete!\n")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def print_credentials():
    """Print all user credentials for reference."""
    print("\n" + "="*70)
    print("SEED DATA SUMMARY")
    print("="*70)

    print("\n--- USER CREDENTIALS ---\n")
    for user in USERS:
        print(f"  {user['role'].upper()}: {user['email']}")
        print(f"    Username: {user['username']}")
        print(f"    Password: {user['password']}")
        print(f"    Display:  {user['display_name']}")
        print()

    print("--- API CREDENTIALS ---\n")
    print("  API Key: rt_dev_local_development_key_only")
    print("  Usage:   Include in Authorization header: Bearer <key>")
    print()

    print("--- DISCOUNT CODES ---\n")
    print("  EARLYRAVE  - 20% off Event 1 (max 50 uses, valid until 2026-05-01)")
    print("  VIP50      - 5000 CZK off Event 1 (max 10 uses)")
    print("  WELCOME10  - 10% off all events (max 200 uses)")
    print()

    print("--- EVENTS CREATED ---\n")
    print(f"  1. PSYCHOSOUND Vol. 12 (ID: {EVENT1_ID})")
    print(f"     Date: 2026-05-10 @ Artbar")
    print(f"     Tickets: EARLY BIRD (499 CZK), STANDARD (799 CZK), VIP (1499 CZK)")
    print()
    print(f"  2. RAVE @ MeetFactory (ID: {EVENT2_ID})")
    print(f"     Date: 2026-06-20 @ MeetFactory")
    print(f"     Tickets: EARLY BIRD (599 CZK), STANDARD (899 CZK), VIP BACKSTAGE (1999 CZK)")
    print()
    print(f"  3. CLOSING PARTY 2026 (ID: {EVENT3_ID})")
    print(f"     Date: 2026-09-05 @ Cross Club")
    print(f"     Tickets: GENERAL ADMISSION (699 CZK), PRESALE (499 CZK)")
    print()

    print("--- ORDERS SUMMARY ---\n")
    print("  user1: 3 tickets (2x Event 1 STANDARD, 1x Event 2 EARLY BIRD)")
    print("  user2: 2 tickets (1x Event 1 VIP, 1x Event 2 STANDARD)")
    print("  user3: 2 tickets (2x Event 1 EARLY BIRD) - 1 listed for resale at 550 CZK")
    print("  user4: 1 ticket (1x Event 2 STANDARD)")
    print("  user5: 1 ticket (1x Event 1 STANDARD)")
    print()

    print("="*70)
    print("Seeding complete! Both databases populated successfully.")
    print("="*70 + "\n")


def main():
    """Main execution function."""
    print("\n" + "="*70)
    print("RAVETURE COMPREHENSIVE SEED DATA SCRIPT")
    print("="*70 + "\n")

    # Connect to raveture_db
    try:
        print("Connecting to raveture_db...")
        raveture_conn = psycopg2.connect(**RAVETURE_DB_CONFIG)
        print("[OK] Connected to raveture_db\n")
    except Exception as e:
        print(f"[FAIL] Failed to connect to raveture_db: {e}")
        sys.exit(1)

    # Connect to ticketing_db
    try:
        print("Connecting to ticketing_db...")
        ticketing_conn = psycopg2.connect(**TICKETING_DB_CONFIG)
        print("[OK] Connected to ticketing_db\n")
    except Exception as e:
        print(f"[FAIL] Failed to connect to ticketing_db: {e}")
        raveture_conn.close()
        sys.exit(1)

    # Seed databases
    try:
        seed_raveture_db(raveture_conn)
        seed_ticketing_db(ticketing_conn)

        # Print summary
        print_credentials()

    except Exception as e:
        print(f"\n[FAIL] Error during seeding: {e}")
        print("Rolling back changes...")
        raveture_conn.rollback()
        ticketing_conn.rollback()
        raise
    finally:
        raveture_conn.close()
        ticketing_conn.close()
        print("Database connections closed.")


if __name__ == '__main__':
    main()
