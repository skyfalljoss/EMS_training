# Backend Architecture — Blueprint for a New Project

A complete reference for how this FastAPI + MongoDB backend is organised, so that an AI assistant (or a human) can scaffold an equivalent project from scratch.

This document is **prescriptive**: every rule below should be reproduced verbatim in a new project unless you have a deliberate reason to deviate.

---

## 1. Tech stack

| Concern               | Choice                                                          |
| --------------------- | --------------------------------------------------------------- |
| Language              | Python ≥ 3.11                                                   |
| Web framework         | FastAPI                                                         |
| ASGI server           | Uvicorn                                                         |
| Lambda adapter        | Mangum (`handler = Mangum(app)` in `app/main.py`)               |
| DB                    | MongoDB                                                         |
| DB driver (async)     | Motor (`motor.motor_asyncio`)                                   |
| DB driver (sync, tests) | PyMongo (`pymongo.MongoClient`)                              |
| Validation            | Pydantic v2 (+ `pydantic-settings`, `email-validator`)          |
| Auth: hashing         | `passlib[bcrypt]` + `bcrypt`                                    |
| Auth: tokens          | `python-jose[cryptography]` (JWT HS256)                         |
| Form bodies           | `python-multipart`                                              |
| Package manager       | `uv` (not pip) — `uv pip install -r requirements.txt`           |
| Tests                 | `pytest` + `pytest-asyncio` (mode=auto) + `pytest-cov` + `httpx`|
| Container             | `python:3.11-slim` base image                                   |

`requirements.txt` lives at backend root. Test/dev deps may be inlined or split into `requirements.dev.txt`. A `requirements-lambda.txt` is provided for slimmer Lambda packaging.

---

## 2. Folder layout

```
backend/
├── AGENTS.md                  # short cheat-sheet for AI agents
├── ARCHITECTURE.md            # this file
├── Dockerfile
├── pyproject.toml             # name/version only; no deps here
├── pytest.ini                 # pythonpath=., asyncio_mode=auto, testpaths=tests
├── requirements.txt
├── requirements.dev.txt
├── requirements-lambda.txt
│
├── app/
│   ├── main.py                # create_app(), lifespan, mangum handler
│   │
│   ├── api/
│   │   ├── exception_handlers.py
│   │   └── routes/            # thin HTTP handlers, one file per resource
│   │       ├── auth.py        # exports `router` (public) and `admin_router`
│   │       ├── audit.py
│   │       ├── departments.py
│   │       ├── employees.py
│   │       └── health.py
│   │
│   ├── auth/
│   │   └── utils.py           # CANONICAL hash/verify/encode/decode JWT
│   │
│   ├── controllers/           # business logic + role enforcement
│   │   ├── _helpers.py        # _role() extractor
│   │   ├── audit_controller.py
│   │   ├── auth_controller.py
│   │   ├── department_controller.py
│   │   └── employee_controller.py
│   │
│   ├── core/
│   │   ├── exceptions.py      # DomainError hierarchy
│   │   ├── permissions.py     # AuthRole, Permission, ROLE_PERMISSIONS
│   │   └── settings.py        # pydantic-settings Settings + `settings` singleton
│   │
│   ├── data/
│   │   ├── sample_auth_users.py
│   │   ├── sample_departments.py
│   │   ├── sample_employees.py
│   │   └── seed.py            # seed_if_empty()
│   │
│   ├── db/
│   │   └── mongo_db.py        # connect_db / close_db / get_database / ensure_indexes
│   │
│   ├── dependencies/          # FastAPI DI providers (NO logic here)
│   │   ├── audit.py
│   │   ├── auth.py            # get_current_user, require_password_not_expired, require_permissions
│   │   ├── auth_provider.py   # get_auth_controller
│   │   ├── departments.py
│   │   ├── employees.py
│   │   └── repositories.py    # get_*_repository
│   │
│   ├── middleware/
│   │   ├── audit.py           # AuditMiddleware
│   │   ├── ratelimit.py       # RateLimitMiddleware (in-memory, per-IP)
│   │   └── security_headers.py
│   │
│   ├── models/                # Pydantic v2 request/response schemas
│   │   ├── audit_log.py
│   │   ├── auth_user.py       # shares _validate_password()
│   │   ├── department.py
│   │   └── employee.py
│   │
│   └── repositories/          # MongoDB data access
│       ├── _base.py           # BaseRepository (db, next_id, set_counter, count)
│       ├── audit_repository.py
│       ├── auth_repository.py
│       ├── department_repository.py
│       └── employee_repository.py
│
└── tests/
    ├── conftest.py            # env vars set BEFORE app import; sync helpers; token fixtures
    ├── test_route_guards.py   # walks app.routes; asserts guard placement
    └── test_*.py              # one file per behaviour
```

