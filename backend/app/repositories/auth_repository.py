from datetime import datetime, timezone

from app.repositories._base import BaseRepository


class AuthRepository(BaseRepository):
    COLLECTION = "auth_users"
    COUNTER_ID = "auth_user_id"

    async def find_by_email(self, email: str) -> dict | None:
        return await self.db[self.COLLECTION].find_one({"email": email})

    async def find_by_id(self, user_id: int) -> dict | None:
        return await self.db[self.COLLECTION].find_one({"id": user_id})

    async def find_all(self, skip: int = 0, limit: int = 100) -> list[dict]:
        cursor = self.db[self.COLLECTION].find(
            {}, {"password_hash": 0}
        ).sort("id", 1).skip(skip).limit(limit)
        return [doc async for doc in cursor]

    async def insert(self, data: dict) -> int:
        data["id"] = await self.next_id()
        now = datetime.now(timezone.utc)
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data.setdefault("is_active", False)
        data.setdefault("failed_attempts", 0)
        data.setdefault("must_change_password", False)
        await self.db[self.COLLECTION].insert_one(data)
        return data["id"]

    async def update(self, user_id: int, updates: dict) -> None:
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.db[self.COLLECTION].update_one({"id": user_id}, {"$set": updates})

    async def delete(self, user_id: int):
        return await self.db[self.COLLECTION].delete_one({"id": user_id})

    async def delete_by_employee_id(self, employee_id: int):
        return await self.db[self.COLLECTION].delete_one({"employee_id": employee_id})

    async def find_by_employee_ids(self, employee_ids: list[int]) -> list[dict]:
        cursor = self.db[self.COLLECTION].find({"employee_id": {"$in": employee_ids}})
        return [doc async for doc in cursor]
