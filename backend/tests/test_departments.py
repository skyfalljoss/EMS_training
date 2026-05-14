"""Integration tests for the /departments endpoints.

These tests use the FastAPI TestClient. They rely on the app's startup hook
to seed the sample departments on first run.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def api():
    with TestClient(app) as client:
        yield client


def _dept_payload(code_suffix: str = "DEV") -> dict:
    return {
        "name": "Development",
        "code": f"DEV{code_suffix}",
        "description": "Software development team",
        "head": "Alice",
        "status": "active",
    }


def test_list_departments_returns_seed_data(api, auth_headers):
    response = api.get("/departments", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 4
    assert {"id", "name", "code", "status"} <= set(body[0].keys())


def test_get_department_by_id(api, auth_headers):
    response = api.get("/departments/1", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == 1


def test_get_department_not_found(api, auth_headers):
    response = api.get("/departments/9999", headers=auth_headers)
    assert response.status_code == 404


def test_create_department_success(api, auth_headers):
    payload = _dept_payload("CR1")
    response = api.post("/departments", json=payload, headers=auth_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Development"
    assert body["code"] == "DEVCR1"
    assert body["id"] > 0


def test_create_department_duplicate_code(api, auth_headers):
    payload = _dept_payload("DUP")
    api.post("/departments", json=payload, headers=auth_headers)
    response = api.post("/departments", json=payload, headers=auth_headers)
    assert response.status_code == 400


def test_create_department_invalid_code_format(api, auth_headers):
    payload = _dept_payload("")
    payload["code"] = "invalid code!"
    response = api.post("/departments", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_create_department_empty_name(api, auth_headers):
    payload = _dept_payload("EMP")
    payload["name"] = ""
    response = api.post("/departments", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_update_department(api, auth_headers):
    created = api.post("/departments", json=_dept_payload("UPD"), headers=auth_headers).json()
    new_id = created["id"]
    response = api.put(f"/departments/{new_id}", json={"head": "Bob"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["head"] == "Bob"
    assert response.json()["name"] == "Development"


def test_update_department_not_found(api, auth_headers):
    response = api.put("/departments/9999", json={"head": "X"}, headers=auth_headers)
    assert response.status_code == 404


def test_delete_department(api, auth_headers):
    created = api.post("/departments", json=_dept_payload("DEL"), headers=auth_headers).json()
    new_id = created["id"]
    response = api.delete(f"/departments/{new_id}", headers=auth_headers)
    assert response.status_code == 200
    assert api.get(f"/departments/{new_id}", headers=auth_headers).status_code == 404


def test_delete_department_not_found(api, auth_headers):
    response = api.delete("/departments/9999", headers=auth_headers)
    assert response.status_code == 404


def test_delete_department_with_employees_conflict(api, auth_headers):
    response = api.delete("/departments/1", headers=auth_headers)
    assert response.status_code == 409
    assert "employee" in response.json()["detail"].lower()


def test_filter_departments_by_status(api, auth_headers):
    response = api.get("/departments", params={"status": "active"}, headers=auth_headers)
    assert response.status_code == 200
    assert all(d["status"] == "active" for d in response.json())
