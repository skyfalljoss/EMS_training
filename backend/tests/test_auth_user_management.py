"""Tests for admin auth user management endpoints."""


def test_create_auth_user(api, auth_headers, unique_email):
    """Admin can create a new auth user linked to an existing employee."""
    email = unique_email("auser")
    resp = api.post("/auth/users", json={
        "employee_id": 1,
        "email": email,
        "password": "TestUser@1234",
        "auth_role": "employee",
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["id"] > 0


def test_create_auth_user_duplicate_email(api, auth_headers):
    """Creating with an existing email returns 400."""
    resp = api.post("/auth/users", json={
        "employee_id": 1,
        "email": "employee@ems.com",
        "password": "TestUser@1234",
        "auth_role": "employee",
    }, headers=auth_headers)
    assert resp.status_code == 400


def test_create_auth_user_invalid_employee(api, auth_headers, unique_email):
    """Creating with a non-existent employee_id returns 400."""
    resp = api.post("/auth/users", json={
        "employee_id": 99999,
        "email": unique_email("noemp"),
        "password": "TestUser@1234",
        "auth_role": "employee",
    }, headers=auth_headers)
    assert resp.status_code == 400


def test_create_auth_user_must_change_password(api, auth_headers, unique_email):
    """Admin-created users must have must_change_password=True."""
    email = unique_email("mustchg")
    resp = api.post("/auth/users", json={
        "employee_id": 1,
        "email": email,
        "password": "TestUser@1234",
        "auth_role": "employee",
    }, headers=auth_headers)
    assert resp.status_code == 201
    created_id = resp.json()["id"]
    list_resp = api.get("/auth/users", headers=auth_headers)
    created = next(u for u in list_resp.json() if u["id"] == created_id)
    assert created["must_change_password"] is True


def test_list_auth_users(api, auth_headers):
    """Admin can list all auth users."""
    resp = api.get("/auth/users", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    assert len(body) >= 3
    assert {"id", "email", "auth_role", "is_active"} <= set(body[0].keys())
    # password_hash must never leak
    assert "password_hash" not in body[0]


def test_activate_user(api, auth_headers, unique_email):
    """Admin can activate a registered (inactive) user."""
    # Register a new user (inactive by default)
    email = unique_email("actv")
    api.post("/auth/register", json={
        "name": "Activate Me", "email": email, "password": "TestUser@1234",
    })

    # Admin activates the user
    list_resp = api.get("/auth/users", headers=auth_headers)
    created = next(u for u in list_resp.json() if u["email"] == email)
    assert created["is_active"] is False

    resp = api.put(f"/auth/users/{created['id']}/activate", headers=auth_headers)
    assert resp.status_code == 200

    # Verify
    list_resp2 = api.get("/auth/users", headers=auth_headers)
    activated = next(u for u in list_resp2.json() if u["email"] == email)
    assert activated["is_active"] is True


def test_activate_user_not_found(api, auth_headers):
    """Activating a non-existent user returns 404."""
    resp = api.put("/auth/users/99999/activate", headers=auth_headers)
    assert resp.status_code == 404


def test_reject_user(api, auth_headers, unique_email):
    """Admin can reject (delete) a registered user."""
    email = unique_email("rej")
    api.post("/auth/register", json={
        "name": "Reject Me", "email": email, "password": "TestUser@1234",
    })
    list_resp = api.get("/auth/users", headers=auth_headers)
    created = next(u for u in list_resp.json() if u["email"] == email)

    resp = api.delete(f"/auth/users/{created['id']}", headers=auth_headers)
    assert resp.status_code == 200

    # Verify deleted
    list_resp2 = api.get("/auth/users", headers=auth_headers)
    assert not any(u["email"] == email for u in list_resp2.json())


def test_reject_user_not_found(api, auth_headers):
    """Deleting a non-existent user returns 404."""
    resp = api.delete("/auth/users/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_employee_delete_cascades_to_auth_user(api, auth_headers, unique_email):
    """Deleting an employee also deletes the linked auth_user."""
    emp_resp = api.post("/employees/", json={
        "name": "Cascade Emp", "email": unique_email("cacemp"),
        "role": "Eng", "department_id": 1,
    }, headers=auth_headers)
    emp_id = emp_resp.json()["id"]

    auth_resp = api.post("/auth/users", json={
        "employee_id": emp_id,
        "email": unique_email("cacusr"),
        "password": "Cascade@1234",
        "auth_role": "employee",
    }, headers=auth_headers)
    auth_id = auth_resp.json()["id"]

    resp = api.delete(f"/employees/{emp_id}", headers=auth_headers)
    assert resp.status_code == 200

    list_resp = api.get("/auth/users", headers=auth_headers)
    assert not any(u["id"] == auth_id for u in list_resp.json())


def test_employee_delete_without_auth_user_still_works(api, auth_headers, unique_email):
    """Deleting an employee with no linked auth_user does not crash."""
    emp_resp = api.post("/employees/", json={
        "name": "No Auth", "email": unique_email("noauth"),
        "role": "Eng", "department_id": 1,
    }, headers=auth_headers)
    resp = api.delete(f"/employees/{emp_resp.json()['id']}", headers=auth_headers)
    assert resp.status_code == 200


def test_reject_user_does_not_delete_employee(api, auth_headers, unique_email):
    """Rejecting (deleting) an auth user keeps the linked employee alive."""
    emp_resp = api.post("/employees/", json={
        "name": "Keep Emp", "email": unique_email("keepe"),
        "role": "Eng", "department_id": 1,
    }, headers=auth_headers)
    emp_id = emp_resp.json()["id"]

    email = unique_email("cac")
    auth_resp = api.post("/auth/users", json={
        "employee_id": emp_id,
        "email": email,
        "password": "TestUser@1234",
        "auth_role": "employee",
    }, headers=auth_headers)
    user_id = auth_resp.json()["id"]

    resp = api.delete(f"/auth/users/{user_id}", headers=auth_headers)
    assert resp.status_code == 200

    get_resp = api.get(f"/employees/{emp_id}", headers=auth_headers)
    assert get_resp.status_code == 200


def test_non_admin_cannot_create_auth_user(api, employee_headers, unique_email):
    """Employee role cannot create auth users."""
    resp = api.post("/auth/users", json={
        "employee_id": 1,
        "email": unique_email("noadmin"),
        "password": "TestUser@1234",
        "auth_role": "employee",
    }, headers=employee_headers)
    assert resp.status_code == 403


def test_non_admin_cannot_list_auth_users(api, employee_headers):
    """Employee role cannot list auth users."""
    resp = api.get("/auth/users", headers=employee_headers)
    assert resp.status_code == 403


def test_non_admin_cannot_activate_user(api, manager_headers):
    """Manager role cannot activate a user."""
    resp = api.put("/auth/users/1/activate", headers=manager_headers)
    assert resp.status_code == 403


def test_non_admin_cannot_reject_user(api, manager_headers):
    """Manager role cannot reject a user."""
    resp = api.delete("/auth/users/1", headers=manager_headers)
    assert resp.status_code == 403
