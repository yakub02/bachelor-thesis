"""Add cover_image_url and subtitle to forum_threads

Revision ID: a1b2c3d4e5f6
Revises: 5550f1c2bddf
Create Date: 2026-04-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6'
down_revision = '5550f1c2bddf'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('forum_threads', sa.Column('cover_image_url', sa.String(500), nullable=True))
    op.add_column('forum_threads', sa.Column('subtitle', sa.String(300), nullable=True))


def downgrade():
    op.drop_column('forum_threads', 'subtitle')
    op.drop_column('forum_threads', 'cover_image_url')
