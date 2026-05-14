from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_ok():
    """Health endpoint responds 200 with status=ok."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_endpoint_returns_json_content_type():
    """Health endpoint returns JSON content-type."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.headers["content-type"].startswith("application/json")
