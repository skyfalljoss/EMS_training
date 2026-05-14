"""Tests for RBAC permission enforcement."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def api():
    with TestClient(app) as client:
        yield client


def test_unauthenticated_fails(api):
    resp = api.get("/departments/")
    assert resp.status_code == 401


def test_employee_cannot_create_employee(api, employee_headers):
    resp = api.post("/employees/", json={
        "name": "Fail", "email": "fail@test.com",
        "role": "Eng", "department_id": 1,
    }, headers=employee_headers)
    assert resp.status_code == 403


def test_employee_cannot_delete_employee(api, employee_headers):
    resp = api.delete("/employees/1", headers=employee_headers)
    assert resp.status_code == 403


def test_manager_cannot_delete_employee(api, manager_headers):
    resp = api.delete("/employees/1", headers=manager_headers)
    assert resp.status_code == 403


def test_admin_can_delete_employee(api, auth_headers):
    created = api.post("/employees/", json={
        "name": "DeleteMe", "email": "del@test.com",
        "role": "Eng", "department_id": 1,
    }, headers=auth_headers).json()
    resp = api.delete(f"/employees/{created['id']}", headers=auth_headers)
    assert resp.status_code == 200


def test_employee_cannot_create_department(api, employee_headers):
    resp = api.post("/departments/", json={
        "name": "Fail", "code": "FAIL",
    }, headers=employee_headers)
    assert resp.status_code == 403


def test_employee_cannot_delete_department(api, employee_headers):
    resp = api.delete("/departments/1", headers=employee_headers)
    assert resp.status_code == 403


def test_manager_cannot_delete_department(api, manager_headers):
    resp = api.delete("/departments/1", headers=manager_headers)
    assert resp.status_code == 403


def test_admin_can_create_department(api, auth_headers):
    import uuid
    code = f"T{uuid.uuid4().hex[:4].upper()}"
    resp = api.post("/departments/", json={
        "name": "Test Dept", "code": code,
    }, headers=auth_headers)
    assert resp.status_code == 201


def test_health_is_public(api):
    resp = api.get("/health")
    assert resp.status_code == 200