> **Always run pytest from `backend/`** — `pytest.ini` sets `pythonpath = .` so `app.*` and `tests.*` resolve.

---

## 3. Layered architecture

Strict, one-directional dependency flow:

```
HTTP Request
   │
   ▼
[Middleware: SecurityHeaders → Audit → RateLimit → CORS]
   │
   ▼
Route handler  (app/api/routes/*.py)        ← thin: ~5 lines, no logic
   │  Depends(require_password_not_expired)  (router-level)
   │  Depends(require_permissions(...))      (handler-level)
   │  Depends(get_<resource>_controller)
   ▼
Controller    (app/controllers/*.py)        ← business rules, role checks
   │
   ▼
Repository    (app/repositories/*.py)       ← MongoDB I/O only
   │
   ▼
get_database() → Motor → MongoDB
```

Rules:

- Routes **never** call repositories directly.
- Controllers **never** import from routes.
- Repositories **never** import controllers/models/settings (except `get_database` via `BaseRepository`).
- Controllers may compose other controllers (e.g. `AuthController` holds an `EmployeeController`).
- Models are imported by routes and controllers only.

---

## 4. App startup (`app/main.py`)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await ensure_indexes()
    await seed_if_empty()
    yield
    await close_db()

def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins_list, ...)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AuditMiddleware, audit_repo=get_audit_repository())
    app.add_middleware(RateLimitMiddleware)
    app.state.settings = settings

    app.include_router(departments_router)
    app.include_router(health_router)
    app.include_router(employees_router)
    app.include_router(auth_router)        # public/self-service
    app.include_router(auth_admin_router)  # admin
    app.include_router(audit_router)

    register_exception_handlers(app)

    @app.get("/", tags=["root"])
    async def root():
        return {"message": f"Welcome to the {settings.APP_NAME} API"}

    return app

app = create_app()

# AWS Lambda entry point
from mangum import Mangum
handler = Mangum(app)
```

Notes:

- Middleware are added **outermost first** in Starlette ordering. The actual execution order on a request is: CORS → SecurityHeaders → Audit → RateLimit → app.
- Lifespan must call `connect_db()` **before** `ensure_indexes()` and `seed_if_empty()`.
- `seed_if_empty()` only seeds collections where `count() == 0`.

---

## 5. Configuration (`app/core/settings.py`)

Use `pydantic-settings` with `.env` support. Keep one frozen singleton (`settings`).

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    APP_NAME: str = "Employee Management System"
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "ems_db"
    MONGO_TEST_DB_NAME: str = "ems_test_db"

    JWT_SECRET_KEY: str = "dev-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    BCRYPT_WORK_FACTOR: int = 12          # tests override to 4
    LOCKOUT_THRESHOLD: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15

    LOGIN_RATE_LIMIT: int = 5
    REGISTER_RATE_LIMIT: int = 3
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    CORS_ORIGINS: list[str] = ["*"]

    @property
    def cors_origins_list(self) -> list[str]: ...

settings = Settings()
```

Rules:

- All numeric/string settings come from env or have safe dev defaults.
- `JWT_SECRET_KEY` MUST be overridden in prod.
- `CORS_ORIGINS` accepts a JSON list string or comma-separated string.

---

## 6. Database layer (`app/db/mongo_db.py`)

A module-level singleton `AsyncIOMotorClient`:

```python
_client: AsyncIOMotorClient | None = None

async def connect_db():
    global _client
    _client = AsyncIOMotorClient(settings.MONGO_URL, tz_aware=True)

def get_database():
    if _client is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _client[settings.DB_NAME]

async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None

async def ensure_indexes():
    db = get_database()
    # create unique indexes for `id`, business keys, and lookup indexes
    # always pass background=True
    # add TTL on audit_logs.timestamp (e.g. 90 days)
```

`tz_aware=True` is required so datetimes come back with `timezone.utc`.

### Index conventions

