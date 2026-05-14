"""Controller layer: validation, business rules and orchestration for the Employee resource."""

from typing import Optional

from fastapi import HTTPException, status

from app.core.permissions import AuthRole
from app.models.employee import (
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
    utcnow,
)
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository


class EmployeeController:
    """Coordinates validation, business rules, and the repository layer."""

    def __init__(self, repo: Optional[EmployeeRepository] = None, dept_repo: Optional[DepartmentRepository] = None) -> None:
        self.repo = repo or EmployeeRepository()
        self.dept_repo = dept_repo or DepartmentRepository()

    async def create(self, payload: EmployeeCreate, current_user: Optional[dict] = None) -> EmployeeResponse:
        if current_user and current_user.get("auth_role") == AuthRole.MANAGER.value:
            manager_emp = await self.repo.find_by_id(current_user["employee_id"])
            if manager_emp and payload.department_id != manager_emp.get("department_id"):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create employees outside your department")
        if await self.repo.find_by_email(str(payload.email)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{payload.email}' is already registered",
            )

        dept = await self.dept_repo.find_by_id(payload.department_id)
        if not dept:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Department with id {payload.department_id} not found")
        if dept.get("status") != "active":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Department '{dept['name']}' is not active")

        now = utcnow()
        doc = payload.model_dump()
        doc["email"] = str(doc["email"])
        doc["id"] = await self.repo.next_id()
        doc["createdAt"] = now
        doc["updatedAt"] = now

        await self.repo.insert(doc)
        return self._to_response(doc)

    async def list(
        self,
        department_id: Optional[int] = None,
        role: Optional[str] = None,
        name: Optional[str] = None,
        current_user: Optional[dict] = None,
    ) -> list[EmployeeResponse]:
        if current_user and current_user.get("auth_role") == AuthRole.EMPLOYEE.value:
            emp = await self.repo.find_by_id(current_user["employee_id"])
            return [self._to_response(emp)] if emp else []
        if current_user and current_user.get("auth_role") == AuthRole.MANAGER.value:
            manager_emp = await self.repo.find_by_id(current_user["employee_id"])
            if manager_emp:
                department_id = manager_emp["department_id"]
        query: dict = {}
        if department_id:
            query["department_id"] = department_id
        if role:
            query["role"] = role
        if name:
            query["name"] = {"$regex": name, "$options": "i"}

        docs = await self.repo.find_all(query)
        return [self._to_response(d) for d in docs]

    async def get(self, employee_id: int, current_user: Optional[dict] = None) -> EmployeeResponse:
        doc = await self.repo.find_by_id(employee_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id {employee_id} not found",
            )
        if current_user:
            role = current_user.get("auth_role")
            if role == AuthRole.EMPLOYEE.value and doc["id"] != current_user["employee_id"]:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            if role == AuthRole.MANAGER.value:
                manager_emp = await self.repo.find_by_id(current_user["employee_id"])
                if manager_emp and doc.get("department_id") != manager_emp.get("department_id"):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return self._to_response(doc)

    async def update(self, employee_id: int, payload: EmployeeUpdate, current_user: Optional[dict] = None) -> EmployeeResponse:
        if current_user and current_user.get("auth_role") == AuthRole.EMPLOYEE.value:
            if employee_id != current_user["employee_id"]:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update other employees")
        if current_user and current_user.get("auth_role") == AuthRole.MANAGER.value:
            target = await self.repo.find_by_id(employee_id)
            if target:
                manager_emp = await self.repo.find_by_id(current_user["employee_id"])
                if manager_emp and target.get("department_id") != manager_emp.get("department_id"):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update employees outside your department")
        existing = await self.repo.find_by_id(employee_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id {employee_id} not found",
            )

        updates = payload.model_dump(exclude_unset=True)
        if "department_id" in updates:
            dept = await self.dept_repo.find_by_id(updates["department_id"])
            if not dept:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Department with id {updates['department_id']} not found")
            if dept.get("status") != "active":
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Department '{dept['name']}' is not active")
        if not updates:
            return self._to_response(existing)

        if "email" in updates:
            updates["email"] = str(updates["email"])
            clash = await self.repo.find_by_email(updates["email"])
            if clash and clash["id"] != employee_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email '{updates['email']}' is already registered",
                )

        updates["updatedAt"] = utcnow()
        await self.repo.update(employee_id, updates)
        updated = await self.repo.find_by_id(employee_id)
        return self._to_response(updated)

    async def delete(self, employee_id: int, current_user: Optional[dict] = None) -> dict:
        result = await self.repo.delete(employee_id)
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id {employee_id} not found",
            )
        return {"message": f"Employee {employee_id} deleted successfully"}

    @staticmethod
    def _to_response(doc: dict) -> EmployeeResponse:
        """Map a Mongo document to the public response model."""
        return EmployeeResponse(
            id=doc["id"],
            name=doc["name"],
            email=doc["email"],
            role=doc["role"],
            department_id=doc["department_id"],
            position=doc.get("position"),
            status=doc.get("status", "active"),
            phone=doc.get("phone"),
            location=doc.get("location"),
            manager=doc.get("manager"),
            salary=doc.get("salary"),
            rating=doc.get("rating"),
            start_date=doc.get("start_date"),
            date_of_birth=doc.get("date_of_birth"),
            national_id=doc.get("national_id"),
            createdAt=doc.get("createdAt"),
            updatedAt=doc.get("updatedAt"),
        )
