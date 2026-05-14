import asyncio
import os

os.environ["MONGO_TEST_DB_NAME"] = "ems_test_db"
os.environ["DB_NAME"] = "ems_test_db"
os.environ["JWT_SECRET_KEY"] = "dev-secret-key"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"

import httpx
import pytest_asyncio
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.settings import settings
from app.main import app


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
