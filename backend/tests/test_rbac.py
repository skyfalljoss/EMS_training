"""Tests for RBAC permission enforcement."""

import uuid


def test_unauthenticated_fails(api):
    resp = api.get("/departments/")
    assert resp.status_code == 401


def test_employee_can_create_employee(api, employee_headers, unique_email):
    resp = api.post("/employees/", json={
        "name": "By Employee", "email": unique_email("e"),
        "role": "Eng", "department_id": 1,
    }, headers=employee_headers)
    assert resp.status_code == 201


def test_employee_cannot_update_employee(api, employee_headers):
    resp = api.put("/employees/3", json={"phone": "+1 555 000 0000"},
                   headers=employee_headers)
    assert resp.status_code == 403


def test_employee_cannot_delete_employee(api, employee_headers):
    resp = api.delete("/employees/1", headers=employee_headers)
    assert resp.status_code == 403


def test_manager_cannot_delete_employee(api, manager_headers):
    resp = api.delete("/employees/1", headers=manager_headers)
    assert resp.status_code == 403


def test_admin_can_delete_employee(api, auth_headers, unique_email):
    created = api.post("/employees/", json={
        "name": "DeleteMe", "email": unique_email("del"),
        "role": "Eng", "department_id": 1,
    }, headers=auth_headers).json()
    resp = api.delete(f"/employees/{created['id']}", headers=auth_headers)
    assert resp.status_code == 200


def test_employee_can_create_department(api, employee_headers):
    code = f"E{uuid.uuid4().hex[:4].upper()}"
    resp = api.post("/departments/", json={
        "name": "By Employee", "code": code,
    }, headers=employee_headers)
    assert resp.status_code == 201


def test_employee_cannot_update_department(api, employee_headers):
    resp = api.put("/departments/1", json={"name": "Renamed"},
                   headers=employee_headers)
    assert resp.status_code == 403


def test_employee_cannot_delete_department(api, employee_headers):
    resp = api.delete("/departments/1", headers=employee_headers)
    assert resp.status_code == 403


def test_manager_cannot_delete_department(api, manager_headers):
    resp = api.delete("/departments/1", headers=manager_headers)
    assert resp.status_code == 403


def test_manager_can_update_department(api, manager_headers):
    resp = api.put("/departments/1", json={"name": "Engineering Renamed"},
                   headers=manager_headers)
    assert resp.status_code == 200


def test_admin_can_create_department(api, auth_headers):
    code = f"T{uuid.uuid4().hex[:4].upper()}"
    resp = api.post("/departments/", json={
        "name": "Test Dept", "code": code,
    }, headers=auth_headers)
    assert resp.status_code == 201


def test_health_is_public(api):
    resp = api.get("/health")
    assert resp.status_code == 200
