# Backend — Agent Guide

## Commands

```bash
make install            # uv pip install -r requirements.txt
make run                # uvicorn app.main:app --reload
make tests              # pytest --cov=app tests/
pytest tests/ -v                              # all tests verbose
pytest tests/test_auth_login.py -v --tb=short  # single test file
```

- Python ≥3.11, `uv` package manager (not pip)
- **Always run pytest from `backend/` directory** — `pytest.ini` sets `pythonpath = .`
- `asyncio_mode = auto` in pytest.ini: no `@pytest.mark.asyncio` decorators needed
- MongoDB must be running locally at `mongodb://localhost:27017` for both app and tests

## Architecture

**Strict dependency flow — no skipping layers:**

```
Routes → Controllers → Repositories → Database
Routes → Auth Dependencies
```

- Routes are thin (~5 lines per endpoint); all logic lives in controllers
- Routes NEVER call repositories directly
- Controllers NEVER import from routes
- Controllers have defense-in-depth role checks (route permissions can be bypassed; controller checks are the real enforcement)
- All errors raised via `DomainError` subclasses in `app/core/exceptions.py` (`NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError`, `InvalidCredentialsError`, `UnauthorizedError`) — these are auto-converted to JSON responses by `register_exception_handlers()`

## ID convention

- Documents use `"id"` (auto-incrementing int), never `"_id"` as the business key
- Auto-increment is via `counters` collection — each repository declares `COUNTER_ID` and calls `self.next_id()`

## Auth system

### Security helpers — canonical location

`hash_password`, `verify_password`, `create_access_token`, `decode_access_token` live in **`app/auth/utils.py`** (canonical).

`app/core/security.py` is a **re-export shim** for backward compatibility. Always edit `app/auth/utils.py`; never duplicate logic in `core/security.py`.

### Route protection pattern

`require_password_not_expired` is enforced at the **router** level (not per handler):

```python
router = APIRouter(
    prefix="/employees",
    dependencies=[Depends(require_password_not_expired)],  # router-wide guard
)

@router.get("/{employee_id}")
async def get_employee(
    employee_id: int,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),
): ...
```

Do NOT add `_: dict = Depends(require_password_not_expired)` to handler signatures — the router-level dep already runs it. `tests/test_route_guards.py` will fail if a protected route is missing it.

### Auth & Audit routers (`app/api/routes/`)

- `auth_router` — public/self-service: `/auth/login`, `/auth/register`, `/auth/me`, `/auth/password`. No router-level guard so `/me` and `/password` stay reachable when password is expired.
- `admin_router` — `/auth/users*`. Has the router-level guard.
- `audit_router` — `/audit`. Enforces `EMPLOYEE_READ` permission internally relying on the token context block to deduce visibility scope.

Both Auth and Audit are registered in `app/main.py`.

### Adding a new permission

1. Add to `Permission` enum in `app/core/permissions.py`
2. Add to `ROLE_PERMISSIONS` for relevant roles
3. Use `Depends(require_permissions(Permission.NEW))` in the route

### Role policy

| Action                         | Employee | Manager  | Admin |
| ------------------------------ | :------: | :------: | :---: |
| Read employees / departments   |    ✅    |    ✅    |  ✅   |
| Create employees / departments |    ✅    |    ✅    |  ✅   |
| Update employees / departments |    ❌    |    ✅    |  ✅   |
| Delete employees / departments |    ❌    |    ❌    |  ✅   |
| Manage auth users              |    ❌    |    ❌    |  ✅   |
| Read audit logs                | own only | own dept |  all  |

- Reads are unscoped — all roles can list/get any employee or department
- Controller-level defense: `EmployeeController.update` rejects `EMPLOYEE` role with 403; `EmployeeController.delete` rejects non-`ADMIN`; same pattern for departments
- `AuditController.get_logs_for_user` is the only controller that filters by caller scope

## Repository pattern

Repositories extend `BaseRepository` (`app/repositories/_base.py`):

- Use lazy `self.db` property (calls `get_database()`) — **no `db` param in constructor**
- Controllers receive repos via `Depends()` — DI wiring lives in `app/dependencies/`

## Controller pattern

- Controllers receive repos + other controllers via constructor, wired through `app/dependencies/` provider functions
- All controller methods accept `current_user: Optional[dict] = None` for signature symmetry even when unused
- Role extraction: use `_role(current_user)` from `app/controllers/_helpers.py`

## Middleware

- `RateLimitMiddleware`: 10 req/min on `/auth/login` only (in-memory, per-IP)
- `SecurityHeadersMiddleware`: sets `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Cache-Control`

## App startup

Lifespan: `connect_db()` → `seed_if_empty()` → yield → `close_db()`. Seed runs only when collections are empty (`count() == 0`).

## Seeded accounts

| Email            | Password      | Role     |
| ---------------- | ------------- | -------- |
| admin@ems.com    | Admin@1234    | admin    |
| manager@ems.com  | Manager@1234  | manager  |
| employee@ems.com | Employee@1234 | employee |

## Testing quirks

- Test DB (`ems_test_db`) is dropped at conftest import time + after each test via `test_db` fixture
- `BCRYPT_WORK_FACTOR=4` in test env (fast hashes)
- Tokens (`ADMIN_TOKEN`, `MANAGER_TOKEN`, `EMPLOYEE_TOKEN`) are generated sync at module level — no DB needed
- `require_password_not_expired` blocks seeded users — fixtures (`auth_headers`, `manager_headers`, `employee_headers`) call `_clear_must_change_password()` before each test
- Some tests use `httpx.AsyncClient` with `ASGITransport`, others may use `TestClient`
- `tests/test_route_guards.py` walks `app.routes` and asserts every protected route has `require_password_not_expired` in its dependency tree, and that public/self-service paths do not. Update `PUBLIC_OR_SELF_SERVICE_PATHS` set if you add a new public route

## DI wiring

Provider functions in `app/dependencies/`:

- `repositories.py` — creates repos (`get_employee_repository`, `get_department_repository`, `get_auth_repository`, `get_audit_repository`)
- `employees.py`, `departments.py`, `audit.py`, `auth_provider.py` — creates controllers by injecting repos via `Depends()`
- `auth.py` — auth dependencies (`get_current_user`, `require_password_not_expired`, `require_permissions`)

New resource → add repo provider in `repositories.py`, add controller provider in new `dependencies/<resource>.py`, register router in `main.py`.

## Models

Pydantic v2 models in `app/models/`:

- `EmployeeCreate` / `EmployeeUpdate` / `EmployeeResponse` — response excludes sensitive fields (`salary`, `national_id`, `rating`); `EmployeeInternalResponse` includes them
- `AuthUserCreate` / `AuthUserResponse` / `LoginRequest` / `RegisterRequest` / `PasswordChangeRequest` / `TokenResponse`
- `DepartmentCreate` / `DepartmentUpdate` / `DepartmentResponse`
- `AuditLogResponse`
- Password validation: ≥8 chars, ≥1 uppercase, ≥1 digit, ≥1 special char (shared `_validate_password` in `auth_user.py`)
- Phone validation: E.164 pattern (`+?digits 7-15`)
- `utcnow()` helper in both `employee.py` and `department.py`

## Password lockout

`AuthController` locks accounts after 5 failed attempts for 15 minutes (`LOCKOUT_THRESHOLD`, `LOCKOUT_DURATION_MINUTES`).

## Account activation

Registration creates an inactive user (`is_active=False`). Admin must activate via `PUT /auth/users/{id}/activate`. `create_auth_user` (admin-created) sets `is_active=True` + `must_change_password=True`.
