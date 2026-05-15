"""Integration tests for the /auth endpoints."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def api():
    with TestClient(app) as client:
        yield client


def _unique_email(prefix: str = "user") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@test.com"


def test_register_user_returns_201(api: TestClient):
    payload = {"name": "Test User", "email": _unique_email("register"), "password": "Test@1234"}
    response = api.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data


def test_register_user_duplicate_email_returns_400(api: TestClient):
    email = _unique_email("dup")
    payload = {"name": "Dup User", "email": email, "password": "Test@1234"}
    assert api.post("/auth/register", json=payload).status_code == 201
    response = api.post("/auth/register", json=payload)
    assert response.status_code == 400


def test_register_user_invalid_email_returns_422(api: TestClient):
    response = api.post("/auth/register", json={"name": "No Email", "email": "not-an-email", "password": "Test@1234"})
    assert response.status_code == 422


def test_register_user_short_password_returns_422(api: TestClient):
    response = api.post("/auth/register", json={"name": "Short Pwd", "email": _unique_email("short"), "password": "short"})
    assert response.status_code == 422
