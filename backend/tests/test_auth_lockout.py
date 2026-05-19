"""Tests for account lockout after failed login attempts."""

from datetime import datetime, timezone, timedelta

from tests.conftest import _sync_db


def test_lockout_after_threshold(api):
    """Set failed_attempts to 4, one more wrong login locks the account."""
    email = "admin@ems.com"
    _sync_db["auth_users"].update_one(
        {"email": email},
        {"$set": {"failed_attempts": 4, "locked_until": None}},
    )
    resp = api.post("/auth/login", json={
        "email": email,
        "password": "WrongPassword@123",
    })
    assert resp.status_code == 401
    user = _sync_db["auth_users"].find_one({"email": email})
    assert user["failed_attempts"] == 5
    assert user["locked_until"] is not None


def test_locked_user_gets_generic_error(api):
    """Locked accounts must not reveal they are locked."""
    email = "employee@ems.com"
    _sync_db["auth_users"].update_one(
        {"email": email},
        {"$set": {
            "failed_attempts": 5,
            "locked_until": datetime.now(timezone.utc) + timedelta(minutes=15),
        }},
    )
    resp = api.post("/auth/login", json={
        "email": email,
        "password": "Employee@1234",
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


def test_locked_user_can_login_after_expiry(api):
    """Once locked_until is in the past, login succeeds."""
    email = "employee@ems.com"
    _sync_db["auth_users"].update_one(
        {"email": email},
        {"$set": {
            "failed_attempts": 5,
            "locked_until": datetime.now(timezone.utc) - timedelta(minutes=1),
        }},
    )
    resp = api.post("/auth/login", json={
        "email": email,
        "password": "Employee@1234",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_successful_login_resets_failed_attempts(api):
    """A successful login resets failed_attempts and locked_until."""
    email = "admin@ems.com"
    _sync_db["auth_users"].update_one(
        {"email": email},
        {"$set": {"failed_attempts": 3, "locked_until": None}},
    )
    resp = api.post("/auth/login", json={
        "email": email,
        "password": "Admin@1234",
    })
    assert resp.status_code == 200
    user = _sync_db["auth_users"].find_one({"email": email})
    assert user["failed_attempts"] == 0
    assert user["locked_until"] is None
