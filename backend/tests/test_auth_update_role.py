"""Tests for PUT /auth/users/{user_id}/role."""

from fastapi.testclient import TestClient


def test_admin_can_change_user_role(api: TestClient, auth_headers: dict, unique_email: callable):
    """Admin can change another user's role from employee to manager."""
    email = unique_email("role")
    payload = {
        "employee_id": 1,
        "email": email,
        "password": "Test@1234",
        "auth_role": "employee",
    }
    create_resp = api.post("/auth/users", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201
    user_id = create_resp.json()["id"]

    update_resp = api.put(
        f"/auth/users/{user_id}/role",
        json={"auth_role": "manager"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["message"] == "User role updated"

    # Verify via list
    list_resp = api.get("/auth/users", headers=auth_headers)
    users = list_resp.json()
    updated = next(u for u in users if u["id"] == user_id)
    assert updated["auth_role"] == "manager"


def test_manager_cannot_change_role(api: TestClient, manager_headers: dict, auth_headers: dict, unique_email: callable):
    """Manager gets 403 when trying to change a user's role."""
    email = unique_email("role2")
    payload = {
        "employee_id": 1,
        "email": email,
        "password": "Test@1234",
        "auth_role": "employee",
    }
    create_resp = api.post("/auth/users", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201
    user_id = create_resp.json()["id"]

    resp = api.put(
        f"/auth/users/{user_id}/role",
        json={"auth_role": "admin"},
        headers=manager_headers,
    )
    assert resp.status_code == 403


def test_employee_cannot_change_role(api: TestClient, employee_headers: dict, auth_headers: dict, unique_email: callable):
    """Employee gets 403 when trying to change a user's role."""
    email = unique_email("role3")
    payload = {
        "employee_id": 1,
        "email": email,
        "password": "Test@1234",
        "auth_role": "employee",
    }
    create_resp = api.post("/auth/users", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201
    user_id = create_resp.json()["id"]

    resp = api.put(
        f"/auth/users/{user_id}/role",
        json={"auth_role": "admin"},
        headers=employee_headers,
    )
    assert resp.status_code == 403


def test_change_role_not_found(api: TestClient, auth_headers: dict):
    """Changing role for non-existent user returns 404."""
    resp = api.put(
        "/auth/users/99999/role",
        json={"auth_role": "manager"},
        headers=auth_headers,
    )
    assert resp.status_code == 404
