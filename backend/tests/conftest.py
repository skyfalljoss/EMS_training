import asyncio
import os

os.environ["MONGO_TEST_DB_NAME"] = "ems_test_db"
os.environ["DB_NAME"] = "ems_test_db"
os.environ["JWT_SECRET_KEY"] = "dev-secret-key"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["BCRYPT_WORK_FACTOR"] = "4"
os.environ["CORS_ORIGINS"] = '["*"]'

import httpx
import pytest_asyncio
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.settings import settings
from app.main import app

from app.core.security import create_access_token
from app.core.permissions import AuthRole

ADMIN_TOKEN = create_access_token({
    "sub": "1",
    "role": AuthRole.ADMIN.value,
    "employee_id": 1,
    "email": "admin@ems.com",
})
MANAGER_TOKEN = create_access_token({
    "sub": "2",
    "role": AuthRole.MANAGER.value,
    "employee_id": 2,
    "email": "manager@ems.com",
})
EMPLOYEE_TOKEN = create_access_token({
    "sub": "3",
    "role": AuthRole.EMPLOYEE.value,
    "employee_id": 3,
    "email": "employee@ems.com",
})


def _drop_test_db():
    """Synchronously drop the test database at module import time."""
    async def drop():
        client = AsyncIOMotorClient(settings.MONGO_URL)
        await client.drop_database(settings.DB_NAME)
        client.close()
    asyncio.run(drop())


_drop_test_db()


@pytest_asyncio.fixture()
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest_asyncio.fixture()
async def test_db():
    mongo = AsyncIOMotorClient(settings.MONGO_URL)
    db = mongo[settings.MONGO_TEST_DB_NAME]
    yield db
    await mongo.drop_database(settings.MONGO_TEST_DB_NAME)
    mongo.close()


import pytest


@pytest.fixture
def auth_headers():
    async def _fix_admin():
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(settings.MONGO_URL)
        db = client[settings.DB_NAME]
        await db["auth_users"].update_one(
            {"email": "admin@ems.com"},
            {"$set": {"must_change_password": False}},
        )
        client.close()
    asyncio.run(_fix_admin())
    return {"Authorization": f"Bearer {ADMIN_TOKEN}"}


@pytest.fixture
def manager_headers():
    return {"Authorization": f"Bearer {MANAGER_TOKEN}"}


@pytest.fixture
def employee_headers():
    return {"Authorization": f"Bearer {EMPLOYEE_TOKEN}"}
