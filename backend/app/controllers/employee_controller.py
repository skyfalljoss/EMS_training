"""Controller layer: validation, business rules and orchestration for the Employee resource."""

from typing import Optional

from app.controllers._helpers import _role as get_role
from app.core.exceptions import (
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.core.permissions import AuthRole
from app.models.employee import (
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
    utcnow,
)
from app.repositories.auth_repository import AuthRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository


class EmployeeController:
    def __init__(
        self,
        repo: EmployeeRepository,
        dept_repo: DepartmentRepository,
        auth_repo: AuthRepository,
    ) -> None:
        self.repo = repo
        self.dept_repo = dept_repo
        self.auth_repo = auth_repo

    async def create_pending(self, name: str, email: str) -> int:
        if await self.repo.find_by_email(str(email)):
            raise ValidationError(f"Email '{email}' is already registered")
        doc = {
            "name": name,
            "email": str(email),
            "role": "New Hire",
            "department_id": 1,
            "status": "active",
            "id": await self.repo.next_id(),
            "createdAt": utcnow(),
            "updatedAt": utcnow(),
        }
        await self.repo.insert(doc)
        return doc["id"]

    async def create(
        self,
        payload: EmployeeCreate,
        current_user: Optional[dict] = None,
    ) -> EmployeeResponse:
        # All authenticated roles (employee/manager/admin) may create.
        # Route-level permission already enforces this.
        # current_user kept for signature symmetry; reads are unscoped per role policy.
        if await self.repo.find_by_email(str(payload.email)):
            raise ValidationError(f"Email '{payload.email}' is already registered")

        dept = await self.dept_repo.find_by_id(payload.department_id)
        if not dept:
            raise ValidationError(f"Department with id {payload.department_id} not found")
        if dept.get("status") != "active":
            raise ValidationError(f"Department '{dept['name']}' is not active")

        now = utcnow()
        doc = payload.model_dump()
        doc["email"] = str(doc["email"])
        doc["id"] = await self.repo.next_id()
        doc["createdAt"] = now
        doc["updatedAt"] = now

        await self.repo.insert(doc)
        return EmployeeResponse(**doc)

    async def list(
        self,
        department_id: Optional[int] = None,
        role: Optional[str] = None,
        name: Optional[str] = None,
        current_user: Optional[dict] = None,
    ) -> list[EmployeeResponse]:
        # All roles can see all employees; client-supplied filters apply.
        # current_user kept for signature symmetry; reads are unscoped per role policy.
        query: dict = {}
        if department_id:
            query["department_id"] = department_id
        if role:
            query["role"] = role
        if name:
            query["name"] = {"$regex": name, "$options": "i"}

        docs = await self.repo.find_all(query)
        return [EmployeeResponse(**d) for d in docs]

    async def get(
        self,
        employee_id: int,
        current_user: Optional[dict] = None,
    ) -> EmployeeResponse:
        # current_user kept for signature symmetry; reads are unscoped per role policy.
        doc = await self.repo.find_by_id(employee_id)
        if not doc:
            raise NotFoundError(f"Employee with id {employee_id} not found")
        return EmployeeResponse(**doc)

    async def update(
        self,
        employee_id: int,
        payload: EmployeeUpdate,
        current_user: Optional[dict] = None,
    ) -> EmployeeResponse:
        existing = await self.repo.find_by_id(employee_id)
        if not existing:
            raise NotFoundError(f"Employee with id {employee_id} not found")

        caller_role = get_role(current_user)
        if caller_role == AuthRole.EMPLOYEE:
            raise ForbiddenError("Employees cannot update employee records")

        updates = payload.model_dump(exclude_unset=True)

        if "department_id" in updates:
            dept = await self.dept_repo.find_by_id(updates["department_id"])
            if not dept:
                raise ValidationError(f"Department with id {updates['department_id']} not found")
            if dept.get("status") != "active":
                raise ValidationError(f"Department '{dept['name']}' is not active")
        if not updates:
            return EmployeeResponse(**existing)

        if "email" in updates:
            updates["email"] = str(updates["email"])
            clash = await self.repo.find_by_email(updates["email"])
            if clash and clash["id"] != employee_id:
                raise ValidationError(f"Email '{updates['email']}' is already registered")

        updates["updatedAt"] = utcnow()
        await self.repo.update(employee_id, updates)
        updated = await self.repo.find_by_id(employee_id)
        return EmployeeResponse(**updated)

    async def delete(
        self,
        employee_id: int,
        current_user: Optional[dict] = None,
    ) -> dict:
        caller_role = get_role(current_user)
        if caller_role is not None and caller_role != AuthRole.ADMIN:
            raise ForbiddenError("Only administrators can delete employees")
        result = await self.repo.delete(employee_id)
        if result.deleted_count == 0:
            raise NotFoundError(f"Employee with id {employee_id} not found")
        await self.auth_repo.delete_by_employee_id(employee_id)
        return {"message": f"Employee {employee_id} deleted successfully"}
