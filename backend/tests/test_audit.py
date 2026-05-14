"""Tests for audit logging."""

import asyncio

import pytest
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.settings import settings
from app.main import app


@pytest.fixture
def api():
    with TestClient(app) as client:
        yield client


def test_audit_endpoint_requires_auth(api):
    resp = api.get("/audit/logs")
    assert resp.status_code == 401


def test_admin_can_view_audit_logs(api, auth_headers):
    async def _seed():
        client = AsyncIOMotorClient(settings.MONGO_URL)
        db = client[settings.DB_NAME]
        await db["counters"].update_one(
            {"_id": "audit_log_id"},
            {"$set": {"seq": 500}},
            upsert=True,
        )
        await db["audit_logs"].insert_one({
            "id": 501, "user_id": 1, "user_email": "admin@ems.com",
            "user_role": "admin",
            "action": "TEST_ACTION", "resource_type": "test",
            "outcome": "success",
            "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        })
        client.close()
    asyncio.run(_seed())
    resp = api.get("/audit/logs", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_employee_can_view_own_logs(api, employee_headers):
    async def _fix_employee():
        client = AsyncIOMotorClient(settings.MONGO_URL)
        db = client[settings.DB_NAME]
        await db["auth_users"].update_one(
            {"email": "employee@ems.com"},
            {"$set": {"must_change_password": False}},
        )
        client.close()
    asyncio.run(_fix_employee())
    resp = api.get("/audit/logs", headers=employee_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