- `id` (the business key, int) — unique, name `uq_<collection>_id`.
- Business uniques — `uq_<collection>_<field>` (e.g. `uq_auth_user_email`, `uq_department_code`).
- Foreign keys — `idx_<collection>_<field>` (e.g. `idx_employee_department_id`).
- Audit logs — TTL index on `timestamp` (e.g. 90 days).

---

## 7. ID convention

> **Documents use `id` (auto-incrementing int) as the business key, never `_id`.**

Implemented by `BaseRepository` and a `counters` collection.

```python
class BaseRepository:
    COLLECTION: str = ""
    COUNTER_ID: str = ""        # unique per repo, e.g. "employee_id"

    @property
    def db(self):
        return get_database()   # lazy — NO db arg in __init__

    async def next_id(self) -> int:
        result = await self.db["counters"].find_one_and_update(
            {"_id": self.COUNTER_ID},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result["seq"]

    async def set_counter(self, value: int) -> None: ...
    async def count(self) -> int: ...
```

Each concrete repository sets `COLLECTION` and `COUNTER_ID` and calls `await self.next_id()` when inserting.

---

## 8. Repository pattern

- Stateless classes inheriting `BaseRepository`.
- Constructor takes **no** arguments (db is lazy via the property).
- Method names: `find_by_id`, `find_by_email`, `find_all`, `insert`, `insert_many`, `update`, `delete`, plus resource-specific helpers (`find_ids_by_department`, `count_by_department`, etc.).
- `find_all` accepts `query`, `skip`, `limit`, `sort` and returns `list[dict]`.
- Repositories return raw `dict`s — never Pydantic models. Conversion happens in controllers.
- Repositories never enforce permissions.

---

## 9. Controller pattern

- Plain classes; **all dependencies injected via `__init__`** (other controllers + repos).
- All public methods accept `current_user: Optional[dict] = None` (for signature symmetry, even when unused on read paths).
- Defense-in-depth: even though routes guard with `require_permissions`, **controllers re-check destructive actions** using `_role(current_user)`:

  ```python
  from app.controllers._helpers import _role as get_role
  from app.core.permissions import AuthRole

  caller_role = get_role(current_user)
  if caller_role == AuthRole.EMPLOYEE:
      raise ForbiddenError("Employees cannot update employee records")
  ```

- Raise `DomainError` subclasses (`NotFoundError`, `ValidationError`, `ConflictError`, `ForbiddenError`, `InvalidCredentialsError`, `UnauthorizedError`). Never raise `HTTPException` from controllers.
- Use `model_dump(exclude_unset=True)` on partial-update payloads.
- Manage timestamps explicitly: `createdAt` / `updatedAt` (camelCase) on insert/update.

`_helpers._role()`:

```python
def _role(current_user: Optional[dict]) -> Optional[AuthRole]:
    if not current_user:
        return None
    raw = current_user.get("auth_role")
    try:
        return AuthRole(raw) if raw is not None else None
    except ValueError:
        return None
```

---

## 10. Dependency Injection (`app/dependencies/`)

Provider files only. **No business logic.**

```python
# app/dependencies/repositories.py
def get_employee_repository() -> EmployeeRepository:
    return EmployeeRepository()
# (one provider per repo)
```

```python
# app/dependencies/employees.py
def get_employee_controller(
    repo: EmployeeRepository = Depends(get_employee_repository),
    dept_repo: DepartmentRepository = Depends(get_department_repository),
    auth_repo: AuthRepository = Depends(get_auth_repository),
) -> EmployeeController:
    return EmployeeController(repo=repo, dept_repo=dept_repo, auth_repo=auth_repo)
```

```python
# app/dependencies/auth_provider.py
def get_auth_controller(
    repo: AuthRepository = Depends(get_auth_repository),
    employee_controller: EmployeeController = Depends(get_employee_controller),
) -> AuthController:
    return AuthController(repo=repo, employee_controller=employee_controller)
```

**Adding a new resource:**

1. Add a repo provider in `dependencies/repositories.py`.
2. Add a controller provider in a new `dependencies/<resource>.py`.
3. Add `app/api/routes/<resource>.py` with a `router` (and `admin_router` if needed).
4. Register the router(s) in `app/main.py`.

---

## 11. Authentication & Authorization

