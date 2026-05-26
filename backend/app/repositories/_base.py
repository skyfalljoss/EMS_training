from app.db.mongo_db import get_database

COUNTERS = "counters"


class BaseRepository:
    """Shared infrastructure for all MongoDB repositories."""

    COLLECTION: str = ""
    COUNTER_ID: str = ""

    @property
    def db(self):
        return get_database()

    async def next_id(self) -> int:
        result = await self.db[COUNTERS].find_one_and_update(
            {"_id": self.COUNTER_ID},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result["seq"]

    async def set_counter(self, value: int) -> None:
        await self.db[COUNTERS].update_one(
            {"_id": self.COUNTER_ID},
            {"$set": {"seq": value}},
            upsert=True,
        )

    async def count(self) -> int:
        return await self.db[self.COLLECTION].count_documents({})
