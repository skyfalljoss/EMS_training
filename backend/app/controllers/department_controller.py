import logging
from typing import Optional
from fastapi import HTTPException, status
from app.models.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate, utcnow
from app.repositories.department_repository import DepartmentRepository

logger = logging.getLogger(__name__)


def _normalize(data: dict) -> dict:
    result = {}
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip()
            if key == "code":
                value = value.upper()
        if key == "name" and isinstance(value, str) and value == "":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name must not be empty after trimming")
        result[key] = value
    return result


class DepartmentController:
    def __init__(self, repo: Optional[DepartmentRepository] = None) -> None:
        self.repo = repo or DepartmentRepository()

    async def create(self, payload: DepartmentCreate) -> DepartmentResponse:
        data = _normalize(payload.model_dump())
        if await self.repo.find_by_code(data["code"]):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Department code '{data['code']}' already exists",
            )
        now = utcnow()
        data["id"] = await self.repo.next_id()
        data["createdAt"] = now
        data["updatedAt"] = now
        await self.repo.insert(data)
        logger.info("Department created: id=%d code=%s name=%s", data["id"], data["code"], data["name"])
        return DepartmentResponse(**data)

    async def list(
        self,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "name",
        sort_order: str = "asc",
    ) -> list[DepartmentResponse]:
        query = {}
        if status_filter:
            query["status"] = status_filter
        sort_dir = 1 if sort_order == "asc" else -1
        sort = [(sort_by, sort_dir)]
        docs = await self.repo.find_all(query, skip, limit, sort)
        return [DepartmentResponse(**d) for d in docs]

    async def get(self, dept_id: int) -> DepartmentResponse:
        doc = await self.repo.find_by_id(dept_id)
        if not doc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Department with id {dept_id} not found")
        return DepartmentResponse(**doc)

    async def update(self, dept_id: int, payload: DepartmentUpdate) -> DepartmentResponse:
        existing = await self.repo.find_by_id(dept_id)
        if not existing:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Department with id {dept_id} not found")
        updates = _normalize(payload.model_dump(exclude_unset=True))
        if not updates:
            return DepartmentResponse(**existing)
        if "code" in updates:
            clash = await self.repo.find_by_code(updates["code"])
            if clash and clash["id"] != dept_id:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail=f"Department code '{updates['code']}' already exists",
                )
        updates["updatedAt"] = utcnow()
        await self.repo.update(dept_id, updates)
        updated = await self.repo.find_by_id(dept_id)
        logger.info("Department updated: id=%d fields=%s", dept_id, list(updates.keys()))
        return DepartmentResponse(**updated)

    async def delete(self, dept_id: int) -> dict:
        doc = await self.repo.find_by_id(dept_id)
        if not doc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Department with id {dept_id} not found")
        emp_count = await self.repo.count_employees(dept_id)
        if emp_count > 0:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=f"Cannot delete department: {emp_count} employee(s) still assigned. Reassign them first.",
            )
        await self.repo.delete(dept_id)
        logger.info("Department deleted: id=%d code=%s name=%s", dept_id, doc["code"], doc["name"])
        return {"message": f"Department {dept_id} deleted successfully"}
