import pytest
import pytest_asyncio

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.settings import settings
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture()
def client():

    return TestClient(app)


#  Database fixture for testing(test connection)
@pytest_asyncio.fixture()
async def test_db():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.MONGO_TEST_DB_NAME] #use test database
    yield db
    # await client.drop_database(settings.MONGO_TEST_DB_NAME) #clean up after tests
    client.close()