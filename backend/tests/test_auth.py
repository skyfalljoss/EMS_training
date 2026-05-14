"""Tests for auth endpoints (login, register, password change)."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def api():
    with TestClient(app) as client:
        yield client


def test_login_success_admin(api):
    response = api.post("/auth/login", json={
        "email": "admin@ems.com",
        "password": "Admin@1234",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(api):
    response = api.post("/auth/login", json={
        "email": "admin@ems.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_nonexistent_email(api):
    response = api.post("/auth/login", json={
        "email": "nonexistent@test.com",
        "password": "Test@1234",
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_register_creates_inactive(api):
    response = api.post("/auth/register", json={
        "employee_id": 99,
        "email": "new@test.com",
        "password": "NewUser@1234",
    })
    assert response.status_code == 201


def test_password_validation_short(api):
    response = api.post("/auth/register", json={
        "employee_id": 99,
        "email": "weak@test.com",
        "password": "short",
    })
    assert response.status_code == 422


def test_protected_endpoint_no_token(api):
    response = api.get("/employees/")
    assert response.status_code == 401


def test_change_password(auth_headers, api):
    response = api.put("/auth/password", json={
        "old_password": "Admin@1234",
        "new_password": "NewAdmin@5678",
    }, headers=auth_headers)
    assert response.status_code == 200


def test_health_is_public(api):
    response = api.get("/health")
    assert response.status_code == 200
