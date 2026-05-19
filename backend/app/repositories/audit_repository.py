from datetime import datetime, timezone
from typing import Optional

from app.repositories._base import BaseRepository


class AuditRepository(BaseRepository):
    COLLECTION = "audit_logs"
    COUNTER_ID = "audit_log_id"

    async def insert(self, entry: dict) -> int:
        entry["id"] = await self.next_id()
        entry["timestamp"] = datetime.now(timezone.utc)
        await self.db[self.COLLECTION].insert_one(entry)
        return entry["id"]

    async def find_all(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        outcome: Optional[str] = None,
        department_name: Optional[str] = None,
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
        if department_name is not None:
            query["department_name"] = department_name
        cursor = (
            self.db[self.COLLECTION].find(query)
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )
        return [doc async for doc in cursor]
