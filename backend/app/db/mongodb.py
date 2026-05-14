from motor.motor_asyncio import AsyncIOMotorClient

from app.core.settings import settings

_client: AsyncIOMotorClient | None = None


async def connect_db():
    global _client
    _client = AsyncIOMotorClient(settings.MONGO_URL)


async def get_client():
    global _client
    if _client is None:
        await connect_db()
    return _client


def get_database():
    global _client
    if _client is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _client[settings.DB_NAME]


async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None