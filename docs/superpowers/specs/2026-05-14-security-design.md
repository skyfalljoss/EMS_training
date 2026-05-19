# Security System Design — EMS Backend

## Overview

Add authentication, authorization (RBAC + permissions), and audit logging to the EMS backend. Security follows the AAA pattern: Authentication → Authorization → Accounting, wrapped around every request.

**Flow per request:**

```
Request → Validate Input → Authenticate (JWT) → Authorize (Permissions) → Execute → Audit Log
```

## AuthUser Model

Separate `auth_users` MongoDB collection — completely independent from `employees`.

```
auth_users {
  _id: int           (auto-increment, same as employees/departments)
  employee_id: int   (FK to employees collection)
  email: EmailStr    (same as employee email)
  password_hash: str
  auth_role: str     ("employee" | "manager" | "admin")
  is_active: bool    (default: false for self-registered, true for admin-created)
  failed_attempts: int (default: 0)
  locked_until: datetime | None
  must_change_password: bool (default: false)
  created_at: datetime
  updated_at: datetime
  last_login: datetime | None
}
```

## Permission System

Roles are collections of string-based permissions. Future features (leave, payroll, dashboard) add new permission strings without auth system changes.

```python
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

ROLE_PERMISSIONS = {
    AuthRole.ADMIN:    [all permissions],
    AuthRole.MANAGER:  [employee:read, employee:create, employee:update,
                        department:read, leave:approve, dashboard:view, audit:read],
    AuthRole.EMPLOYEE: [department:read, leave:create, dashboard:view],
}
```

**Scope filtering** is layered on top of permissions at the service layer. A Manager has `employee:read` but is scoped to "own department's employees" via `department_id` matching in the controller.

## Permission Matrix (Existing Endpoints)

| Endpoint | Employee | Manager | Admin |
|----------|----------|---------|-------|
| GET /employees | Own only | Dept only | All |
| GET /employees/{id} | Own only | Dept only | All |
| POST /employees | ✗ | Dept only | ✓ |
| PUT /employees/{id} | Own only | Dept only | ✓ |
| DELETE /employees/{id} | ✗ | ✗ | ✓ |
| GET /departments | ✓ | ✓ | ✓ |
| POST /departments | ✗ | ✗ | ✓ |
| PUT /departments/{id} | ✗ | ✗ | ✓ |
| DELETE /departments/{id} | ✗ | ✗ | ✓ |
| GET /health | Public | Public | Public |
| POST /auth/login | Public | Public | Public |
| POST /auth/register | Public (inactive) | Public | Public |
| POST /auth/users | ✗ | ✗ | ✓ |
| GET /auth/users | ✗ | ✗ | ✓ |
| PUT /auth/users/{id}/activate | ✗ | ✗ | ✓ |
| PUT /auth/password | ✓ (own) | ✓ (own) | ✓ (own) |
| GET /audit/logs | Own only | Own dept | All |

## Authentication Details

- **Password hashing:** bcrypt (via passlib), work factor 12
- **Access token:** JWT (via python-jose), HS256, 30min expiry
- **Token payload:** `{sub: user_id, role: auth_role, employee_id: id, email: email, exp: timestamp, must_change_pwd: bool}`
- **Endpoints:**
  - `POST /auth/login` — email + password → access_token
  - `POST /auth/register` — self-registration (creates inactive auth_user)
  - `POST /auth/users` — admin creates auth account for employee
  - `GET /auth/users` — list all auth users (admin only)
  - `PUT /auth/users/{id}/activate` — approve registration (admin only)
  - `PUT /auth/password` — change password (authenticated)

## Robustness & Security Hardening

