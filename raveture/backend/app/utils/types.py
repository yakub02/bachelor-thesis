"""
Custom SQLAlchemy types for cross-database compatibility.
"""

import json
import uuid
from sqlalchemy import String
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PG_UUID


class CompatUUID(TypeDecorator):
    """Native UUID in PostgreSQL, String(36) in SQLite (for testing)."""

    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=False))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):
        return value


class ArrayType(TypeDecorator):
    """ARRAY in PostgreSQL, JSON-serialized TEXT in SQLite (for testing)."""

    impl = String
    cache_ok = True

    def __init__(self, item_type=String(100)):
        self._item_type = item_type
        super().__init__()

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(ARRAY(self._item_type))
        return dialect.type_descriptor(String(2000))

    def process_bind_param(self, value, dialect):
        if dialect.name != 'postgresql':
            return json.dumps(value) if value is not None else '[]'
        return value

    def process_result_value(self, value, dialect):
        if dialect.name != 'postgresql':
            if value is None:
                return []
            if isinstance(value, str):
                return json.loads(value)
        return value if value is not None else []
