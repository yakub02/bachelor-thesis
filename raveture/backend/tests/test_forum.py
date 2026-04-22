"""
Unit tests for forum routes – Task 6.
"""

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_admin_and_category(client, app):
    """Register an admin user and insert a ForumCategory directly into the DB."""
    r = client.post('/api/v1/auth/register', json={
        'email': 'forum_admin@example.com',
        'username': 'forum_admin',
        'password': 'AdminPass123!',
    })
    token = r.get_json()['access_token']

    with app.app_context():
        from app import db
        from app.models.user import User
        from app.models.forum import ForumCategory

        user = User.query.filter_by(email='forum_admin@example.com').first()
        user.role = 'admin'

        cat = ForumCategory(
            name='General',
            slug='general',
            description='General discussion',
        )
        db.session.add(cat)
        db.session.commit()
        cat_id = str(cat.id)
        cat_slug = cat.slug

    admin_headers = {'Authorization': f'Bearer {token}'}
    return admin_headers, cat_slug, cat_id


def _register(client, email, username):
    """Register a plain user and return auth headers."""
    r = client.post('/api/v1/auth/register', json={
        'email': email,
        'username': username,
        'password': 'ForumPass123!',
    })
    data = r.get_json()
    return {'Authorization': f'Bearer {data["access_token"]}'}


# ---------------------------------------------------------------------------
# TestForumCategories
# ---------------------------------------------------------------------------

class TestForumCategories:

    def test_list_categories_returns_200(self, client, app):
        """GET /categories should return 200 with a 'categories' list."""
        _make_admin_and_category(client, app)

        r = client.get('/api/v1/forum/categories')
        assert r.status_code == 200
        data = r.get_json()
        assert 'categories' in data
        assert len(data['categories']) >= 1
        # Verify shape of first category
        cat = data['categories'][0]
        assert 'id' in cat
        assert 'name' in cat
        assert 'slug' in cat

    def test_get_category_not_found(self, client, app):
        """GET /categories/<slug> with unknown slug returns 404."""
        r = client.get('/api/v1/forum/categories/does-not-exist')
        assert r.status_code == 404
        data = r.get_json()
        assert 'error' in data


# ---------------------------------------------------------------------------
# TestForumThreads
# ---------------------------------------------------------------------------

class TestForumThreads:

    def test_create_thread_requires_auth(self, client, app):
        """POST /threads without token should return 401."""
        r = client.post('/api/v1/forum/threads', json={
            'title': 'No auth thread',
            'content': 'This should fail because no auth.',
            'category_id': 'fake-id',
        })
        assert r.status_code == 401

    def test_create_thread_success(self, client, app):
        """Authenticated user can create a thread."""
        admin_headers, cat_slug, cat_id = _make_admin_and_category(client, app)
        user_headers = _register(client, 'thread_author@example.com', 'thread_author')

        r = client.post('/api/v1/forum/threads', headers=user_headers, json={
            'title': 'My Test Thread',
            'content': 'This is the first post content.',
            'category_id': cat_id,
        })
        assert r.status_code == 201
        data = r.get_json()
        assert 'thread' in data
        thread = data['thread']
        assert thread['title'] == 'My Test Thread'
        assert 'id' in thread

    def test_get_thread_returns_posts(self, client, app):
        """GET /threads/<id> returns thread details and posts list."""
        admin_headers, cat_slug, cat_id = _make_admin_and_category(client, app)
        user_headers = _register(client, 'thread_getter@example.com', 'thread_getter')

        # Create thread
        create_r = client.post('/api/v1/forum/threads', headers=user_headers, json={
            'title': 'Thread With Posts',
            'content': 'Initial content for this thread.',
            'category_id': cat_id,
        })
        assert create_r.status_code == 201
        thread_id = create_r.get_json()['thread']['id']

        # Fetch thread
        r = client.get(f'/api/v1/forum/threads/{thread_id}')
        assert r.status_code == 200
        data = r.get_json()
        assert 'thread' in data
        assert 'posts' in data
        assert data['thread']['id'] == thread_id
        # The first post should have been created automatically
        assert len(data['posts']) >= 1


# ---------------------------------------------------------------------------
# TestForumPosts
# ---------------------------------------------------------------------------

class TestForumPosts:

    def _setup(self, client, app):
        """Create category, thread, and return ids + headers."""
        admin_headers, cat_slug, cat_id = _make_admin_and_category(client, app)
        user_headers = _register(client, 'post_user@example.com', 'post_user')

        create_r = client.post('/api/v1/forum/threads', headers=user_headers, json={
            'title': 'Post Test Thread',
            'content': 'Starting content for post tests.',
            'category_id': cat_id,
        })
        assert create_r.status_code == 201
        thread_id = create_r.get_json()['thread']['id']
        return user_headers, thread_id

    def test_create_post_success(self, client, app):
        """Authenticated user can reply to an existing thread."""
        user_headers, thread_id = self._setup(client, app)

        r = client.post(
            f'/api/v1/forum/threads/{thread_id}/posts',
            headers=user_headers,
            json={'content': 'This is a reply to the thread.'},
        )
        assert r.status_code == 201
        data = r.get_json()
        assert 'post' in data
        post = data['post']
        assert post['content'] == 'This is a reply to the thread.'
        assert post['thread_id'] == thread_id

    def test_react_to_post_success(self, client, app):
        """Authenticated user can react to a post."""
        user_headers, thread_id = self._setup(client, app)

        # Get the first post id from the thread
        thread_r = client.get(f'/api/v1/forum/threads/{thread_id}')
        post_id = thread_r.get_json()['posts'][0]['id']

        # React with 'like'
        reactor_headers = _register(client, 'reactor@example.com', 'reactor')
        r = client.post(
            f'/api/v1/forum/posts/{post_id}/react',
            headers=reactor_headers,
            json={'type': 'like'},
        )
        assert r.status_code == 200
        data = r.get_json()
        assert 'message' in data
        assert data['message'] in ('Reaction added', 'Reaction removed')
