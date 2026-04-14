"""
Forum models for RAVETURE Backend.
Handles discussions, threads, posts, and reactions.
"""

import uuid7
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID

from app import db


class ReactionType(PyEnum):
    """Available reaction types."""
    LIKE = 'like'
    FIRE = 'fire'
    SKULL = 'skull'
    HEART = 'heart'
    LAUGH = 'laugh'


class ReportReason(PyEnum):
    """Report reasons."""
    SPAM = 'spam'
    HARASSMENT = 'harassment'
    HATE_SPEECH = 'hate_speech'
    OFF_TOPIC = 'off_topic'
    OTHER = 'other'


class ForumCategory(db.Model):
    """
    Forum category model.

    Top-level organization of forum discussions.
    """
    __tablename__ = 'forum_categories'
    __table_args__ = (
        Index('idx_forum_categories_slug', 'slug', unique=True),
        Index('idx_forum_categories_order', 'order'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid7.uuid7)

    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(50))  # Emoji or icon class
    color = db.Column(db.String(7))  # Hex color

    order = db.Column(db.Integer, default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Moderation settings
    requires_approval = db.Column(db.Boolean, default=False, nullable=False)
    min_user_posts = db.Column(db.Integer, default=0)  # Min posts to create thread

    # Statistics (denormalized)
    thread_count = db.Column(db.Integer, default=0, nullable=False)
    post_count = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    threads = db.relationship('ForumThread', back_populates='category', lazy='dynamic')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'icon': self.icon,
            'color': self.color,
            'thread_count': self.thread_count,
            'post_count': self.post_count,
        }


class ForumThread(db.Model):
    """
    Forum thread/topic model.

    Contains multiple posts as a discussion.
    """
    __tablename__ = 'forum_threads'
    __table_args__ = (
        Index('idx_forum_threads_category', 'category_id'),
        Index('idx_forum_threads_author', 'author_id'),
        Index('idx_forum_threads_pinned', 'is_pinned', 'last_post_at'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid7.uuid7)
    category_id = db.Column(UUID(as_uuid=True), db.ForeignKey('forum_categories.id'), nullable=False)
    author_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)

    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), nullable=False)

    # Editorial fields
    cover_image_url = db.Column(db.String(500))
    subtitle = db.Column(db.String(300))

    # First post content (for preview)
    preview_content = db.Column(db.String(500))

    # Status
    is_pinned = db.Column(db.Boolean, default=False, nullable=False)
    is_locked = db.Column(db.Boolean, default=False, nullable=False)
    is_hidden = db.Column(db.Boolean, default=False, nullable=False)

    # Statistics
    view_count = db.Column(db.Integer, default=0, nullable=False)
    reply_count = db.Column(db.Integer, default=0, nullable=False)

    # Last activity tracking
    last_post_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    last_post_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category = db.relationship('ForumCategory', back_populates='threads')
    author = db.relationship('User', foreign_keys=[author_id])
    last_poster = db.relationship('User', foreign_keys=[last_post_by])
    posts = db.relationship('ForumPost', back_populates='thread', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_posts: bool = False) -> dict:
        """Convert to dictionary for JSON response."""
        data = {
            'id': str(self.id),
            'category_id': str(self.category_id),
            'title': self.title,
            'slug': self.slug,
            'cover_image_url': self.cover_image_url,
            'subtitle': self.subtitle,
            'preview_content': self.preview_content,
            'is_pinned': self.is_pinned,
            'is_locked': self.is_locked,
            'view_count': self.view_count,
            'reply_count': self.reply_count,
            'author': {
                'id': str(self.author.id),
                'username': self.author.username,
                'avatar_url': self.author.avatar_url,
            } if self.author else None,
            'last_post_at': self.last_post_at.isoformat() if self.last_post_at else None,
            'created_at': self.created_at.isoformat(),
        }

        if include_posts:
            data['posts'] = [post.to_dict() for post in self.posts.order_by(ForumPost.created_at)]

        return data


class ForumPost(db.Model):
    """
    Forum post/reply model.

    Individual message within a thread.
    """
    __tablename__ = 'forum_posts'
    __table_args__ = (
        Index('idx_forum_posts_thread', 'thread_id', 'created_at'),
        Index('idx_forum_posts_author', 'author_id'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid7.uuid7)
    thread_id = db.Column(UUID(as_uuid=True), db.ForeignKey('forum_threads.id', ondelete='CASCADE'), nullable=False)
    author_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)

    content = db.Column(db.Text, nullable=False)  # Markdown supported

    # Reply to another post
    reply_to_id = db.Column(UUID(as_uuid=True), db.ForeignKey('forum_posts.id'))

    # Edit tracking
    is_edited = db.Column(db.Boolean, default=False, nullable=False)
    edited_at = db.Column(db.DateTime(timezone=True))
    edit_reason = db.Column(db.String(200))

    # Moderation
    is_hidden = db.Column(db.Boolean, default=False, nullable=False)
    hidden_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))
    hidden_reason = db.Column(db.String(200))

    # Statistics (denormalized)
    like_count = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    thread = db.relationship('ForumThread', back_populates='posts')
    author = db.relationship('User', foreign_keys=[author_id])
    reply_to = db.relationship('ForumPost', remote_side=[id])
    reactions = db.relationship('ForumReaction', back_populates='post', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            'id': str(self.id),
            'thread_id': str(self.thread_id),
            'content': self.content,
            'reply_to_id': str(self.reply_to_id) if self.reply_to_id else None,
            'is_edited': self.is_edited,
            'edited_at': self.edited_at.isoformat() if self.edited_at else None,
            'like_count': self.like_count,
            'author': {
                'id': str(self.author.id),
                'username': self.author.username,
                'avatar_url': self.author.avatar_url,
                'role': self.author.role,
            } if self.author else None,
            'created_at': self.created_at.isoformat(),
        }


class ForumReaction(db.Model):
    """
    Reaction to a forum post.

    Tracks user reactions (like, fire, etc.).
    """
    __tablename__ = 'forum_reactions'
    __table_args__ = (
        CheckConstraint(
            "type IN ('like', 'fire', 'skull', 'heart', 'laugh')",
            name='check_reaction_type_valid'
        ),
    )

    post_id = db.Column(UUID(as_uuid=True), db.ForeignKey('forum_posts.id', ondelete='CASCADE'), primary_key=True)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)

    type = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    post = db.relationship('ForumPost', back_populates='reactions')
    user = db.relationship('User')


class ForumReport(db.Model):
    """
    Report of inappropriate content.

    Moderation queue for reported posts.
    """
    __tablename__ = 'forum_reports'
    __table_args__ = (
        CheckConstraint(
            "reason IN ('spam', 'harassment', 'hate_speech', 'off_topic', 'other')",
            name='check_report_reason_valid'
        ),
        CheckConstraint(
            "status IN ('pending', 'reviewed', 'actioned', 'dismissed')",
            name='check_report_status_valid'
        ),
        Index('idx_forum_reports_status', 'status'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid7.uuid7)
    post_id = db.Column(UUID(as_uuid=True), db.ForeignKey('forum_posts.id'), nullable=False)
    reporter_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)

    reason = db.Column(db.String(20), nullable=False)
    details = db.Column(db.Text)

    status = db.Column(db.String(20), default='pending', nullable=False)
    reviewed_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime(timezone=True))
    review_note = db.Column(db.Text)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    post = db.relationship('ForumPost')
    reporter = db.relationship('User', foreign_keys=[reporter_id])
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])
