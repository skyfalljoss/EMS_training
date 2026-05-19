"""Characterization tests for POST /employees."""

from datetime import datetime, timezone

import pymongo.errors
import pytest
from fastapi.testclient import TestClient

from tests.conftest import _sync_db


def test_employees_collection_has_unique_index_on_id(api: TestClient):
    indexes = _sync_db["employees"].index_information()
    matching = [
        info for name, info in indexes.items()
        if any(key == ("id", 1) for key in info.get("key", []))
    ]
    assert len(matching) == 1
    assert matching[0].get("unique") is True


def test_create_employee_duplicate_rejected_by_db_index(api: TestClient):
    _sync_db["employees"].insert_one({
        "id": 99999,
        "name": "Original",
        "email": "original@test.com",
        "role": "Engineer",
        "department_id": 1,
    })
    with pytest.raises(pymongo.errors.DuplicateKeyError):
        _sync_db["employees"].insert_one({
            "id": 99999,
            "name": "Duplicate",
            "email": "duplicate@test.com",
            "role": "Engineer",
            "department_id": 1,
        })


def test_create_employee_server_generates_createdAt(api: TestClient, auth_headers, unique_email):
    payload = {
        "name": "CreatedAt Test",
        "email": unique_email("createdat"),
        "role": "Engineer",
        "department_id": 1,
    }
    response = api.post("/employees", json=payload, headers=auth_headers)
    assert response.status_code == 201
    body = response.json()
    assert "createdAt" in body
    created_at = datetime.fromisoformat(body["createdAt"])
    assert created_at.tzinfo is not None
    assert abs((datetime.now(timezone.utc) - created_at).total_seconds()) < 10


def test_create_employee_ignores_client_provided_createdAt(api: TestClient, auth_headers, unique_email):
    client_time = "2020-01-01T00:00:00+00:00"
    payload = {
        "name": "Ignore CreatedAt",
        "email": unique_email("ignoreca"),
        "role": "Engineer",
        "department_id": 1,
        "createdAt": client_time,
    }
    response = api.post("/employees", json=payload, headers=auth_headers)
    assert response.status_code == 201
    body = response.json()
    assert "createdAt" in body
    server_time = body["createdAt"]
    assert server_time != client_time
    created_at = datetime.fromisoformat(server_time)
    assert abs((datetime.now(timezone.utc) - created_at).total_seconds()) < 10
