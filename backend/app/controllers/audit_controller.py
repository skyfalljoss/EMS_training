from typing import Optional
from app.repositories.audit_repository import AuditRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.auth_repository import AuthRepository
from app.repositories.department_repository import DepartmentRepository
from app.core.permissions import AuthRole


class AuditController:
    def __init__(
        self,
        repo: AuditRepository,
        employee_repo: EmployeeRepository,
        auth_repo: AuthRepository,
    ) -> None:
        self.repo = repo
        self.employee_repo = employee_repo
        self.auth_repo = auth_repo
        self.dept_repo = DepartmentRepository()

    async def _get_logs(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        outcome: Optional[str] = None,
        department_name: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> list[dict]:
        return await self.repo.find_all(
            user_id=user_id, action=action,
            resource_type=resource_type, outcome=outcome,
            department_name=department_name,
            limit=limit, skip=skip,
        )

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
            return await self._get_logs(
                action=action, resource_type=resource_type,
                outcome=outcome, limit=limit, skip=skip,
            )
        if role == AuthRole.MANAGER.value:
            manager_emp = await self.employee_repo.find_by_id(current_user["employee_id"])
            if manager_emp is None:
                return []
            dept_id = manager_emp.get("department_id")
            if not dept_id:
                return []
            dept_doc = await self.dept_repo.find_by_id(dept_id)
            dept_name = dept_doc.get("name") if dept_doc else None
            if not dept_name:
                return []
            return await self._get_logs(
                department_name=dept_name,
                outcome=outcome, limit=limit, skip=skip,
            )
        return await self._get_logs(
            user_id=current_user["id"], outcome=outcome, limit=limit, skip=skip,
        )
