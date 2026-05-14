from app.db.mongodb import get_database

COLLECTION = "employees"
COUNTERS = "counters"


class EmployeeRepository:
    """MongoDB-backed data access for employees."""

    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            self._db = get_database()
        return self._db

    async def find_by_email(self, email: str):
        return await self.db[COLLECTION].find_one({"email": email})

    async def find_by_id(self, employee_id: int):
        return await self.db[COLLECTION].find_one({"id": employee_id})

    async def find_all(self, query: dict | None = None):
        cursor = self.db[COLLECTION].find(query or {}).sort("id", 1)
        return [doc async for doc in cursor]

    async def insert(self, employee: dict):
        await self.db[COLLECTION].insert_one(employee)

    async def insert_many(self, employees: list[dict]):
        await self.db[COLLECTION].insert_many(employees)

    async def update(self, employee_id: int, updates: dict):
        await self.db[COLLECTION].update_one({"id": employee_id}, {"$set": updates})

    async def delete(self, employee_id: int):
        return await self.db[COLLECTION].delete_one({"id": employee_id})

    async def next_id(self) -> int:
        result = await self.db[COUNTERS].find_one_and_update(
            {"_id": "employee_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result["seq"]

    async def set_counter(self, value: int) -> None:
        await self.db[COUNTERS].update_one(
            {"_id": "employee_id"},
            {"$set": {"seq": value}},
            upsert=True,
        )

    async def count(self) -> int:
        return await self.db[COLLECTION].count_documents({})
