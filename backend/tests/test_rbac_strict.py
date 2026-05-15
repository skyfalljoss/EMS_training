"""Strict RBAC tests — scope filtering, field whitelist, silent-bypass closures.

Seed reminder (from sample_employees + sample_auth_users):
  emp 1  -> dept 1   (admin's linked employee)
  emp 2  -> dept 2   (manager's linked employee)
  emp 3  -> dept 3   (employee's linked employee)
  emp 4  -> dept 4
  emp 5  -> dept 1
"""

import asyncio

import pytest
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.auth.utils import create_access_token
from app.core.settings import settings
from app.main import app


@pytest.fixture
def api():
    with TestClient(app) as client:
        yield client


# ---------------------------------------------------------------------------
# Employee scope: read-all + create allowed, update/delete forbidden
# ---------------------------------------------------------------------------

def test_employee_can_get_own_profile(api, employee_headers):
    resp = api.get("/employees/3", headers=employee_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == 3


def test_employee_can_get_other_profile(api, employee_headers):
    resp = api.get("/employees/1", headers=employee_headers)
    assert resp.status_code == 200


def test_employee_list_returns_all(api, employee_headers):
    resp = api.get("/employees", headers=employee_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 5


def test_employee_cannot_update_self(api, employee_headers):
    resp = api.put(
        "/employees/3",
        json={"phone": "+1 (415) 555-9999"},
        headers=employee_headers,
    )
    assert resp.status_code == 403


def test_employee_cannot_update_other(api, employee_headers):
    resp = api.put(
        "/employees/1",
        json={"phone": "+1 (000) 000-0000"},
        headers=employee_headers,
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Manager scope: read-all + create + update across all departments
# ---------------------------------------------------------------------------

def test_manager_list_returns_all(api, manager_headers):
    resp = api.get("/employees", headers=manager_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 5


def test_manager_can_get_employee_in_other_dept(api, manager_headers):
    resp = api.get("/employees/1", headers=manager_headers)
    assert resp.status_code == 200


def test_manager_can_create_in_any_dept(api, manager_headers):
    import uuid
    resp = api.post(
        "/employees",
        json={
            "name": "Crossover",
            "email": f"cross-{uuid.uuid4().hex[:8]}@test.com",
            "role": "Eng",
            "department_id": 1,
        },
        headers=manager_headers,
    )
    assert resp.status_code == 201


def test_manager_can_update_salary(api, manager_headers):
    resp = api.put(
        "/employees/2",
        json={"salary": 120_000},
        headers=manager_headers,
    )
    assert resp.status_code == 200


def test_manager_cannot_delete(api, manager_headers):
    resp = api.delete("/employees/2", headers=manager_headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Token tampering: claimed role inside JWT must be ignored (DB authoritative)
# ---------------------------------------------------------------------------

def test_jwt_role_claim_is_ignored(api):
    """An attacker who forges role='admin' in the JWT (with a valid sub
    belonging to the employee user) must NOT gain admin privileges."""
    forged = create_access_token({
        "sub": "3",  # employee user
        "role": "admin",  # tampered — should be ignored
        "employee_id": 3,
        "email": "employee@ems.com",
    })
    headers = {"Authorization": f"Bearer {forged}"}
    # Admin-only operation: delete an employee.
    resp = api.delete("/employees/1", headers=headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Audit log permission gate
# ---------------------------------------------------------------------------

def test_audit_logs_require_audit_read(api, manager_headers):
    """Strip AUDIT_READ from MANAGER at runtime → manager call must 403."""
    from app.core.permissions import ROLE_PERMISSIONS, AuthRole, Permission
    original = list(ROLE_PERMISSIONS[AuthRole.MANAGER])
    ROLE_PERMISSIONS[AuthRole.MANAGER] = [
        p for p in original if p != Permission.AUDIT_READ.value
    ]
    try:
        resp = api.get("/audit/logs", headers=manager_headers)
        assert resp.status_code == 403
    finally:
        ROLE_PERMISSIONS[AuthRole.MANAGER] = original


def test_audit_logs_admin_ok(api, auth_headers):
    resp = api.get("/audit/logs", headers=auth_headers)
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Disabled user cannot log in
# ---------------------------------------------------------------------------

def test_disabled_user_cannot_login(api):
    """Flipping is_active=False must cause login to return generic 401."""
    async def _disable_then_restore():
        client = AsyncIOMotorClient(settings.MONGO_URL)
        db = client[settings.DB_NAME]
        await db["auth_users"].update_one(
            {"email": "employee@ems.com"},
            {"$set": {"is_active": False}},
        )
        client.close()

    async def _restore():
        client = AsyncIOMotorClient(settings.MONGO_URL)
        db = client[settings.DB_NAME]
        await db["auth_users"].update_one(
            {"email": "employee@ems.com"},
            {"$set": {"is_active": True}},
        )
        client.close()

    asyncio.run(_disable_then_restore())
    try:
        resp = api.post("/auth/login", json={
            "email": "employee@ems.com",
            "password": "Employee@1234",
        })
        assert resp.status_code == 401
        # Generic message — must not leak account state.
        assert resp.json()["detail"] == "Invalid credentials"
    finally:
        asyncio.run(_restore())
