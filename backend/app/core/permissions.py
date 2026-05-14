from enum import Enum


class AuthRole(str, Enum):
    EMPLOYEE = "employee"
    MANAGER = "manager"
    ADMIN = "admin"


class Permission(str, Enum):
    EMPLOYEE_READ      = "employee:read"
    EMPLOYEE_CREATE    = "employee:create"
    EMPLOYEE_UPDATE    = "employee:update"
    EMPLOYEE_DELETE    = "employee:delete"
    DEPARTMENT_READ    = "department:read"
    DEPARTMENT_CREATE  = "department:create"
    DEPARTMENT_UPDATE  = "department:update"
    DEPARTMENT_DELETE  = "department:delete"
    AUTH_USER_CREATE   = "auth:user:create"
    AUTH_USER_DELETE   = "auth:user:delete"
    AUDIT_READ         = "audit:read"
    LEAVE_CREATE       = "leave:create"
    LEAVE_APPROVE      = "leave:approve"
    PAYROLL_READ       = "payroll:read"
    DASHBOARD_VIEW     = "dashboard:view"


ROLE_PERMISSIONS: dict[AuthRole, list[str]] = {
    AuthRole.ADMIN: [p.value for p in Permission],
    AuthRole.MANAGER: [
        Permission.EMPLOYEE_READ.value,
        Permission.EMPLOYEE_CREATE.value,
        Permission.EMPLOYEE_UPDATE.value,
        Permission.DEPARTMENT_READ.value,
        Permission.LEAVE_APPROVE.value,
        Permission.DASHBOARD_VIEW.value,
        Permission.AUDIT_READ.value,
    ],
    AuthRole.EMPLOYEE: [
        Permission.DEPARTMENT_READ.value,
        Permission.LEAVE_CREATE.value,
        Permission.DASHBOARD_VIEW.value,
    ],
}
