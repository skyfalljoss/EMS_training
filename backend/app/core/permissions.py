from enum import Enum
from typing import Optional


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
    AUTH_USER_UPDATE   = "auth:user:update"
    AUDIT_READ         = "audit:read"
    LEAVE_CREATE       = "leave:create"
    LEAVE_APPROVE      = "leave:approve"
    PAYROLL_READ       = "payroll:read"
    DASHBOARD_VIEW     = "dashboard:view"


# Per-role permission strings. Admin always has every permission.
# Policy:
#   - Employee: read everything, create employees & departments, but cannot
#     update or delete anything.
#   - Manager:  read + create + update everything (employees & departments).
#               Only admin can delete.
ROLE_PERMISSIONS: dict[AuthRole, list[str]] = {
    AuthRole.ADMIN: [p.value for p in Permission],
    AuthRole.MANAGER: [
        Permission.EMPLOYEE_READ.value,
        Permission.EMPLOYEE_CREATE.value,
        Permission.EMPLOYEE_UPDATE.value,
        Permission.DEPARTMENT_READ.value,
        Permission.DEPARTMENT_CREATE.value,
        Permission.DEPARTMENT_UPDATE.value,
        Permission.LEAVE_CREATE.value,
        Permission.LEAVE_APPROVE.value,
        Permission.DASHBOARD_VIEW.value,
        Permission.AUDIT_READ.value,
    ],
    AuthRole.EMPLOYEE: [
        Permission.EMPLOYEE_READ.value,
        Permission.EMPLOYEE_CREATE.value,
        Permission.DEPARTMENT_READ.value,
        Permission.DEPARTMENT_CREATE.value,
        Permission.LEAVE_CREATE.value,
        Permission.DASHBOARD_VIEW.value,
        Permission.AUDIT_READ.value,
    ],
}


# Field-level whitelist is no longer needed: employees can't update at all,
# managers and admins may update any field.  Kept for backward import
# compatibility with anything that may still reference it.
ROLE_ALLOWED_SELF_UPDATE_FIELDS: dict[AuthRole, Optional[set[str]]] = {
    AuthRole.ADMIN: None,
    AuthRole.MANAGER: None,
    AuthRole.EMPLOYEE: set(),  # no fields allowed
}
