from datetime import datetime, timezone
from typing import Any, Optional
from app.db.mongodb import get_database

COLLECTION = "auth_users"
COUNTERS = "counters"


class AuthRepository:
    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            self._db = get_database()
        return self._db

    async def find_by_email(self, email: str) -> Optional[dict]:
        return await self.db[COLLECTION].find_one({"email": email})

    async def find_by_id(self, user_id: int) -> Optional[dict]:
        return await self.db[COLLECTION].find_one({"id": user_id})

    async def find_by_employee_id(self, employee_id: int) -> Optional[dict]:
        return await self.db[COLLECTION].find_one({"employee_id": employee_id})

    async def find_all(self) -> list[dict]:
        cursor = self.db[COLLECTION].find()
        return await cursor.to_list(length=None)

    async def insert(self, data: dict) -> int:
        data["id"] = await self.next_id()
        now = datetime.now(timezone.utc)
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data.setdefault("is_active", False)
        data.setdefault("failed_attempts", 0)
        data.setdefault("must_change_password", False)
        await self.db[COLLECTION].insert_one(data)
        return data["id"]

    async def update(self, user_id: int, updates: dict) -> None:
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.db[COLLECTION].update_one({"id": user_id}, {"$set": updates})

    async def delete(self, user_id: int) -> Any:
        return await self.db[COLLECTION].delete_one({"id": user_id})

    async def next_id(self) -> int:
        result = await self.db[COUNTERS].find_one_and_update(
            {"_id": "auth_user_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result["seq"]

    async def set_counter(self, value: int) -> None:
        await self.db[COUNTERS].update_one(
            {"_id": "auth_user_id"},
            {"$set": {"seq": value}},
            upsert=True,
        )

    async def count(self) -> int:
        return await self.db[COLLECTION].count_documents({})
