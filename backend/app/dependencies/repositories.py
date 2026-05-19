from app.repositories.auth_repository import AuthRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository


def get_employee_repository() -> EmployeeRepository:
    return EmployeeRepository()


def get_department_repository() -> DepartmentRepository:
    return DepartmentRepository()


def get_auth_repository() -> AuthRepository:
    return AuthRepository()


def get_audit_repository() -> AuditRepository:
    return AuditRepository()
