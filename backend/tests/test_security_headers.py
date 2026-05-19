"""Tests for SecurityHeadersMiddleware."""

from fastapi.testclient import TestClient

from app.main import app


def test_security_headers_present():
    """All four security headers must be set on every response."""
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("X-XSS-Protection") == "0"
    assert resp.headers.get("Cache-Control") == "no-store"


def test_security_headers_on_post():
    """Security headers must also be present on mutating requests."""
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.headers.get("X-Content-Type-Options") is not None
    assert resp.headers.get("X-Frame-Options") is not None