### 11.1 Canonical security helpers — `app/auth/utils.py`

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str: ...
def verify_password(plain: str, hashed: str) -> bool: ...
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str: ...
def decode_access_token(token: str) -> dict | None: ...  # returns None on JWTError
```

> If you keep an `app/core/security.py`, it MUST be a re-export shim only. Never duplicate.

### 11.2 JWT payload contract

Tokens carry identity only:

```python
{
    "sub": str(user_id),
    "employee_id": user["employee_id"],
    "email": user["email"],
    "must_change_pwd": user["must_change_password"],
    "exp": <int>,
}
```

> **Roles are NEVER read from the token.** `get_current_user` re-fetches the auth user from the DB on every request, so role revocation takes effect immediately. `auth_role` is only returned to the client (and used for audit logging).

### 11.3 Auth dependencies (`app/dependencies/auth.py`)

```python
security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(token = Depends(security_scheme),
                           controller = Depends(get_auth_controller)) -> dict:
    # 1. Decode token (UnauthorizedError on failure)
    # 2. Re-fetch user from DB by sub
    # 3. Reject if is_active is False
    # 4. Validate auth_role is a known AuthRole
    # 5. Return the full user document

async def require_password_not_expired(current_user = Depends(get_current_user)) -> dict:
    if current_user.get("must_change_password", False):
        raise ForbiddenError("Password change required. Use PUT /auth/password")
    return current_user

def require_permissions(*permissions: Permission) -> Callable:
    async def dependency(current_user = Depends(get_current_user)) -> dict:
        if current_user.get("auth_role") == AuthRole.ADMIN.value:
            return current_user
        user_perms = ROLE_PERMISSIONS.get(AuthRole(current_user.get("auth_role")), [])
        for perm in permissions:
            if perm.value not in user_perms:
                raise ForbiddenError(f"Insufficient permissions: {perm.value} required")
        return current_user
    return dependency
```

### 11.4 Router-level password guard pattern

Always apply `require_password_not_expired` **at the router**, never per handler:

```python
router = APIRouter(
    prefix="/employees",
    tags=["employees"],
    dependencies=[Depends(require_password_not_expired)],  # router-wide
)

@router.get("/{employee_id}")
async def get_employee(
    employee_id: int,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),
):
    return await controller.get(employee_id, current_user)
```

Exceptions:

- `/auth/login`, `/auth/register`, `/auth/me`, `/auth/password` MUST be reachable even when the password is expired. So `auth_router` has **no** router-level guard.
- Admin endpoints under `/auth/users*` belong on a separate `admin_router` with the guard.

A regression test (`tests/test_route_guards.py`) walks `app.routes` and asserts that every protected route has the guard, and every public path does not. Keep that list in sync.

### 11.5 Permission system (`app/core/permissions.py`)

```python
class AuthRole(str, Enum):
    EMPLOYEE = "employee"
    MANAGER  = "manager"
    ADMIN    = "admin"

class Permission(str, Enum):
    EMPLOYEE_READ      = "employee:read"
    EMPLOYEE_CREATE    = "employee:create"
    EMPLOYEE_UPDATE    = "employee:update"
    EMPLOYEE_DELETE    = "employee:delete"
    DEPARTMENT_READ    = "department:read"
    # ... one per (resource, verb)
    AUTH_USER_CREATE   = "auth:user:create"
    AUTH_USER_DELETE   = "auth:user:delete"
    AUTH_USER_UPDATE   = "auth:user:update"
    AUDIT_READ         = "audit:read"

