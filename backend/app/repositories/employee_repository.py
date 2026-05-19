from app.repositories._base import BaseRepository


class EmployeeRepository(BaseRepository):
    """MongoDB-backed data access for employees."""

    COLLECTION = "employees"
    COUNTER_ID = "employee_id"

    async def find_by_email(self, email: str) -> dict | None:
        return await self.db[self.COLLECTION].find_one({"email": email})

    async def find_by_id(self, employee_id: int) -> dict | None:
        return await self.db[self.COLLECTION].find_one({"id": employee_id})

    async def find_all(
        self,
        query: dict | None = None,
        skip: int = 0,
        limit: int = 100,
        sort: list | None = None,
    ) -> list[dict]:
        cursor = self.db[self.COLLECTION].find(query or {}).sort(sort or [("id", 1)]).skip(skip).limit(limit)
        return [doc async for doc in cursor]

    async def insert(self, employee: dict):
        await self.db[self.COLLECTION].insert_one(employee)

    async def insert_many(self, employees: list[dict]):
        await self.db[self.COLLECTION].insert_many(employees)

    async def update(self, employee_id: int, updates: dict):
        await self.db[self.COLLECTION].update_one({"id": employee_id}, {"$set": updates})

    async def delete(self, employee_id: int):
        return await self.db[self.COLLECTION].delete_one({"id": employee_id})

    async def find_ids_by_department(self, dept_id: int) -> list[int]:
        cursor = self.db[self.COLLECTION].find(
            {"department_id": dept_id},
            {"id": 1, "_id": 0},
        )
        return [doc["id"] async for doc in cursor]

    async def count_by_department(self, dept_id: int) -> int:
        return await self.db[self.COLLECTION].count_documents({"department_id": dept_id})
