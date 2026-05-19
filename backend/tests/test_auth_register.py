"""Integration tests for the /auth endpoints."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import fetch_auth_user as _fetch_auth_user


def test_register_user_returns_201(api: TestClient, unique_email):
    payload = {"name": "Test User", "email": unique_email("register"), "password": "Test@1234"}
    response = api.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data


def test_register_user_duplicate_email_returns_400(api: TestClient, unique_email):
    email = unique_email("dup")
    payload = {"name": "Dup User", "email": email, "password": "Test@1234"}
    assert api.post("/auth/register", json=payload).status_code == 201
    response = api.post("/auth/register", json=payload)
    assert response.status_code == 400


def test_register_user_invalid_email_returns_422(api: TestClient):
    response = api.post("/auth/register", json={"name": "No Email", "email": "not-an-email", "password": "Test@1234"})
    assert response.status_code == 422


def test_register_user_short_password_returns_422(api: TestClient, unique_email):
    response = api.post("/auth/register", json={"name": "Short Pwd", "email": unique_email("short"), "password": "short"})
    assert response.status_code == 422


def test_register_user_hashes_password(api: TestClient, unique_email):
    email = unique_email("hash")
    payload = {"name": "Hash Test", "email": email, "password": "Test@1234"}
    response = api.post("/auth/register", json=payload)
    assert response.status_code == 201
    stored_user = _fetch_auth_user(email)
    assert stored_user is not None
    assert stored_user["email"] == email
    assert stored_user["password_hash"].startswith("$2b$")  # bcrypt hash prefix


def test_register_user_inactive_by_default(api: TestClient, unique_email):
    email = unique_email("inactive")
    payload = {"name": "Inactive Test", "email": email, "password": "Test@1234"}
    response = api.post("/auth/register", json=payload)
    assert response.status_code == 201
    stored_user = _fetch_auth_user(email)
    assert stored_user is not None
    assert stored_user["email"] == email
    assert stored_user["is_active"] is False


def test_users_collection_has_unique_index_on_email(api):
    from tests.conftest import _sync_db
    indexes = _sync_db["auth_users"].index_information()
    matching = [
        info for name, info in indexes.items()
        if any(key == ("email", 1) for key in info.get("key", []))
    ]
    assert len(matching) == 1
    assert matching[0].get("unique") is True


def test_register_duplicate_email_rejected_by_db_index(api):
    import pymongo.errors
    from tests.conftest import _sync_db

    _sync_db["auth_users"].insert_one({
        "id": 99998,
        "employee_id": 99998,
        "email": "dbindex-dup@test.com",
        "password_hash": "$2b$04$hash",
        "auth_role": "employee",
        "is_active": False,
        "must_change_password": False,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    })
    with pytest.raises(pymongo.errors.DuplicateKeyError):
        _sync_db["auth_users"].insert_one({
            "id": 99997,
            "employee_id": 99997,
            "email": "dbindex-dup@test.com",
            "password_hash": "$2b$04$hash2",
            "auth_role": "employee",
            "is_active": False,
            "must_change_password": False,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        })
