from datetime import datetime, timezone
from typing import Optional
from app.db.mongodb import get_database

COLLECTION = "audit_logs"
COUNTERS = "counters"


class AuditRepository:
    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            self._db = get_database()
        return self._db

    async def next_id(self) -> int:
        result = await self.db[COUNTERS].find_one_and_update(
            {"_id": "audit_log_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result["seq"]

    async def set_counter(self, value: int) -> None:
        await self.db[COUNTERS].update_one(
            {"_id": "audit_log_id"},
            {"$set": {"seq": value}},
            upsert=True,
        )

    async def insert(self, entry: dict) -> int:
        entry["id"] = await self.next_id()
        entry["timestamp"] = datetime.now(timezone.utc)
        await self.db[COLLECTION].insert_one(entry)
        return entry["id"]

    async def find_all(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        outcome: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> list[dict]:
        query = {}
        if user_id is not None:
            query["user_id"] = user_id
        if action is not None:
            query["action"] = action
        if resource_type is not None:
            query["resource_type"] = resource_type
        if outcome is not None:
            query["outcome"] = outcome
        cursor = (
            self.db[COLLECTION].find(query)
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )
        return [doc async for doc in cursor]

    async def find_by_user_ids(
        self, user_ids: list[int], limit: int = 100, skip: int = 0
    ) -> list[dict]:
        cursor = (
            self.db[COLLECTION].find({"user_id": {"$in": user_ids}})
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )
        return [doc async for doc in cursor]