ROLE_PERMISSIONS = {
    AuthRole.ADMIN:    [p.value for p in Permission],   # admin = wildcard
    AuthRole.MANAGER:  [...],
    AuthRole.EMPLOYEE: [...],
}
```

**Adding a new permission:**

1. Add to `Permission` enum.
2. Add the value to `ROLE_PERMISSIONS` for relevant roles.
3. Use `Depends(require_permissions(Permission.NEW))` on the route.
4. Add controller-level role check for destructive variants.

### 11.6 Role policy (defense in depth)

| Action                         | Employee | Manager  | Admin |
| ------------------------------ | :------: | :------: | :---: |
| Read employees / departments   |    ✅    |    ✅    |  ✅   |
| Create employees / departments |    ✅    |    ✅    |  ✅   |
| Update employees / departments |    ❌    |    ✅    |  ✅   |
| Delete employees / departments |    ❌    |    ❌    |  ✅   |
| Manage auth users              |    ❌    |    ❌    |  ✅   |
| Read audit logs                | own only | own dept |  all  |

- Reads are unscoped (no row-level filtering) for the three core resources.
- `EmployeeController.update` rejects `EMPLOYEE`; `EmployeeController.delete` rejects non-`ADMIN`. Same for `DepartmentController`.
- `AuditController.get_logs_for_user` is the only place that filters rows by caller scope.

### 11.7 Account lifecycle

| Path                            | Effect                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| `POST /auth/register`           | Creates `is_active=False`, `auth_role=employee`. Awaits admin approval. |
| `PUT  /auth/users/{id}/activate`| Admin sets `is_active=True`.                                 |
| `POST /auth/users` (admin)      | Creates `is_active=True`, `must_change_password=True`.       |
| `PUT  /auth/password`           | Clears `must_change_password`, resets lockout counters, returns a fresh token. |
| `PUT  /auth/users/{id}/role`    | Admin changes `auth_role`.                                   |
| `DELETE /auth/users/{id}`       | Admin rejects/removes user.                                  |

### 11.8 Password lockout

In `AuthController.login`:

- Increment `failed_attempts` on each bad password.
- If `failed_attempts >= settings.LOCKOUT_THRESHOLD` (default 5), set `locked_until = now + LOCKOUT_DURATION_MINUTES` (default 15).
- While locked, treat any login attempt as invalid credentials (do not leak the lock).
- On successful login, reset `failed_attempts=0`, `locked_until=None`, set `last_login`.

### 11.9 Password validation (shared in `models/auth_user.py`)

`_validate_password(v)` enforces:

- ≥ 8 characters
- ≥ 1 uppercase letter
- ≥ 1 digit
- ≥ 1 special character (see `_SPECIAL_RE`)

Reused by `AuthUserCreate`, `RegisterRequest`, `PasswordChangeRequest`.

---

## 12. Middleware

Add in this order in `create_app()` (outer→inner, executes outer→inner→app):

1. `CORSMiddleware` — origins from `settings.cors_origins_list`.
2. `SecurityHeadersMiddleware` — sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Cache-Control: no-store` on every response.
3. `AuditMiddleware` — logs all **mutating** requests (POST/PUT/PATCH/DELETE).
4. `RateLimitMiddleware` — in-memory, per-IP, per-path limits.

### 12.1 RateLimitMiddleware

```python
RATE_LIMIT_CONFIG = {
    "/auth/login":    settings.LOGIN_RATE_LIMIT,     # default 5
    "/auth/register": settings.REGISTER_RATE_LIMIT,  # default 3
}
WINDOW_SECONDS = settings.RATE_LIMIT_WINDOW_SECONDS  # default 60
```

- Sliding window per `f"{ip}:{path}"`.
- On limit, return HTTP 429 with `Retry-After`.
- Exposes `reset_rate_limiter()` for tests (autouse fixture calls it).
- In-memory only — use Redis for multi-process deployments.

### 12.2 AuditMiddleware

- Skips `GET/HEAD/OPTIONS`.
- Skips `/`, `/health`, `/docs*`, `/redoc*`, `/openapi.json`.
- Pulls user identity from `request.state.audit` (set by handlers that need a specific override, e.g. login) **or** from the bearer token.
- Builds an audit entry: `user_id`, `user_email`, `user_role`, `action`, `resource_type`, `resource_id`, `outcome` (`success` if `status < 400`), `detail`, `ip_address`, `method`, `path`.
- Action mapping: `LOGIN`, `REGISTER`, `CHANGE_PASSWORD`, else POST→CREATE / PUT|PATCH→UPDATE / DELETE→DELETE.
- Insert is wrapped in `try/except` — audit failure must never fail the request.

---

## 13. Error handling (`app/api/exception_handlers.py`)

```python
@app.exception_handler(DomainError)
async def _(_, exc): return JSONResponse({"detail": str(exc)}, status_code=exc.status_code)

@app.exception_handler(RequestValidationError)
async def _(_, exc):
    # take first error msg, strip "Value error, " prefix → 422
    ...

@app.exception_handler(HTTPException)
async def _(_, exc): return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

@app.exception_handler(Exception)
async def _(_, exc): return JSONResponse({"detail": "Internal server error"}, status_code=500)
```

`DomainError` hierarchy (`app/core/exceptions.py`):

| Exception                  | HTTP |
| -------------------------- | ---- |
| `DomainError` (base)       | 500  |
| `NotFoundError`            | 404  |
| `ConflictError`            | 409  |
| `ForbiddenError`           | 403  |
| `ValidationError`          | 400  |
| `InvalidCredentialsError`  | 401  |
| `UnauthorizedError`        | 401  |

