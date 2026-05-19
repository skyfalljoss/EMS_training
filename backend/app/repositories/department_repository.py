from typing import Any
from app.repositories._base import BaseRepository


class DepartmentRepository(BaseRepository):
    COLLECTION = "departments"
    COUNTER_ID = "department_id"

    async def find_by_code(self, code: str) -> dict | None:
        return await self.db[self.COLLECTION].find_one({"code": code})

    async def find_by_id(self, dept_id: int) -> dict | None:
        return await self.db[self.COLLECTION].find_one({"id": dept_id})

    async def find_all(
        self,
        query: dict | None = None,
        skip: int = 0,
        limit: int = 20,
        sort: list | None = None,
    ) -> list[dict]:
        cursor = self.db[self.COLLECTION].find(query or {}).sort(sort or [("name", 1)]).skip(skip).limit(limit)
        return [doc async for doc in cursor]

    async def insert(self, department: dict) -> None:
        await self.db[self.COLLECTION].insert_one(department)

    async def insert_many(self, departments: list[dict]) -> None:
        await self.db[self.COLLECTION].insert_many(departments)

    async def update(self, dept_id: int, updates: dict) -> None:
        await self.db[self.COLLECTION].update_one({"id": dept_id}, {"$set": updates})

    async def delete(self, dept_id: int) -> Any:
        return await self.db[self.COLLECTION].delete_one({"id": dept_id})
