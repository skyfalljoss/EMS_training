"""Shared pytest configuration for the EMS backend test suite.

Highlights
----------
* Test environment variables are set BEFORE importing ``app.*`` so that
  ``Settings`` (pydantic-settings) picks them up on first import.
* A single sync ``pymongo`` client is reused across all helper fixtures —
  this avoids spinning up a new ``asyncio.run(...)`` event loop just to
  flip a flag in ``auth_users``.
* Common helpers (``api``, ``unique_email``, ``fetch_auth_user``,
  ``set_password_state``, ``set_user_active``) live here so individual
  test files stay focused on assertions.
"""

from __future__ import annotations

import os
import uuid
from typing import Callable, Iterator

# ---------------------------------------------------------------------------
# Test env — must be set BEFORE app.* imports.
# ---------------------------------------------------------------------------
os.environ.setdefault("MONGO_TEST_DB_NAME", "ems_test_db")
os.environ.setdefault("DB_NAME", "ems_test_db")
os.environ.setdefault("JWT_SECRET_KEY", "dev-secret-key")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("BCRYPT_WORK_FACTOR", "4")
os.environ.setdefault("CORS_ORIGINS", '["*"]')

import httpx  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from pymongo import MongoClient  # noqa: E402

from app.auth.utils import create_access_token  # noqa: E402
from app.core.permissions import AuthRole  # noqa: E402
from app.core.settings import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.middleware.ratelimit import reset_rate_limiter  # noqa: E402


# ---------------------------------------------------------------------------
# Module-scoped sync MongoDB client (cheap, reused by all helpers).
# ---------------------------------------------------------------------------
_sync_client: MongoClient = MongoClient(settings.MONGO_URL)
_sync_db = _sync_client[settings.DB_NAME]

# Drop the test DB once at import time (fresh slate).
_sync_client.drop_database(settings.DB_NAME)


def pytest_sessionfinish(session, exitstatus): 
    """Close the shared sync client when the test session ends."""
    _sync_client.close()


# ---------------------------------------------------------------------------
# JWT tokens — generated once at import (no DB needed).
# ---------------------------------------------------------------------------
def _token(sub: str, role: AuthRole, employee_id: int, email: str) -> str:
    return create_access_token({
        "sub": sub,
        "role": role.value,
        "employee_id": employee_id,
        "email": email,
    })


ADMIN_TOKEN = _token("1", AuthRole.ADMIN, 1, "admin@ems.com")
MANAGER_TOKEN = _token("2", AuthRole.MANAGER, 2, "manager@ems.com")
EMPLOYEE_TOKEN = _token("3", AuthRole.EMPLOYEE, 3, "employee@ems.com")


# ---------------------------------------------------------------------------
# DB helpers (sync — fast, no event loop).
# ---------------------------------------------------------------------------
def set_password_state(
    email: str,
    *,
    must_change_password: bool = False,
    is_active: bool = True,
) -> None:
    """Flip ``must_change_password`` / ``is_active`` for a seeded auth user.

    The auth controller forces ``must_change_password=True`` on every
    insert so admin-created accounts are forced to rotate.  For tests we
    bypass that for the seeded admin/manager/employee.
    """
    _sync_db["auth_users"].update_one(
        {"email": email},
        {"$set": {
            "must_change_password": must_change_password,
            "is_active": is_active,
        }},
    )


def set_user_active(email: str, is_active: bool) -> None:
    """Toggle ``is_active`` for an auth user (used by login-disabled tests)."""
    _sync_db["auth_users"].update_one(
        {"email": email},
        {"$set": {"is_active": is_active}},
    )


def fetch_auth_user(email: str) -> dict | None:
    """Read an auth_user document directly from the test DB (sync)."""
    return _sync_db["auth_users"].find_one({"email": email})


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def api() -> Iterator[TestClient]:
    """FastAPI ``TestClient`` with lifespan (connect_db → seed)."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def unique_email() -> Callable[[str], str]:
    """Factory returning a unique email per call (good for create tests)."""
    def _make(prefix: str = "user") -> str:
        return f"{prefix}-{uuid.uuid4().hex[:8]}@test.com"
    return _make


@pytest_asyncio.fixture
async def test_db():
    """Per-test fresh Motor database (DB is dropped on teardown)."""
    mongo = AsyncIOMotorClient(settings.MONGO_URL)
    db = mongo[settings.MONGO_TEST_DB_NAME]
    yield db
    await mongo.drop_database(settings.MONGO_TEST_DB_NAME)
    mongo.close()


@pytest_asyncio.fixture
async def http_client():
    """Async httpx client over the ASGI app (for tests that need it)."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


# Header fixtures — clear must_change_password so the password-not-expired
# guard does not block requests.  Uses the sync helper, so no event loop
# spin-up per call.
@pytest.fixture
def auth_headers() -> dict[str, str]:
    set_password_state("admin@ems.com")
    return {"Authorization": f"Bearer {ADMIN_TOKEN}"}


@pytest.fixture
def manager_headers() -> dict[str, str]:
    set_password_state("manager@ems.com")
    return {"Authorization": f"Bearer {MANAGER_TOKEN}"}


@pytest.fixture
def employee_headers() -> dict[str, str]:
    set_password_state("employee@ems.com")
    return {"Authorization": f"Bearer {EMPLOYEE_TOKEN}"}


@pytest.fixture(autouse=True)
def _reset_test_state():
    """Prevent rate-limit and lockout state from leaking between tests."""
    reset_rate_limiter()
    _sync_db["auth_users"].update_many(
        {},
        {"$set": {"failed_attempts": 0, "locked_until": None}},
    )
