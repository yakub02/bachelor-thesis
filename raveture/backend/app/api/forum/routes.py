"""
Forum routes.
Handles forum categories, threads, posts, and reactions.
"""

from datetime import datetime

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError

from app import db, limiter
from app.api.forum import forum_bp
from app.models.forum import ForumCategory, ForumThread, ForumPost, ForumReaction, ForumReport
from app.utils.security import generate_slug
from app.utils.validators import ForumThreadCreate, ForumPostCreate


@forum_bp.route('/categories', methods=['GET'])
@limiter.limit('60/minute')
def list_categories():
    """List forum categories."""
    categories = ForumCategory.query.filter_by(is_active=True)\
        .order_by(ForumCategory.order).all()

    return jsonify({'categories': [c.to_dict() for c in categories]})


@forum_bp.route('/categories/<slug>', methods=['GET'])
@limiter.limit('60/minute')
def get_category(slug: str):
    """Get category details."""
    category = ForumCategory.query.filter_by(slug=slug, is_active=True).first()

    if not category:
        return jsonify({'error': 'Category not found'}), 404

    return jsonify({'category': category.to_dict()})


@forum_bp.route('/categories/<slug>/threads', methods=['GET'])
@limiter.limit('60/minute')
def list_threads(slug: str):
    """List threads in a category."""
    category = ForumCategory.query.filter_by(slug=slug, is_active=True).first()

    if not category:
        return jsonify({'error': 'Category not found'}), 404

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    # Pinned threads first, then by last activity
    query = ForumThread.query.filter_by(
        category_id=category.id,
        is_hidden=False
    ).order_by(
        ForumThread.is_pinned.desc(),
        ForumThread.last_post_at.desc()
    )

    threads = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'category': category.to_dict(),
        'threads': [t.to_dict() for t in threads.items],
        'total': threads.total,
        'page': page,
        'pages': threads.pages,
    })


@forum_bp.route('/threads', methods=['POST'])
@jwt_required()
@limiter.limit('5/minute')
def create_thread():
    """Create a new thread."""
    user_id = get_jwt_identity()

    try:
        data = ForumThreadCreate(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    category = ForumCategory.query.get(data.category_id)
    if not category or not category.is_active:
        return jsonify({'error': 'Category not found'}), 404

    # Generate slug
    slug = generate_slug(data.title)

    thread = ForumThread(
        category_id=category.id,
        author_id=user_id,
        title=data.title,
        slug=slug,
        preview_content=data.content[:500] if len(data.content) > 500 else data.content,
        last_post_at=datetime.utcnow(),
        last_post_by=user_id,
    )

    db.session.add(thread)
    db.session.flush()  # Get thread ID

    # Create first post
    first_post = ForumPost(
        thread_id=thread.id,
        author_id=user_id,
        content=data.content,
    )

    db.session.add(first_post)

    # Update category stats
    category.thread_count += 1
    category.post_count += 1

    db.session.commit()

    return jsonify({
        'message': 'Thread created',
        'thread': thread.to_dict(),
    }), 201


@forum_bp.route('/threads/<thread_id>', methods=['GET'])
@limiter.limit('60/minute')
def get_thread(thread_id: str):
    """Get thread with posts."""
    thread = ForumThread.query.get(thread_id)

    if not thread or thread.is_hidden:
        return jsonify({'error': 'Thread not found'}), 404

    # Increment view count
    thread.view_count += 1
    db.session.commit()

    # Paginate posts
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    posts = ForumPost.query.filter_by(
        thread_id=thread_id,
        is_hidden=False
    ).order_by(ForumPost.created_at).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'thread': thread.to_dict(),
        'posts': [p.to_dict() for p in posts.items],
        'total_posts': posts.total,
        'page': page,
        'pages': posts.pages,
    })


