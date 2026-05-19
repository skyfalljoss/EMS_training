from fastapi import Depends

from app.controllers.audit_controller import AuditController
from app.dependencies.repositories import (
    get_audit_repository,
    get_auth_repository,
    get_employee_repository,
)
from app.repositories.audit_repository import AuditRepository
from app.repositories.auth_repository import AuthRepository
from app.repositories.employee_repository import EmployeeRepository


def get_audit_controller(
    repo: AuditRepository = Depends(get_audit_repository),
    employee_repo: EmployeeRepository = Depends(get_employee_repository),
    auth_repo: AuthRepository = Depends(get_auth_repository),
) -> AuditController:
    return AuditController(repo=repo, employee_repo=employee_repo, auth_repo=auth_repo)
