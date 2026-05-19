# EMS Trainning — Agent Guide

## Project structure

```
backend/          FastAPI + Motor (async MongoDB)
  app/main.py     App factory (create_app), lifespan (connect_db → seed → yield → close_db)
  app/core/       settings.py, security.py (JWT/bcrypt), permissions.py (Role/Permission enums)
  app/controllers/  Business logic (no calls to routes/repositories from outside)
  app/repositories/ Data access, lazy get_database() via @property (no db param in __init__)
  app/api/routes/   Thin HTTP layer (~5 lines per endpoint)
  app/dependencies/ FastAPI Depends() providers
  app/middleware/    ratelimit.py (10 req/min on /auth/login), security_headers.py
  app/data/          Seed data (sample_employees, departments, auth_users)
  tests/             conftest.py, test_*.py
  requirements.txt

frontend/         React 19 + TypeScript 6 + Vite 8, @tanstack/react-query v5
  src/api/         request.ts (shared fetch wrapper with Bearer token), auth.ts, employees.ts, departments.ts
  src/services/    Business logic with mock fallback (catches network errors, returns mock data; 401/403 propagate)
  src/hooks/       React Query hooks (useEmployeesQuery, useDepartmentsQuery, useAuthQuery)
  src/context/     AuthContext.tsx (token storage, decode, login/logout/register/changePassword)
  src/pages/       One per route: Login, Register, ChangePassword, Dashboard, Employees, Departments, etc.
  src/components/  Sidebar, TopBar, ProtectedRoute, modals
  src/types/       TypeScript types (employee.ts, department.ts, auth.ts, api.ts)
  vite.config.ts   Dev proxy: /auth, /employees, /departments, /health → localhost:8000
  package.json     scripts: dev, build, typecheck, lint, test
```

## Commands

```bash
# Backend (Python ≥3.11, uv package manager)
cd backend
make install          # uv pip install -r requirements.txt
make run              # uvicorn app.main:app --reload
make tests            # pytest --cov=app tests/
pytest tests/ -v      # run all tests verbose
pytest tests/test_auth.py -v --tb=short  # single test file

# Frontend (Node, React + TypeScript)
cd frontend
npm run dev           # Vite dev server (HMR at localhost:5173)
npm run build         # tsc -b && vite build (production to dist/)
npm run typecheck     # tsc -b --noEmit (type-check only)
npm run lint          # ESLint
npm test              # Vitest
```

**Gotcha:** `pytest.ini` sets `asyncio_mode = auto`, `pythonpath = .`. Always run pytest from `backend/` directory.

## Architecture rules

**Dependency flow (strict, no skipping):**
```
Routes → Controllers → Repositories → Database
Routes → Auth Dependencies (get_current_user → require_permissions → require_password_not_expired)
```

- Routes NEVER call repositories directly
- Use `Depends` for DI, never `get_auth_controller()` manually
- Repositories use lazy `get_database()` via `@property` — no `db` parameter in constructor
- All ids use `"id"` field (not `"_id"`), auto-incrementing via `counters` collection

## Auth system

**Protecting an endpoint** — `require_password_not_expired` is enforced at
the **router** level (not per endpoint).  Each handler only declares its
permission requirement:

```python
# in app/api/routes/<resource>.py
router = APIRouter(
    prefix="/employees",
    tags=["employees"],
    dependencies=[Depends(require_password_not_expired)],  # router-wide guard
)

@router.get("/{employee_id}")
async def get_employee(
    employee_id: int,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),
):
    ...
```

Do NOT add `_: dict = Depends(require_password_not_expired)` to handler
signatures — the router-level dep already runs it, and
`tests/test_route_guards.py` will fail if a protected route is missing it.

**Auth router is split** in [`app/api/routes/auth.py`](backend/app/api/routes/auth.py):
- `router` — public/self-service: `/auth/login`, `/auth/register`,
  `/auth/me`, `/auth/password`.  No router-level guard so `/me` and
  `/password` stay reachable while the password is expired (otherwise the
  user could never change it).
- `admin_router` — `/auth/users*`.  Has the router-level guard.

Both are registered in `app/main.py`.

**Adding a new permission:**
1. Add to `Permission` enum in `core/permissions.py`
2. Add to `ROLE_PERMISSIONS` for relevant roles
3. Use `Depends(require_permissions(Permission.NEW))` in the route

**Role policy** (enforced via `ROLE_PERMISSIONS` in `core/permissions.py`, plus defense-in-depth checks in controllers):

| Action                | Employee | Manager | Admin |
|-----------------------|:--------:|:-------:|:-----:|
| Read employees / departments | ✅ | ✅ | ✅ |
| Create employees / departments | ✅ | ✅ | ✅ |
| Update employees / departments | ❌ | ✅ | ✅ |
| Delete employees / departments | ❌ | ❌ | ✅ |
| Manage auth users (create/approve/reject) | ❌ | ❌ | ✅ |
| Read audit logs | own only | own department | all |

Notes:
- All authenticated roles can list/get every employee and every department — there is no per-record scope filter on reads.
- `EmployeeController.update` rejects `EMPLOYEE` role with 403 even if a permission slipped through; `EmployeeController.delete` rejects any non-`ADMIN` role.
- `AuditController.get_logs_for_user` is the only controller that actually filters records by caller scope (admin → all, manager → users in their department, employee → own).

**Security helpers location:** `hash_password`, `verify_password`,
`create_access_token`, `decode_access_token` live in
`app/core/security.py` (canonical).  `app/auth/utils.py` is a thin
re-export shim kept for backward compatibility with existing imports
(conftest, controllers, dependencies).  Always edit `core/security.py`;
never duplicate the implementation in `auth/utils.py`.

## Seeded accounts (created on app startup)

| Email | Password | Role |
|-------|----------|------|
| admin@ems.com | Admin@1234 | admin |
| manager@ems.com | Manager@1234 | manager |
| employee@ems.com | Employee@1234 | employee |

## Testing quirks

- Test DB (`ems_test_db`) is dropped at conftest import time + after each test via `test_db` fixture
- Tokens are generated sync at module level (no DB needed): `ADMIN_TOKEN`, `MANAGER_TOKEN`, `EMPLOYEE_TOKEN`
- `require_password_not_expired` blocks seeded users — fix fixtures clear `must_change_password` before each test
- Some tests use `TestClient` (sync), some use `httpx.AsyncClient` with `ASGITransport`
- `tests/test_route_guards.py` walks `app.routes` and asserts every
  protected route has `require_password_not_expired` in its dependency
  tree, and that `/auth/login`, `/auth/register`, `/auth/me`,
  `/auth/password`, `/health`, `/` do **not**.  Update the
  `PUBLIC_OR_SELF_SERVICE_PATHS` set there if you add a new public route.
- 110 total tests as of May 2026

## Frontend quirks

- **Data fetching** uses `@tanstack/react-query` with `staleTime: 30s` — pages show cached data instantly on re-navigation
- **Query hooks** in `src/hooks/` wrap the service layer — pages call hooks directly, never services or API
- Mutations auto-invalidate list caches via `onSuccess` — no manual refresh needed
- **Code splitting** via `React.lazy` — each page is a separate JS chunk loaded on first navigation
- **Sidebar prefetching** — hovering over nav links prefetches data so pages render instantly on click
- Services have mock fallback: `catch (err) { if (err.status) throw err; /* mock data */ }`
- API calls without auth token on `/auth/login`, `/auth/register` — but `/auth/password` NEEDS a token
- `.screens` has `width: 100%; min-width: 0` to fill remaining width
- Auth pages (/login, /register, /change-password) render without Sidebar/TopBar
