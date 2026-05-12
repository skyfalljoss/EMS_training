from motor.motor_asyncio import AsyncIOMotorClient
from app.core.settings import settings

_client: AsyncIOMotorClient = None #connect to MongoDB, use global variable to store client instance


def get_database():
    return _client[settings.DB_NAME]


async def connect_db():
    global _client
    _client = AsyncIOMotorClient(settings.MONGO_URL)

async def get_client():
    global _client
    if _client is None:
        await connect_db()
    return _client

async def get_database():
    client = await get_client()
    return client[settings.DB_NAME]


async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None