All controller and dependency errors **must** be a `DomainError` subclass.

---

## 14. Models (Pydantic v2)

Conventions:

- One file per resource in `app/models/`.
- Three model classes per resource:
  - `<Resource>Create` — POST payload (required fields, server-managed timestamps excluded).
  - `<Resource>Update` — PUT/PATCH payload (all fields `Optional`).
  - `<Resource>Response` — outbound shape (adds `id`, `createdAt`, `updatedAt`).
  - Optional `<Resource>InternalResponse` for privileged consumers (e.g. includes sensitive fields like `salary`, `national_id`, `rating`).
- Use `ConfigDict(str_strip_whitespace=True, use_enum_values=True, populate_by_name=True, from_attributes=True)`.
- Use `EmailStr` for emails. Validate phones to E.164 with a `field_validator` (digits + optional `+`, length 7–15).
- For datetime fields, attach `timezone.utc` to naive inputs in a `mode="before"` validator.
- Define enums (e.g. `EmploymentStatus`) as `str, Enum` subclasses.
- Field aliases: store DB timestamps as `createdAt`/`updatedAt` in Mongo, expose as `created_at`/`updated_at` in the response via `Field(alias="createdAt")` (or just keep camelCase everywhere — pick one and be consistent).
- Provide `utcnow()` helper in resource model modules that need it.

---

## 15. Routes (`app/api/routes/`)

A handler should be **about five lines**:

```python
@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_CREATE)),
):
    return await controller.create(payload, current_user)
```

Rules:

- `prefix` and `tags` on `APIRouter`. `dependencies=[Depends(require_password_not_expired)]` on the router for guarded resources.
- Do **not** repeat `Depends(require_password_not_expired)` per handler (causes false positives in route-guard tests and dead duplication).
- Public/self-service paths live on their own `router` without the router-level guard. Admin paths live on `admin_router` with the guard.
- Pagination params: `skip: int = Query(0, ge=0, le=10000)`, `limit: int = Query(20, ge=1, le=100)`.
- Sort params: `sort_by: str = Query("id")`, `sort_order: str = Query("asc", pattern=r"^(asc|desc)$")`.
- Filter params: `Optional[str/int]` with `Query(...)` and `pattern=` where applicable.

---

## 16. Seeding (`app/data/seed.py`)

Idempotent — only seeds collections with `count() == 0`. Critically, after bulk-inserting documents that include explicit `id` values, you must bump the `counters` collection:

```python
if await dept_repo.count() == 0:
    await dept_repo.insert_many(list(SAMPLE_DEPARTMENTS))
    max_dept_id = max(d["id"] for d in SAMPLE_DEPARTMENTS)
    await dept_repo.set_counter(max_dept_id)
```

Seed in this order: departments → employees → auth_users (auth depends on employees existing).

For auth users, use `AuthController.create_auth_user(...)` so password hashing is consistent with normal user creation.

### Default seeded accounts

| Email            | Password      | Role     |
| ---------------- | ------------- | -------- |
| admin@ems.com    | Admin@1234    | admin    |
| manager@ems.com  | Manager@1234  | manager  |
| employee@ems.com | Employee@1234 | employee |

---

## 17. Testing

