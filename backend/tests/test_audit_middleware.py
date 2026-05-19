"""Tests for AuditMiddleware — verifies mutating requests write to audit_logs."""

from pymongo import MongoClient

from app.core.settings import settings


def _count() -> int:
    client = MongoClient(settings.MONGO_URL)
    c = client[settings.DB_NAME]["audit_logs"].count_documents({})
    client.close()
    return c


def _find_one(filter: dict) -> dict | None:
    client = MongoClient(settings.MONGO_URL)
    doc = client[settings.DB_NAME]["audit_logs"].find_one(filter, sort=[("id", -1)])
    client.close()
    return doc


def test_post_employee_creates_audit_entry(api, auth_headers, unique_email):
    before = _count()
    email = unique_email("audemp")
    api.post("/employees", json={
        "name": "Audit Employee", "email": email,
        "role": "Eng", "department_id": 1,
    }, headers=auth_headers)
    assert _count() == before + 1


def test_post_employee_audit_fields(api, auth_headers, unique_email):
    email = unique_email("audfld")
    api.post("/employees", json={
        "name": "Field Check", "email": email,
        "role": "QA", "department_id": 2,
    }, headers=auth_headers)
    entry = _find_one({"action": "CREATE", "resource_type": "employee"})
    assert entry is not None
    assert entry["method"] == "POST"
    assert entry["outcome"] == "success"
    assert entry["user_id"] == "1"


def test_put_employee_creates_audit_entry(api, auth_headers):
    before = _count()
    api.put("/employees/1", json={"role": "Updated Role"}, headers=auth_headers)
    assert _count() == before + 1


def test_put_audit_fields(api, auth_headers):
    api.put("/employees/1", json={"role": "Check Update"}, headers=auth_headers)
    entry = _find_one({"action": "UPDATE"})
    assert entry is not None
    assert entry["resource_type"] == "employee"
    assert entry["resource_id"] == "1"


def test_delete_employee_creates_audit_entry(api, auth_headers, unique_email):
    created = api.post("/employees", json={
        "name": "Audit Delete", "email": unique_email("auddel"),
        "role": "Eng", "department_id": 1,
    }, headers=auth_headers).json()
    before = _count()
    api.delete(f"/employees/{created['id']}", headers=auth_headers)
    assert _count() == before + 1


def test_login_creates_audit_entry(api):
    before = _count()
    api.post("/auth/login", json={
        "email": "admin@ems.com",
        "password": "Admin@1234",
    })
    assert _count() == before + 1
    entry = _find_one({"action": "LOGIN"})
    assert entry is not None
    assert entry["resource_type"] == "auth"
    assert entry["user_role"] == "admin"


def test_register_creates_audit_entry(api, unique_email):
    before = _count()
    api.post("/auth/register", json={
        "name": "Audit Reg", "email": unique_email("audreg"),
        "password": "AuditReg@1234",
    })
    assert _count() == before + 1
    entry = _find_one({"action": "REGISTER"})
    assert entry is not None
    assert entry["resource_type"] == "auth"


def test_get_request_does_not_create_audit_entry(api, auth_headers):
    before = _count()
    api.get("/employees", headers=auth_headers)
    api.get("/health")
    assert _count() == before


def test_failed_request_still_logged(api):
    """A 401 response should still create an audit entry with outcome=failure."""
    before = _count()
    api.post("/employees", json={
        "name": "No Auth", "email": "noauth@test.com",
        "role": "Eng", "department_id": 1,
    })
    assert _count() == before + 1
    entry = _find_one({"outcome": "failure"})
    assert entry is not None
    assert entry["action"] == "CREATE"
    assert entry["resource_type"] == "employee"
