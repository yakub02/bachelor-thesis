"""
Basic health check tests.
"""


def test_health_endpoint(client):
    """Test that health endpoint returns OK."""
    response = client.get('/health')
    assert response.status_code == 200

    data = response.get_json()
    assert data['status'] == 'healthy'
    assert data['service'] == 'ticketing'
    assert 'version' in data


def test_health_returns_json(client):
    """Test that health endpoint returns JSON content type."""
    response = client.get('/health')
    assert response.content_type == 'application/json'
