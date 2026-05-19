"""Tests for PUT /auth/password — password change edge cases."""


def test_change_password_wrong_old_password(api, auth_headers):
    """Wrong old password returns 401."""
    resp = api.put("/auth/password", json={
        "old_password": "WrongPassword@123",
        "new_password": "NewPassw0rd!",
    }, headers=auth_headers)
    assert resp.status_code == 401
    assert "incorrect" in resp.json()["detail"].lower()


def test_change_password_invalid_new_password(api, auth_headers):
    """New password failing complexity rules returns 422."""
    resp = api.put("/auth/password", json={
        "old_password": "Admin@1234",
        "new_password": "short",
    }, headers=auth_headers)
    assert resp.status_code == 422


def test_change_password_no_uppercase(api, auth_headers):
    """New password without uppercase returns 422."""
    resp = api.put("/auth/password", json={
        "old_password": "Admin@1234",
        "new_password": "nouppercase@123",
    }, headers=auth_headers)
    assert resp.status_code == 422


def test_change_password_no_digit(api, auth_headers):
    """New password without digit returns 422."""
    resp = api.put("/auth/password", json={
        "old_password": "Admin@1234",
        "new_password": "NoDigit!@#",
    }, headers=auth_headers)
    assert resp.status_code == 422


def test_change_password_no_special_char(api, auth_headers):
    """New password without special character returns 422."""
    resp = api.put("/auth/password", json={
        "old_password": "Admin@1234",
        "new_password": "NoSpecialChar1",
    }, headers=auth_headers)
    assert resp.status_code == 422


def test_change_password_without_auth(api):
    """Password change without authentication returns 401."""
    resp = api.put("/auth/password", json={
        "old_password": "Admin@1234",
        "new_password": "NewAdmin@5678",
    })
    assert resp.status_code == 401


def test_change_password_with_expired_password(api):
    """A user with must_change_password=True can still change it."""
    from tests.conftest import set_password_state
    set_password_state("employee@ems.com", must_change_password=True)
    from tests.conftest import EMPLOYEE_TOKEN
    headers = {"Authorization": f"Bearer {EMPLOYEE_TOKEN}"}
    resp = api.put("/auth/password", json={
        "old_password": "Employee@1234",
        "new_password": "NewEmp@5678!",
    }, headers=headers)
    assert resp.status_code == 200
    assert "access_token" in resp.json()
