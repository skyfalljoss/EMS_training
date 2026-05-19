"""Tests for audit logging."""

from datetime import datetime, timezone

from pymongo import MongoClient

from app.core.settings import settings


def test_audit_endpoint_requires_auth(api):
    resp = api.get("/audit/logs")
    assert resp.status_code == 401


def test_admin_can_view_audit_logs(api, auth_headers):
    client = MongoClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]
    db["counters"].update_one(
        {"_id": "audit_log_id"},
        {"$set": {"seq": 500}},
        upsert=True,
    )
    db["audit_logs"].insert_one({
        "id": 501, "user_id": 1, "user_email": "admin@ems.com",
        "user_role": "admin",
        "action": "TEST_ACTION", "resource_type": "test",
        "outcome": "success",
        "timestamp": datetime.now(timezone.utc),
    })
    client.close()

    resp = api.get("/audit/logs", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_employee_can_view_own_logs(api, employee_headers):
    # `employee_headers` already clears must_change_password.
    resp = api.get("/audit/logs", headers=employee_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