@forum_bp.route('/threads/<thread_id>/posts', methods=['POST'])
@jwt_required()
@limiter.limit('10/minute')
def create_post(thread_id: str):
    """Add a post to a thread."""
    user_id = get_jwt_identity()

    thread = ForumThread.query.get(thread_id)
    if not thread or thread.is_hidden:
        return jsonify({'error': 'Thread not found'}), 404

    if thread.is_locked:
        return jsonify({'error': 'Thread is locked'}), 403

    try:
        data = ForumPostCreate(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'details': e.errors()}), 400

    post = ForumPost(
        thread_id=thread_id,
        author_id=user_id,
        content=data.content,
        reply_to_id=data.reply_to_id,
    )

    db.session.add(post)

    # Update thread
    thread.reply_count += 1
    thread.last_post_at = datetime.utcnow()
    thread.last_post_by = user_id

    # Update category
    thread.category.post_count += 1

    db.session.commit()

    return jsonify({
        'message': 'Post created',
        'post': post.to_dict(),
    }), 201


@forum_bp.route('/posts/<post_id>', methods=['PUT'])
@jwt_required()
@limiter.limit('10/minute')
def edit_post(post_id: str):
    """Edit a post."""
    user_id = get_jwt_identity()

    post = ForumPost.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    if str(post.author_id) != user_id:
        return jsonify({'error': 'Not authorized'}), 403

    data = request.get_json()
    content = data.get('content')

    if not content or len(content) < 1:
        return jsonify({'error': 'Content required'}), 400

    post.content = content
    post.is_edited = True
    post.edited_at = datetime.utcnow()
    post.edit_reason = data.get('edit_reason')

    db.session.commit()

    return jsonify({
        'message': 'Post updated',
        'post': post.to_dict(),
    })


@forum_bp.route('/posts/<post_id>/react', methods=['POST'])
@jwt_required()
@limiter.limit('60/minute')
def react_to_post(post_id: str):
    """Add reaction to a post."""
    user_id = get_jwt_identity()

    post = ForumPost.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    data = request.get_json()
    reaction_type = data.get('type', 'like')

    valid_types = ['like', 'fire', 'skull', 'heart', 'laugh']
    if reaction_type not in valid_types:
        return jsonify({'error': f'Invalid reaction type. Must be one of: {valid_types}'}), 400

    # Check existing
    existing = ForumReaction.query.filter_by(
        post_id=post_id,
        user_id=user_id
    ).first()

    if existing:
        if existing.type == reaction_type:
            # Remove reaction
            db.session.delete(existing)
            if reaction_type == 'like':
                post.like_count = max(0, post.like_count - 1)
            db.session.commit()
            return jsonify({'message': 'Reaction removed'})
        else:
            # Change reaction
            if existing.type == 'like':
                post.like_count = max(0, post.like_count - 1)
            existing.type = reaction_type
            if reaction_type == 'like':
                post.like_count += 1
    else:
        # New reaction
        reaction = ForumReaction(
            post_id=post_id,
            user_id=user_id,
            type=reaction_type
        )
        db.session.add(reaction)
        if reaction_type == 'like':
            post.like_count += 1

    db.session.commit()

    return jsonify({'message': 'Reaction added'})


@forum_bp.route('/posts/<post_id>/report', methods=['POST'])
@jwt_required()
@limiter.limit('5/minute')
def report_post(post_id: str):
    """Report a post."""
    user_id = get_jwt_identity()

    post = ForumPost.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    data = request.get_json()
    reason = data.get('reason')

    valid_reasons = ['spam', 'harassment', 'hate_speech', 'off_topic', 'other']
    if reason not in valid_reasons:
        return jsonify({'error': f'Invalid reason. Must be one of: {valid_reasons}'}), 400

    # Check if already reported by this user
    existing = ForumReport.query.filter_by(
        post_id=post_id,
        reporter_id=user_id,
        status='pending'
    ).first()

    if existing:
        return jsonify({'error': 'Already reported'}), 400

    report = ForumReport(
        post_id=post_id,
        reporter_id=user_id,
        reason=reason,
        details=data.get('details'),
    )

    db.session.add(report)
    db.session.commit()

    return jsonify({'message': 'Report submitted'})


@forum_bp.route('/recent', methods=['GET'])
@limiter.limit('60/minute')
def recent_activity():
    """Get recent forum activity."""
    limit = min(request.args.get('limit', 10, type=int), 50)

    threads = ForumThread.query.filter_by(is_hidden=False)\
        .order_by(ForumThread.last_post_at.desc())\
        .limit(limit).all()

    return jsonify({'threads': [t.to_dict() for t in threads]})
