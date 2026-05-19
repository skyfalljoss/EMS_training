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

frontend/         React 19 + Vite 8, plain JSX, react-router-dom v7
  src/api/         request.js (shared fetch wrapper with Bearer token), auth.js, employees.js, departments.js
  src/context/     AuthContext.jsx (token storage, decode, login/logout/register/changePassword)
  src/services/    Business logic with mock fallback (catches network errors, returns mock data; 401/403 propagate)
  src/pages/       One per route: Login, Register, ChangePassword, Dashboard, Employees, Departments, etc.
  src/components/  Sidebar, TopBar, ProtectedRoute, modals
  vite.config.js   Dev proxy: /auth, /employees, /departments, /health → localhost:8000
  package.json     scripts: dev, build, lint
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

# Frontend (Node, plain React)
cd frontend
npm run dev           # Vite dev server (HMR at localhost:5173)
npm run build         # production build to dist/
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

**Protecting an endpoint** — every protected endpoint uses BOTH deps:
```python
current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),
_: dict = Depends(require_password_not_expired),
```

**Adding a new permission:**
1. Add to `Permission` enum in `core/permissions.py`
2. Add to `ROLE_PERMISSIONS` for relevant roles
3. Use `Depends(require_permissions(Permission.NEW))` in route

**Scope filtering** is enforced at the controller level:
- Employee → own profile only (`employee_id` from JWT)
- Manager → own department only (`department_id` from their employee record)
- Admin → unrestricted

**Duplicate files to be aware of:** `app/auth/utils.py` and `app/core/security.py` both contain `hash_password`, `verify_password`, `create_access_token`, `decode_access_token`. The conftest imports from `app/auth/utils`. When modifying either, update both.

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
- 90 total tests as of May 2026

## Frontend quirks

- No state library — uses `useState`/`useEffect`/`useCallback` only
- No TypeScript — plain JSX
- Services have mock fallback: `catch (err) { if (err.status) throw err; /* mock data */ }`
- API calls without auth token on `/auth/login`, `/auth/register` — but `/auth/password` NEEDS a token
- `.screens` has `width: 100%; min-width: 0` to fill remaining width
- Auth pages (/login, /register, /change-password) render without Sidebar/TopBar
