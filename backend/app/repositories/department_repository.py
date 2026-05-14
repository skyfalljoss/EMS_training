from typing import Any
from app.db.mongodb import get_database

COLLECTION = "departments"
COUNTERS = "counters"


class DepartmentRepository:
    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            self._db = get_database()
        return self._db

    async def find_by_code(self, code: str) -> dict | None:
        return await self.db[COLLECTION].find_one({"code": code})

    async def find_by_id(self, dept_id: int) -> dict | None:
        return await self.db[COLLECTION].find_one({"id": dept_id})

    async def find_all(
        self,
        query: dict | None = None,
        skip: int = 0,
        limit: int = 20,
        sort: list | None = None,
    ) -> list[dict]:
        cursor = self.db[COLLECTION].find(query or {}).sort(sort or [("name", 1)]).skip(skip).limit(limit)
        return [doc async for doc in cursor]

    async def count_documents(self, query: dict | None = None) -> int:
        return await self.db[COLLECTION].count_documents(query or {})

    async def insert(self, department: dict) -> None:
        await self.db[COLLECTION].insert_one(department)

    async def insert_many(self, departments: list[dict]) -> None:
        await self.db[COLLECTION].insert_many(departments)

    async def update(self, dept_id: int, updates: dict) -> None:
        await self.db[COLLECTION].update_one({"id": dept_id}, {"$set": updates})

    async def delete(self, dept_id: int) -> Any:
        return await self.db[COLLECTION].delete_one({"id": dept_id})

    async def count_employees(self, dept_id: int) -> int:
        return await self.db["employees"].count_documents({"department_id": dept_id})

    async def next_id(self) -> int:
        result = await self.db[COUNTERS].find_one_and_update(
            {"_id": "department_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result["seq"]

    async def set_counter(self, value: int) -> None:
        await self.db[COUNTERS].update_one(
            {"_id": "department_id"},
            {"$set": {"seq": value}},
            upsert=True,
        )

    async def count(self) -> int:
        return await self.db[COLLECTION].count_documents({})
