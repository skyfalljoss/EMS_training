"""Tests for the RateLimitMiddleware.

Constants matching app/middleware/ratelimit.py:
    LOGIN_RATE_LIMIT    = 5   max requests per window
    REGISTER_RATE_LIMIT = 3
    WINDOW_SECONDS      = 60
"""

import pytest
from fastapi.testclient import TestClient

from app.middleware.ratelimit import LOGIN_RATE_LIMIT, REGISTER_RATE_LIMIT


@pytest.fixture
def rate_limit_key() -> str:
    """Return the key the middleware uses to identify this test client.

    TestClient sets request.client.host to "testclient".
    """
    return "testclient"


def _trigger_login_rate_limit(api: TestClient, count: int, password: str = "WrongPass@1") -> list[int]:
    codes: list[int] = []
    for _ in range(count):
        resp = api.post("/auth/login", json={"email": "admin@ems.com", "password": password})
        codes.append(resp.status_code)
    return codes


def _trigger_register_rate_limit(api: TestClient, count: int) -> list[int]:
    codes: list[int] = []
    for i in range(count):
        resp = api.post("/auth/register", json={
            "name": f"Spam {i}",
            "email": f"spam{i}@example.com",
            "password": "Test@1234",
        })
        codes.append(resp.status_code)
    return codes


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_login_rate_limit_returns_429_after_threshold(api):
    codes = _trigger_login_rate_limit(api, LOGIN_RATE_LIMIT + 1)
    assert all(c == 401 for c in codes[:LOGIN_RATE_LIMIT])
    assert codes[LOGIN_RATE_LIMIT] == 429


def test_login_rate_limit_response_has_retry_after_header(api):
    codes = _trigger_login_rate_limit(api, LOGIN_RATE_LIMIT + 1)
    assert codes[LOGIN_RATE_LIMIT] == 429
    last_resp = api.post("/auth/login", json={"email": "x@x.com", "password": "WrongPass@1"})
    assert last_resp.status_code == 429
    assert "retry-after" in {h.lower() for h in last_resp.headers}


def test_login_rate_limit_valid_user_blocked_too(api):
    codes = _trigger_login_rate_limit(api, LOGIN_RATE_LIMIT + 1, password="Admin@1234")
    assert all(c == 200 for c in codes[:LOGIN_RATE_LIMIT])
    assert codes[LOGIN_RATE_LIMIT] == 429


def test_register_rate_limit_returns_429_after_threshold(api):
    codes = _trigger_register_rate_limit(api, REGISTER_RATE_LIMIT + 1)
    assert all(c == 201 for c in codes[:REGISTER_RATE_LIMIT])
    assert codes[REGISTER_RATE_LIMIT] == 429


def test_health_endpoint_not_rate_limited(api):
    _trigger_login_rate_limit(api, LOGIN_RATE_LIMIT + 1)
    resp = api.get("/health")
    assert resp.status_code == 200


def test_get_employees_not_blocked_by_login_rate_limit(api, auth_headers):
    _trigger_login_rate_limit(api, LOGIN_RATE_LIMIT + 1)
    resp = api.get("/employees", headers=auth_headers)
    assert resp.status_code == 200