### 17.1 `pytest.ini`

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
pythonpath = .
addopts = -ra
```

`asyncio_mode = auto` → no `@pytest.mark.asyncio` decorators needed.

### 17.2 `tests/conftest.py` patterns

- **Set test env vars BEFORE importing `app.*`:**

  ```python
  os.environ.setdefault("DB_NAME", "ems_test_db")
  os.environ.setdefault("JWT_SECRET_KEY", "dev-secret-key")
  os.environ.setdefault("BCRYPT_WORK_FACTOR", "4")   # fast hashes
  os.environ.setdefault("CORS_ORIGINS", '["*"]')
  ```

- Drop the test DB once at import (fresh slate). The `test_db` async fixture drops again on teardown for isolation-sensitive tests.
- Reuse a single module-scoped sync `pymongo.MongoClient` for fast direct DB writes in test helpers (`set_password_state`, `set_user_active`, `fetch_auth_user`). Avoid spinning a new event loop per helper.
- Generate `ADMIN_TOKEN`, `MANAGER_TOKEN`, `EMPLOYEE_TOKEN` at module level with `create_access_token(...)` — no DB hit.
- Provide `auth_headers`, `manager_headers`, `employee_headers` fixtures that call `set_password_state(...)` to clear `must_change_password=True` on seeded accounts (otherwise `require_password_not_expired` blocks them).
- Autouse fixture `_reset_test_state` calls `reset_rate_limiter()` and resets `failed_attempts` / `locked_until` between tests.
- Use `TestClient(app)` for simple sync tests; `httpx.AsyncClient(transport=ASGITransport(app=app))` for async.

### 17.3 Required regression tests

- `test_route_guards.py` — walks `app.routes` and asserts:
  - Every non-public route has `require_password_not_expired` somewhere in its dependency tree.
  - Public/self-service paths (`/`, `/health`, `/auth/login`, `/auth/register`, `/auth/me`, `/auth/password`, `/docs`, `/openapi.json`, `/redoc`) do NOT.
- `test_app_factory.py` — calls `create_app()` and asserts middleware ordering + router registration.
- `test_rbac_strict.py` / `test_rbac.py` — exhaustive role × action matrix.
- `test_auth_lockout.py` — verifies lockout after `LOCKOUT_THRESHOLD` failures.
- `test_rate_limiting.py` — verifies 429 + `Retry-After` on `/auth/login`.
- `test_security_headers.py` — asserts the four headers.
- `test_audit_middleware.py` / `test_audit.py` — verifies audit entries are recorded.

### 17.4 Common commands

```bash
make install                                    # uv pip install -r requirements.txt
make run                                        # uvicorn app.main:app --reload
make tests                                      # pytest --cov=app tests/
pytest tests/ -v                                # all tests verbose
pytest tests/test_auth_login.py -v --tb=short   # single file
```

> A `Makefile` is conventionally provided at the backend root with `install`, `run`, `tests` targets — add it if missing.

MongoDB must be reachable at `MONGO_URL` (default `mongodb://localhost:27017`) for both the app and the test suite.

---

## 18. Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

For Lambda deployments, the `Mangum(app)` adapter in `app/main.py` is the entry point (`handler`). Use `requirements-lambda.txt` to slim the bundle (drop dev/test deps and anything pulled only by `pytest`).

---

## 19. AI scaffolding checklist

When asked to build a similar backend for a new domain, an agent should:

1. **Tech stack**: FastAPI + Motor + Pydantic v2 + JWT + bcrypt. Python 3.11. `uv`.
2. **Folder layout**: Exactly as Section 2.
3. **Settings**: `pydantic-settings` singleton; load `.env`; expose `cors_origins_list`.
4. **DB**: One module-level Motor client, `tz_aware=True`, lazy `get_database()`. `ensure_indexes()` called in lifespan.
5. **Repository base**: `BaseRepository` with `db` property, `next_id()`, `set_counter()`, `count()`. `id` (int) is the business key.
6. **One file per resource** in `models/`, `repositories/`, `controllers/`, `dependencies/<resource>.py`, `api/routes/<resource>.py`.
7. **DI**: Providers only in `dependencies/`. Controllers receive repos via `Depends()`.
8. **Auth**: Bearer JWT (identity-only); re-fetch user every request; `is_active` and role re-validated. `must_change_password` flow.
9. **Permissions**: `Permission` enum + `ROLE_PERMISSIONS` map. `require_permissions(...)` factory dep. Admin = wildcard.
10. **Router-level password guard** on protected resources; auth router has none so `/me` and `/password` stay reachable.
11. **Defense-in-depth role checks** in controllers for destructive actions.
12. **Errors**: `DomainError` subclasses, never `HTTPException` from controllers. `register_exception_handlers(app)` converts to JSON.
13. **Middleware**: CORS, SecurityHeaders, Audit, RateLimit. In-memory rate limit for prototypes; Redis for prod.
14. **Audit middleware**: skip GET/HEAD/OPTIONS + docs + health; never fail the request on audit insert errors.
15. **Seeding**: idempotent on `count() == 0`; bump counters after bulk insert; create auth users via the auth controller for consistent hashing.
16. **Tests**: env vars before app import; drop test DB at import; reuse sync pymongo client; pre-generated JWT tokens; `_reset_test_state` autouse fixture; route-guard regression test.
17. **Docker** + Mangum for Lambda.
18. **Naming**: `createdAt`/`updatedAt` in Mongo, camelCase enums stored as values (`use_enum_values=True`), permission strings like `"resource:verb"`.

Follow these and the resulting backend will be structurally identical to this one.
