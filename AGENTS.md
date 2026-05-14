# MVC Architecture Convention

Always structure backend projects using a layered MVC architecture:

## Directory Layout

```
├── app/
│   ├── main.py                    # App factory, lifespan events
│   ├── api/routes/                # View layer — HTTP handling only
│   │   ├── health.py
│   │   ├── employees.py
│   │   ├── departments.py
│   │   ├── auth.py                # Auth endpoints (login, register, users)
│   │   └── audit.py               # Audit log viewing
│   ├── controllers/               # Business logic layer
│   │   ├── employee_controller.py
│   │   ├── department_controller.py
│   │   ├── auth_controller.py     # Login, register, password, lockout
│   │   └── audit_controller.py    # Audit log querying with role scoping
│   ├── repositories/              # Data access layer — DB queries only
│   │   ├── employee_repository.py
│   │   ├── department_repository.py
│   │   ├── auth_repository.py     # AuthUser queries
│   │   └── audit_repository.py    # Audit log queries
│   ├── models/                    # Domain entities / Pydantic schemas
│   │   ├── employee.py
│   │   ├── department.py
│   │   ├── auth_user.py           # AuthUser, LoginRequest, TokenResponse
│   │   └── audit_log.py           # AuditLogEntry, AuditLogResponse
│   ├── core/                      # Config, settings, utilities
│   │   ├── settings.py
│   │   ├── security.py            # JWT create/decode, password hashing
│   │   └── permissions.py         # AuthRole, Permission enums, ROLE_PERMISSIONS
│   ├── dependencies/              # FastAPI dependency injection
│   │   ├── employees.py
│   │   ├── departments.py
│   │   ├── auth.py                # get_current_user, require_permissions, require_password_not_expired
│   │   └── audit.py
│   ├── middleware/                 # ASGI middleware
│   │   ├── ratelimit.py           # Login rate limiter (10 req/min per IP)
│   │   └── security_headers.py    # X-Content-Type-Options, X-Frame-Options, etc.
│   ├── db/                        # Connection management
│   │   └── mongodb.py
│   └── data/                      # Seed data, fixtures
│       ├── sample_employees.py
│       ├── sample_departments.py
│       └── sample_auth_users.py   # Admin/manager/employee seed accounts
└── tests/
    ├── conftest.py
    ├── test_auth.py
    ├── test_rbac.py
    ├── test_audit.py
    └── test_*.py
```

## Layer Responsibilities

| Layer | Directory | Role |
|-------|-----------|------|
| **View** | `api/routes/` | Parse request, call service, return response. Max ~5 lines per endpoint. |
| **Controller** | `controllers/` | Business logic, validation, orchestration, error handling. |
| **Repository** | `repositories/` | Data access queries only — no business logic. |
| **Model** | `models/` | Data definitions, Pydantic schemas. |
| **Core** | `core/` | Security utilities, permissions, configuration. |
| **Dependencies** | `dependencies/` | FastAPI `Depends()` providers for controllers and auth guards. |
| **Middleware** | `middleware/` | ASGI middleware for cross-cutting concerns (rate limit, security headers). |

## Dependency Flow

```
Routes → Controllers → Repositories → Database
```

```
Routes → Auth Dependencies (get_current_user → require_permissions → require_password_not_expired)
```

Each layer only talks to the one directly below it. Never skip layers (e.g., routes must not call repositories directly).

## Conventions

- **Routes are thin** — they only parse input and delegate to controllers
- **Controllers own business logic** — duplicate checks, filtering rules, error handling, scope filtering
- **Repositories own data queries** — one method per query pattern; use lazy `get_database()` via `@property`
- **No global state** — use dependency injection or class instances
- **Async first** — all DB operations use async/await
- **One class per file** — files are named after their primary class/entity
- **`__init__.py`** — include in all Python package directories

## Example Flow

```
POST /employees
  → routes/employees.py: create_employee(payload, current_user)
    → Depends(require_permissions(Permission.EMPLOYEE_CREATE))
    → Depends(require_password_not_expired)
    → controllers/employee_controller.py: create(payload, current_user)
      → repositories/employee_repository.py: find_by_email(), next_id(), insert()
```

```
POST /auth/login
  → routes/auth.py: login(body)
    → controllers/auth_controller.py: login(email, password)
      → repositories/auth_repository.py: find_by_email(), update()
      → core/security.py: create_access_token()
```

## Security Conventions

### Protecting a New Endpoint

Every protected endpoint uses **two dependencies**:

```python
current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),
_: dict = Depends(require_password_not_expired),
```

- `require_permissions` — checks the user's role has the required permission string
- `require_password_not_expired` — rejects if user must change password first

### Adding a New Permission

1. Add a value to the `Permission` enum in `core/permissions.py`
2. Add the permission string to the appropriate role(s) in `ROLE_PERMISSIONS`
3. Use `Depends(require_permissions(Permission.YOUR_NEW_PERM))` in the route

### AuthUser Model

- Separate `auth_users` MongoDB collection (independent from `employees`)
- Fields: `id`, `employee_id`, `email`, `password_hash`, `auth_role`, `is_active`, `failed_attempts`, `locked_until`, `must_change_password`, `created_at`, `updated_at`, `last_login`
- Password: bcrypt via passlib, validated server-side (8+ chars, 1 upper, 1 digit, 1 special)
- Lockout: after 5 consecutive failures, locked for 15 minutes

### Auth Dependency Flow

```
Request → HTTPBearer token → decode_access_token → find user by ID → check is_active → check must_change_password → check role permissions → controller
```

Use `get_current_user` for the raw user dict, `require_permissions(...)` for permission-gated access, and `require_password_not_expired` to enforce first-login password changes.

### Scope Filtering

Scope filtering (which records a user can see/edit) is enforced at the **controller** level, not in permissions:

| Role | Scope Rule |
|------|-----------|
| **Employee** | Can only see/edit their own profile (`employee_id` from JWT) |
| **Manager** | Can see/edit employees in their own department (`department_id` from their employee record) |
| **Admin** | Full access (no restrictions) |

### RBAC Permission Matrix

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
| PUT /auth/password | ✓ (own) | ✓ (own) | ✓ (own) |
| GET /audit/logs | Own only | Own dept | All |

### Future Permissions

To add permissions for new features (leave, payroll, dashboard):
1. Add to `Permission` enum in `core/permissions.py`
2. Assign to roles in `ROLE_PERMISSIONS`
3. Use `require_permissions(Permission.NEW_PERM)` in routes
4. No auth system changes needed

## Audit Logging

- All CREATE/UPDATE/DELETE operations, LOGIN_SUCCESS/FAILED, ACCESS_DENIED, PASSWORD_CHANGE are logged
- Fire-and-forget: `AuditService.log()` doesn't block responses
- Viewing: `GET /audit/logs` with role-based filtering

## Testing

- Unit tests for controllers (mock repositories)
- Integration tests for routes (use TestClient)
- Auth tests use module-level sync token generation (no async fixtures needed)
- Auth users are seeded during FastAPI lifespan (via `_seed_data_if_empty()` in `main.py`)
- Use `auth_headers`, `manager_headers`, `employee_headers` fixtures from `tests/conftest.py`
- Tests go in `tests/` mirroring the `app/` structure
