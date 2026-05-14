from typing import Optional
from app.repositories.audit_repository import AuditRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.auth_repository import AuthRepository
from app.models.audit_log import AuditLogEntry
from app.core.permissions import AuthRole
import asyncio


class AuditController:
    def __init__(self, repo: Optional[AuditRepository] = None):
        self.repo = repo or AuditRepository()

    async def log(self, entry: AuditLogEntry) -> int:
        return await self.repo.insert(entry.model_dump(exclude_none=True))

    def log_async(self, entry: AuditLogEntry) -> None:
        asyncio.ensure_future(self.log(entry))

    async def get_logs(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        outcome: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> list[dict]:
        return await self.repo.find_all(
            user_id=user_id, action=action,
            resource_type=resource_type, outcome=outcome,
            limit=limit, skip=skip,
        )

    async def get_logs_by_user_ids(
        self, user_ids: list[int], limit: int = 100, skip: int = 0
    ) -> list[dict]:
        return await self.repo.find_by_user_ids(user_ids, limit=limit, skip=skip)

    async def get_logs_for_user(
        self,
        current_user: dict,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        outcome: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> list[dict]:
        role = current_user.get("auth_role")
        if role == AuthRole.ADMIN.value:
            return await self.get_logs(
                action=action, resource_type=resource_type,
                outcome=outcome, limit=limit, skip=skip,
            )
        if role == AuthRole.MANAGER.value:
            emp_repo = EmployeeRepository()
            manager_emp = await emp_repo.find_by_id(current_user["employee_id"])
            if manager_emp is None:
                return []
            dept_emps = await emp_repo.find_all(
                {"department_id": manager_emp["department_id"]}
            )
            dept_employee_ids = [e["id"] for e in dept_emps]
            auth_repo = AuthRepository()
            dept_user_ids = []
            for eid in dept_employee_ids:
                u = await auth_repo.find_by_employee_id(eid)
                if u:
                    dept_user_ids.append(u["id"])
            if not dept_user_ids:
                return []
            return await self.get_logs_by_user_ids(
                dept_user_ids, limit=limit, skip=skip,
            )
        return await self.get_logs(
            user_id=current_user["id"], limit=limit, skip=skip,
        )
