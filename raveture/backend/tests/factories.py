"""
Test Data Factories for RAVETURE Backend

This module provides Factory Boy factories for generating test data.
Factories create realistic database objects for testing without manual setup.

Usage:
    from tests.factories import UserFactory, EventFactory

    # Create single instance
    user = UserFactory()

    # Create with custom attributes
    user = UserFactory(email='custom@example.com')

    # Create multiple instances
    users = UserFactory.create_batch(10)

    # Build without saving to database
    user = UserFactory.build()
"""

import factory
from factory import fuzzy
from datetime import datetime, timedelta
from app.models import db, User, Event, Venue, Organizer
from argon2 import PasswordHasher

ph = PasswordHasher()


class UserFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating User instances."""

    class Meta:
        model = User
        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = 'commit'

    id = factory.Sequence(lambda n: n + 1)
    email = factory.Sequence(lambda n: f'user{n}@example.com')
    name = factory.Faker('name')
    password_hash = factory.LazyFunction(lambda: ph.hash('password123'))
    is_organizer = False
    is_verified = True
    created_at = factory.LazyFunction(datetime.utcnow)

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override create to handle password hashing."""
        if 'password' in kwargs:
            password = kwargs.pop('password')
            kwargs['password_hash'] = ph.hash(password)
        return super()._create(model_class, *args, **kwargs)


class OrganizerFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating Organizer instances."""

    class Meta:
        model = Organizer
        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = 'commit'

    id = factory.Sequence(lambda n: n + 1)
    user_id = factory.SubFactory(UserFactory, is_organizer=True)
    name = factory.Faker('company')
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(' ', '-'))
    description = factory.Faker('text', max_nb_chars=200)
    website = factory.Faker('url')
    created_at = factory.LazyFunction(datetime.utcnow)


class VenueFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating Venue instances."""

    class Meta:
        model = Venue
        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = 'commit'

    id = factory.Faker('uuid4')
    name = factory.Faker('company')
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(' ', '-'))
    address = factory.Faker('street_address')
    city = factory.Faker('city')
    country = 'Czech Republic'
    capacity = fuzzy.FuzzyInteger(50, 1000)
    description = factory.Faker('text', max_nb_chars=300)
    website = factory.Faker('url')
    created_by_id = factory.SubFactory(UserFactory, is_organizer=True)
    created_at = factory.LazyFunction(datetime.utcnow)


class EventFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating Event instances."""

    class Meta:
        model = Event
        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = 'commit'

    id = factory.Faker('uuid4')
    title = factory.Faker('catch_phrase')
    slug = factory.LazyAttribute(
        lambda obj: obj.title.lower().replace(' ', '-')[:50]
    )
    description = factory.Faker('text', max_nb_chars=500)
    cover_image = factory.Faker('image_url')

    start_date = factory.LazyFunction(
        lambda: datetime.utcnow() + timedelta(days=30)
    )
    end_date = factory.LazyAttribute(
        lambda obj: obj.start_date + timedelta(hours=6)
    )

    venue_id = factory.SubFactory(VenueFactory)
    organizer_id = factory.SubFactory(OrganizerFactory)

    genre = fuzzy.FuzzyChoice([
        'Psytrance',
        'Techno',
        'House',
        'Drum & Bass',
        'Trance',
        'Progressive',
    ])

    min_age = fuzzy.FuzzyChoice([16, 18, 21])
    is_featured = False
    status = 'published'

    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


# Helper functions for creating test data

def create_test_user(email=None, password='password123', is_organizer=False, **kwargs):
    """
    Create a test user with sensible defaults.

    Args:
        email: User email (generated if not provided)
        password: User password (default: 'password123')
        is_organizer: Whether user is organizer (default: False)
        **kwargs: Additional user attributes

    Returns:
        User: Created user instance

    Example:
        user = create_test_user(email='test@example.com')
        organizer = create_test_user(is_organizer=True)
    """
    if email:
        kwargs['email'] = email
    kwargs['is_organizer'] = is_organizer
    return UserFactory(password=password, **kwargs)


def create_test_organizer(name=None, user=None, **kwargs):
    """
    Create a test organizer with optional user.

    Args:
        name: Organizer name (generated if not provided)
        user: Associated user (created if not provided)
        **kwargs: Additional organizer attributes

    Returns:
        Organizer: Created organizer instance

    Example:
        organizer = create_test_organizer(name='PSYCHOSOUND')
        organizer = create_test_organizer(user=existing_user)
    """
    if name:
        kwargs['name'] = name
        kwargs['slug'] = name.lower().replace(' ', '-')
    if user:
        kwargs['user_id'] = user.id
    return OrganizerFactory(**kwargs)


def create_test_venue(name=None, city='Prague', **kwargs):
    """
    Create a test venue with sensible defaults.

    Args:
        name: Venue name (generated if not provided)
        city: Venue city (default: 'Prague')
        **kwargs: Additional venue attributes

    Returns:
        Venue: Created venue instance

    Example:
        venue = create_test_venue(name='Artbar', capacity=150)
    """
    if name:
        kwargs['name'] = name
        kwargs['slug'] = name.lower().replace(' ', '-')
    kwargs['city'] = city
    return VenueFactory(**kwargs)


def create_test_event(
    title=None,
    organizer=None,
    venue=None,
    start_days_from_now=30,
    **kwargs
):
    """
    Create a test event with sensible defaults.

    Args:
        title: Event title (generated if not provided)
        organizer: Event organizer (created if not provided)
        venue: Event venue (created if not provided)
        start_days_from_now: Days until event starts (default: 30)
        **kwargs: Additional event attributes

    Returns:
        Event: Created event instance

    Example:
        event = create_test_event(title='PSYCHOSOUND @ Artbar')
        event = create_test_event(
            organizer=my_organizer,
            venue=my_venue,
            start_days_from_now=7
        )
    """
    if title:
        kwargs['title'] = title
        kwargs['slug'] = title.lower().replace(' ', '-')[:50]

    if organizer:
        kwargs['organizer_id'] = organizer.id

    if venue:
        kwargs['venue_id'] = venue.id

    kwargs['start_date'] = datetime.utcnow() + timedelta(days=start_days_from_now)
    kwargs['end_date'] = kwargs['start_date'] + timedelta(hours=6)

    return EventFactory(**kwargs)


def create_full_event_setup():
    """
    Create a complete event setup with user, organizer, venue, and event.

    Returns:
        dict: Dictionary with 'user', 'organizer', 'venue', 'event' keys

    Example:
        setup = create_full_event_setup()
        user = setup['user']
        event = setup['event']
    """
    user = create_test_user(is_organizer=True)
    organizer = create_test_organizer(user=user)
    venue = create_test_venue(created_by_id=user.id)
    event = create_test_event(organizer=organizer, venue=venue)

    return {
        'user': user,
        'organizer': organizer,
        'venue': venue,
        'event': event,
    }