| Concern | Implementation |
|---------|----------------|
| **Brute force prevention** | Track `failed_attempts` on AuthUser. After 5 failures, lock for 15 min (`locked_until`). |
| **Login info leak** | Generic `"Invalid credentials"` — never reveal if email exists vs. password wrong. |
| **Password rules** | Min 8 chars, ≥1 uppercase, ≥1 digit, ≥1 special char. Server-side validation. |
| **Token safety** | Short-lived (30min). Minimal payload. |
| **Self-registration** | Creates `is_active: false`. Admin must approve. No access until activated. |
| **Rate limiting** | In-memory: 10 req/min per IP on `/auth/login`. Extensible to Redis later. |
| **Security headers** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` |
| **CORS** | Configurable `allowed_origins` in settings. |
| **Audit logging** | Every auth action and access denial logged. |
| **Password change** | Old password required. Sets `must_change_password: false`. |
| **Input validation** | All auth inputs validated via Pydantic. |

## Audit Logging

```
audit_logs {
  _id: int
  user_id: int | null
  user_email: str | null
  user_role: str | null
  action: str              # CREATE_EMPLOYEE, LOGIN_FAILED, ACCESS_DENIED, etc.
  resource_type: str       # employee, department, auth_user
  resource_id: str | null
  outcome: str             # success | failure
  detail: str | null
  ip_address: str | null
  method: str | null
  path: str | null
  timestamp: datetime
}
```

**Audit strategy:** Fire-and-forget — `AuditService.log()` doesn't block responses. All CREATE/UPDATE/DELETE, LOGIN_SUCCESS/FAILED, ACCESS_DENIED, PASSWORD_CHANGE events are logged.

## Middleware Stack

```
1. SecurityHeadersMiddleware
2. RateLimitMiddleware (on /auth/login only)
3. Route handler (auth dependencies injected per-route)
```

## Files to Create

| File | Purpose |
|------|---------|
| `app/core/security.py` | JWT creation/verification, password hashing |
| `app/core/permissions.py` | Permission enum, role→permissions mapping |
| `app/models/auth_user.py` | AuthUser Pydantic schemas |
| `app/models/audit_log.py` | AuditLog Pydantic schema |
| `app/repositories/auth_repository.py` | AuthUser MongoDB queries |
| `app/repositories/audit_repository.py` | AuditLog MongoDB queries |
| `app/services/auth_service.py` | Login, register, approve, password change |
| `app/services/audit_service.py` | Log action, query logs |
| `app/api/routes/auth.py` | All auth endpoints |
| `app/api/routes/audit.py` | Audit log viewing endpoints |
| `app/dependencies/auth.py` | `get_current_user()`, `require_permissions()` |
| `app/middleware/ratelimit.py` | In-memory rate limiter |
| `app/middleware/security_headers.py` | Security headers middleware |
| `app/data/sample_auth_users.py` | Seed admin account |

## Files to Modify

| File | Changes |
|------|---------|
| `app/core/settings.py` | Add `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `BCRYPT_WORK_FACTOR`, `CORS_ORIGINS` |
| `app/main.py` | Register auth/audit routers, add middleware, seed auth users |
| `app/api/routes/employees.py` | Add auth dependencies |
| `app/api/routes/departments.py` | Add auth dependencies |
| `app/controllers/employee_controller.py` | Add scope filtering (manager sees own dept) |
| `app/controllers/department_controller.py` | Add scope filtering if needed |
| `requirements.txt` | Add `python-jose`, `passlib`, `python-multipart` |
| `tests/conftest.py` | Add auth header fixtures |
| `tests/test_employees.py` | Add auth headers to all requests |
| `tests/test_departments.py` | Add auth headers to all requests |

## Test Files to Create

| File | Tests |
|------|-------|
| `tests/test_auth.py` | Login (success/failure/lockout), token validation, self-registration, admin activation, password change, rate limiting |
| `tests/test_rbac.py` | All CRUD endpoints tested with employee/manager/admin — verify permissions enforced, ACCESS_DENIED logged |
| `tests/test_audit.py` | Audit log creation on key operations, log retrieval with role-based filtering |

## Dependencies

Add to `requirements.txt`:
```
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.9
```

## Configuration

```
SECRET_KEY="dev-secret-key"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
BCRYPT_WORK_FACTOR=12
CORS_ORIGINS=["*"]
```

## Admin Seeding

On first run, seed one admin auth user:
```python
{
    "employee_id": 1,        # John Doe (first seeded employee)
    "email": "admin@ems.com",
    "password": "Admin@1234",
    "auth_role": "admin",
    "is_active": True,
    "must_change_password": True,
}
```
