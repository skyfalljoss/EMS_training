# EMS Architecture & Data Flow

A full-stack Employee Management System with FastAPI + MongoDB backend and React + TypeScript frontend.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (SPA)                               │
│  ┌───────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────────┐    │
│  │   Pages   │ → │  Hooks (RQ)  │ → │ Services │ → │API (Axios)│    │
│  │ (React)   │ ← │ (cache 30s)  │ ← │ (transform)│←│  (fetch)  │    │
│  └───────────┘  └──────────────┘  └───────────┘  └──────┬──────┘    │
│                                                          │          │
│                    Vite proxy (localhost:5173)           │         │
│                    /auth → localhost:8000                │         │
│                    /employees → localhost:8000           │         │
│                    /departments → localhost:8000         │         │
└──────────────────────────────────────────────────────────┼─────────┘
                                                           │ HTTP
┌──────────────────────────────────────────────────────────┼─────────┐
│                    FastAPI Server (localhost:8000)        │         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │         │
│  │ Middleware    │ → │  Routes      │ → │  Controllers  │            │
│  │ (CORS,       │ ← │  (thin, 5ln) │ ← │  (business    │            │
│  │  Security,   │   │              │   │   logic +     │            │
│  │  Audit,      │   │  Depends:    │   │   defense-in- │            │
│  │  RateLimit)  │   │  auth guard  │   │   depth auth) │            │
│  └──────────────┘  │  permission   │   └──────┬───────┘            │
│                    └──────────────┘          │ Motor (async)       │
│                                              ▼                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Dependencies │  │ Repositories  │  │   MongoDB    │             │
│  │  (DI wiring)  │→ │  (DAO layer)  │→ │  (counters,  │             │
│  │               │  │  lazy db()    │  │   employees, │             │
│  │               │  │  next_id()    │  │   departments,│            │
│  │               │  │               │  │   auth_users, │            │
│  │               │  │               │  │   audit_logs) │            │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Technology Stack

| Layer | Tech | Purpose |
|---|---|---|
| Framework | FastAPI (Python 3.11+) | Async HTTP server, auto-docs |
| Database | MongoDB + Motor | Async document store |
| Auth | JWT (python-jose) + bcrypt (passlib) | Stateless auth |
| Validation | Pydantic v2 | Request/response schemas |
| Testing | pytest + httpx + TestClient | Async/sync test runners |

### App Factory (app/main.py)

`create_app()` builds the application with this lifecycle:

```
Lifespan:
  connect_db() → ensure_indexes() → seed_if_empty() → yield → close_db()

Middleware stack (outer → inner):
  CORSMiddleware → SecurityHeadersMiddleware → AuditMiddleware → RateLimitMiddleware

Registered routers:
  GET  /health
  POST /auth/login, POST /auth/register, GET /auth/me, PUT /auth/password
  POST /auth/users, GET /auth/users, PUT /auth/users/{id}/activate
  DELETE /auth/users/{id}, PUT /auth/users/{id}/role
  GET/POST /employees, GET/PUT/DELETE /employees/{id}
  GET/POST /departments, GET/PUT/DELETE /departments/{id}
  GET  /audit/logs
```

### Dependency Flow (Layered Architecture)

```
Routes (thin HTTP mapping)
   ↓
Dependencies (DI providers: controllers, repos, auth guards)
   ↓
Controllers (business logic + defense-in-depth auth)
   ↓
Repositories (data access — lazy db connection, auto-increment IDs)
   ↓
MongoDB via Motor (async driver)
```

**Invariant:** Routes NEVER call repositories directly. Controllers NEVER import from routes.

### Route → Controller → Repository Wiring

```
Route handler signature:
  async def list_employees(
      filters: Query params (Pydantic),
      controller: EmployeeController = Depends(get_employee_controller),  ← DI
      current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),  ← auth
  )

Dependency chain for get_employee_controller:
  get_employee_controller()
    → EmployeeController(
        repo=get_employee_repository(),     → EmployeeRepository()
        dept_repo=get_department_repository(), → DepartmentRepository()
        auth_repo=get_auth_repository()      → AuthRepository()
      )
```

### Controller Responsibilities

Each controller encapsulates business logic for a domain:

| Controller | Key Methods | Defense-in-Depth |
|---|---|---|
| **AuthController** | login, register, change_password, create_auth_user, activate, reject, update_role, list_users | Lockout after 5 failed attempts (15 min) |
| **EmployeeController** | create, list, get, update, delete | `update` rejects EMPLOYEE; `delete` only ADMIN |
| **DepartmentController** | create, list, get, update, delete | `update` rejects EMPLOYEE; `delete` only ADMIN; prevents delete if employees assigned |
| **AuditController** | get_logs_for_user | ADMIN → all logs; MANAGER → own dept; EMPLOYEE → own |

### Repository Pattern

All repositories extend `BaseRepository`:

```python
class BaseRepository:
    COLLECTION = ""       # MongoDB collection name
    COUNTER_ID = ""       # Counter document ID for auto-increment

    @property
    def db(self):          # Lazy: calls get_database() on first access
        return get_database()

    async def next_id(self):   # Atomic $inc on counters collection
        ...
```

| Repository | Collection | Counter ID |
|---|---|---|
| EmployeeRepository | employees | employee_id |
| DepartmentRepository | departments | department_id |
| AuthRepository | auth_users | auth_user_id |
| AuditRepository | audit_logs | audit_log_id |

**ID Convention:** All documents use `id` (auto-incrementing int, via `counters` collection), never `_id` as business key.

### Auth System (Three-Layer Defense)

```
Layer 1 — Router level:
  APIRouter(dependencies=[Depends(require_password_not_expired)])
  → Checks must_change_password flag; blocks if True

Layer 2 — Route level:
  Depends(require_permissions(Permission.EMPLOYEE_READ))
  → Checks role against ROLE_PERMISSIONS dict (ADMIN always passes)

Layer 3 — Controller level (defense-in-depth):
  if _role(current_user) == AuthRole.EMPLOYEE:
      raise ForbiddenError("Employees cannot update other employees")
  → Catches any permission that slipped through route layer
```

**Token payload** (JWT, HS256, 30 min expiry):
```json
{
  "sub": "1",
  "employee_id": 1,
  "email": "admin@ems.com",
  "must_change_pwd": false,
  "exp": 1715000000
}
```

**Note:** `auth_role` is NOT in the JWT — it is re-read from the DB on every request so role changes take effect immediately.

### Auth Router Split

The auth module has **two routers**:

| Router | Route Prefix | Guard | Endpoints |
|---|---|---|---|
| `router` (public) | `/auth` | None | login, register, me, password |
| `admin_router` (protected) | `/auth` | `require_password_not_expired` | CRUD users |

The public router has **no** `require_password_not_expired` guard so that users can still reach `/auth/me` and `/auth/password` when their password is expired.

### Seed Data

On first startup (empty collections), the app seeds:

| Email | Password | Role | Active | Must Change Pwd |
|---|---|---|---|---|
| admin@ems.com | Admin@1234 | admin | Yes | No |
| manager@ems.com | Manager@1234 | manager | Yes | No |
| employee@ems.com | Employee@1234 | employee | Yes | No |

Seed also creates 4 departments (IT, HR, FIN, MKT) and 5 employees.

### Exception Handling

All business errors are raised as `DomainError` subclasses (in `app/core/exceptions.py`):

| Exception | Status | When |
|---|---|---|
| NotFoundError | 404 | Resource not found |
| ConflictError | 409 | Dept has employees, duplicate email |
| ForbiddenError | 403 | Insufficient permissions, password expired |
| ValidationError | 400 | Bad input, duplicate data |
| InvalidCredentialsError | 401 | Wrong email/password |
| UnauthorizedError | 401 | No token, inactive account |

All are auto-converted to JSON responses by `exception_handlers.py`.

### Middleware

| Middleware | Function |
|---|---|
| **CORSMiddleware** | Allows all origins (configurable via `CORS_ORIGINS`) |
| **SecurityHeadersMiddleware** | Sets `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Cache-Control` |
| **AuditMiddleware** | Logs all mutating requests (POST/PUT/DELETE) to `audit_logs` collection |
| **RateLimitMiddleware** | 5 req/min on `/auth/login`, 3 req/min on `/auth/register` (per-IP, in-memory sliding window) |

---

## Frontend Architecture

### Technology Stack

| Layer | Tech | Purpose |
|---|---|---|
| Framework | React 19 + TypeScript 6 | UI components |
| Build | Vite 8 | Dev server, HMR, bundling |
| Routing | React Router DOM 7 | Client-side routing |
| Data Fetching | @tanstack/react-query 5 | Server state caching, mutations |
| HTTP | Axios | API requests with interceptors |
| Testing | Vitest + @testing-library/react | Unit/component tests |

### Component Hierarchy

```
main.tsx
  StrictMode
    QueryClientProvider (React Query)
      BrowserRouter
        AuthProvider (context)
          App.tsx
            ├── Public routes: Login, Register, ChangePassword
            │   (no Sidebar/TopBar — full-screen auth pages)
            │
            └── Protected routes (ProtectedRoute wrapper):
                  Sidebar + TopBar + TweaksPanel
                    ├── /dashboard       → Dashboard
                    ├── /employees       → Employees
                    ├── /employees/:id   → EmployeeProfile
                    ├── /departments     → Departments
                    ├── /departments/:id → DepartmentProfile
                    └── /admin/users     → CreateUser
```

### Data Fetching Architecture

```
Page/Component
    │
    ▼
Query Hook (e.g., useEmployeesList)
    │  useQuery({ queryKey: ['employees', 'list', filters], queryFn: ... })
    │  useMutation({ mutationFn: ..., onSuccess: invalidateQueries })
    ▼
Service Layer (e.g., employeeService)
    │  Transforms raw EmployeeApi → EmployeeView (formatted strings)
    │  Parallel-fetches departments to resolve dept names
    ▼
API Layer (Axios)
    │  Injects Bearer token (except /auth/login, /auth/register)
    │  Handles 401 → redirect to /login
    │  Handles 403 → throw ApiError
    ▼
Vite Proxy → FastAPI Backend
```

### React Query Configuration

| Setting | Value | Effect |
|---|---|---|
| staleTime | 30,000ms (30s) | Data served from cache within 30s; refetch in background after |
| gcTime | 300,000ms (5min) | Cache survives 5 min after component unmounts |
| retry | 1 | One retry before showing error |
| refetchOnWindowFocus | false | No auto-refetch on tab focus |

**Query Key Convention:**

```
['resource', 'list', filters]   →  useEmployeesList({ status: 'active' })
['resource', id]                →  useEmployeeDetail(42)
['resource', 'admin']           →  useEmployeesListForAdmin()
```

**Mutation Cache Invalidation:**

| Action | Invalidated Keys |
|---|---|
| Create | `['resource', 'list']` |
| Update | `['resource', 'list']` + `['resource', id]` |
| Delete | Optimistic removal + rollback on error + invalidate on settle |

### Auth Context (AuthContext.tsx)

Manages auth state for the entire app:

- **State:** `token`, `user`, `loading`
- **On mount:** Decodes JWT from localStorage, validates expiry, fetches `/auth/me` for role
- **`login(email, password)`:** Calls API → stores token → decodes JWT → fetches `/auth/me`
- **`logout()`:** Clears token from localStorage and state
- **`register(name, email, password)`:** Calls API, returns response (no auto-login)
- **`changePassword(old, new)`:** Calls API → stores new token → fetches `/auth/me`

**Derived state:**
- `isAuthenticated` = `!!token`
- `mustChangePassword` = `user?.must_change_pwd === true`

### Permission-Based UI (usePermissions.ts)

Derives UI flags from the user's role:

| Flag | Logic |
|---|---|
| `canCreate` | Any authenticated user |
| `canUpdate` | `admin` or `manager` |
| `canDelete` | `admin` only |
| `canManageUsers` | `admin` only |

### API Layer (request.ts)

- **Axios instance** with empty baseURL (Vite proxy handles routing)
- **Request interceptor:** Injects `Authorization: Bearer <token>` from localStorage (skips `/auth/login` and `/auth/register`)
- **Error interceptor:** `401` → clear token + redirect to `/login`; `403` → throw `ApiError`; other → throw `ApiError` with status

---

## Detailed Flow: User Registration

This flow walks through every function call from when the user clicks "Create Account" to when the response arrives back at the browser.

```
Register.tsx                         AuthContext.tsx                    backend
┌─────────────────────┐             ┌──────────────────┐             ┌────────────────────────────┐
│ handleSubmit()      │             │ register()       │             │ POST /auth/register         │
│   register(         │────────────►│   authApi.       │────────────►│  AuthController.register()  │
│     name,           │             │   register()     │             │                            │
│     email,          │             │                  │             │  1. Check duplicate email  │
│     password        │             │                  │             │  2. Create pending employee│
│   )                 │             │                  │             │  3. Create inactive user   │
│                     │             │                  │             │  4. Return { id, message } │
│ ← on success:       │◄────────────│◄ return response │◄────────────│                            │
│   show "Check Your  │             │                  │             │                            │
│   Email" message    │             │                  │             │                            │
│   setTimeout 2s     │             │                  │             │                            │
│   navigate /login   │             │                  │             │                            │
└─────────────────────┘             └──────────────────┘             └────────────────────────────┘
```

### Step-by-step code trace

**1. User fills the form on Register.tsx** — name, email, password, confirmPassword. Client-side check: passwords must match.

**2. Register.tsx handleSubmit()** calls `useAuth().register(name, email, password)` — this is the AuthContext.register() method, which simply delegates to `authApi.register()`.

**3. authApi.register()** (`frontend/src/api/auth.ts:19`):
```typescript
export function register(name, email, password) {
  return api.post('/auth/register', { name, email, password })
}
```
- Axios `POST /auth/register` — NO Bearer token injected (AUTH_ENDPOINTS list excludes it)
- The body payload is validated by Pydantic `RegisterRequest` on the backend:
  - `name`: str, min_length=1
  - `email`: EmailStr (validated format)
  - `password`: must be 8+ chars, ≥1 uppercase, ≥1 digit, ≥1 special character

**4. Vite proxy** forwards `POST localhost:5173/auth/register` → `POST localhost:8000/auth/register`.

**5. FastAPI middleware chain** (all pass-through since no auth needed):
- CORSMiddleware → SecurityHeadersMiddleware → AuditMiddleware (records REGISTER action) → RateLimitMiddleware (3 req/min on /auth/register)

**6. Route handler** `register()` in `routes/auth.py:50`:
```python
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, controller: AuthController = Depends(get_auth_controller)):
    user_id = await controller.register(body.name, body.email, body.password)
    return {"id": user_id, "message": "Registration submitted. Awaiting admin approval."}
```
- Injects `AuthController` via DI chain: `get_auth_controller()` → `AuthController(repo=authRepo, employee_controller=empCtrl)`

**7. AuthController.register()** in `controllers/auth_controller.py:63`:

```
Step 7a: Check duplicate email
  repo.find_by_email(email)  →  AuthRepository query: db.auth_users.find_one({"email": email})
  If exists  →  raise ValidationError("already registered")

Step 7b: Create pending employee
  employee_controller.create_pending(name, email)
    → EmployeeRepository: check email not in employees collection
    → Assign auto-increment id: repo.next_id() → atomic $inc on counters.employee_id
    → Insert doc:
        { name, email, role: "New Hire", department_id: 1, status: "active",
          id: <auto-inc>, createdAt: now, updatedAt: now }
    → Return the new employee id

  Edge case: If employee creation succeeds but auth user creation fails,
    the controller retries once (deletes the half-created employee, recreates).

Step 7c: Hash password
  hash_password(password)  →  passlib CryptContext(schemes=["bcrypt"]).hash(password)

Step 7d: Insert auth_user
  repo.insert({
    employee_id: <emp_id>,
    email: email,
    password_hash: <bcrypt hash>,
    auth_role: "employee",
    is_active: False,       ← key: user is INACTIVE
  })
  Auto-sets: id (auto-increment), created_at, updated_at, failed_attempts=0, must_change_password=False

Step 7e: AuditMiddleware logs REGISTER action
  → AuditRepository inserts { action: "REGISTER", ..., outcome: "success" }
```

**8. Backend response:**
```json
{ "id": 12, "message": "Registration submitted. Awaiting admin approval." }
```
- Status 201 Created

**9. Register.tsx receives the response:**
```
setName(''); setEmail(''); setPassword(''); setConfirmPassword('')
setSuccess(true)
setTimeout(() => navigate('/login'), 2000)
```
- Shows "Check Your Email" success screen with "Registration submitted. An admin will activate your account."
- After 2 seconds, redirects to `/login`

**10. Admin activation** (required before the user can log in):
- Admin navigates to `/admin/users` → sees the new user in "Pending Approvals" list
- Clicks "Activate" → `PUT /auth/users/{id}/activate`
- Backend `AuthController.activate_user()` sets `is_active: True`
- Audit log: `{ action: "ACTIVATE_USER", ... }`

**11. User can now log in** — the lockout/active check in `AuthController.login()` passes.

---

## Detailed Flow: User Login

```
Login.tsx                          AuthContext.tsx                    backend (FastAPI)
┌────────────────────┐            ┌──────────────────┐             ┌───────────────────────────────┐
│ handleSubmit()     │            │ login()          │             │ POST /auth/login               │
│   login(           │───────────►│   authApi.login  │────────────►│  AuthController.login()        │
│     email,         │            │   (email, pwd)   │             │                               │
│     password       │            │                  │             │  1. Find user by email         │
│   )                │            │                  │             │  2. Check lockout (locked_until)│
│                    │            │                  │             │  3. Verify password (bcrypt)   │
│ ← on success:      │            │   On success:    │◄────────────│  4. If fail: increment counter │
│   navigate(from)   │◄───────────│   Store token    │             │  5. If locked: block           │
│                    │            │   Decode JWT     │◄──200 OK───│  6. If success: reset attempts │
│                    │            │   Fetch /auth/me │────────────►│     Generate JWT               │
│                    │            │   Set user state │◄────────────│     Return token + role        │
│                    │            │   Return merged  │  /auth/me   │                               │
└────────────────────┘            └──────────────────┘             └───────────────────────────────┘
```

### Step-by-step code trace

**1. User fills email + password on Login.tsx** — form fields bound to `email` and `password` state.

**2. Login.tsx handleSubmit()** (`pages/Login.tsx:29`):
```typescript
async function handleSubmit(e) {
  e.preventDefault()
  setError('')
  setSaving(true)
  try {
    await login(email, password)
    navigate(from, { replace: true })  // redirect to original URL or /dashboard
  } catch (err) {
    if (isApiError(err) && err.status === 429) setError('Too many attempts. Try again in 1 minute.')
    else if (isApiError(err) && err.status === 401) setError('Invalid email or password.')
    else setError(err instanceof Error ? err.message : 'Login failed.')
  }
}
```

**3. AuthContext.login()** (`context/AuthContext.tsx:64`):
```typescript
async function login(email: string, password: string) {
  const data = await authApi.login(email, password)          // Step 4: API call
  localStorage.setItem('access_token', data.access_token)    // Step 6a: store token
  setToken(data.access_token)
  const payload = decodeToken(data.access_token)             // Step 6b: decode JWT
  let merged = payload as AuthUser | null
  try {
    const me = await authApi.getMe()                         // Step 6c: fetch /auth/me
    merged = { ...(payload ?? {}), ...me, role: me.auth_role }
  } catch { /* fall back to token-only */ }
  setUser(merged)                                            // Step 6d: set user state
  return merged
}
```

**4. authApi.login()** → Axios `POST /auth/login` with `{ email, password }` (no Bearer token).

**5. Vite proxy** forwards to `localhost:8000/auth/login`.

**6. FastAPI RateLimitMiddleware** checks `/auth/login` — max 5 requests per 60s per IP. If exceeded, returns 429 with `Retry-After` header.

**7. Route handler** `login()` in `routes/auth.py:36`:
```python
@router.post("/login", response_model=TokenResponse)
async def login(request: Request, body: LoginRequest, controller: AuthController = Depends(get_auth_controller)):
    result = await controller.login(body.email, body.password)
    request.state.audit = {  // for AuditMiddleware to capture
        "user_id": decode_access_token(result["access_token"]).get("sub"),
        "user_email": body.email,
        "user_role": result.get("auth_role"),
    }
    return result
```

**8. AuthController.login()** in `controllers/auth_controller.py:25` — the core logic:

```
Step 8a: Find user
  repo.find_by_email(email)
  → AuthRepository: db.auth_users.find_one({"email": email})
  If None → raise InvalidCredentialsError("Invalid credentials")  → 401

Step 8b: Check lockout
  now = datetime.now(timezone.utc)
  locked_until = user.get("locked_until")
  If locked_until and locked_until > now:
    → raise InvalidCredentialsError("Invalid credentials")  → 401
  (User is still locked out)

Step 8c: Verify password
  verify_password(password, user["password_hash"])
  → passlib CryptContext.verify(plain, hash)
  If FAIL:
    failed = user.get("failed_attempts", 0) + 1
    update = {"failed_attempts": failed}
    If failed >= LOCKOUT_THRESHOLD (5):
      update["locked_until"] = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)  // 15 min
    repo.update(user["id"], update)
    → raise InvalidCredentialsError("Invalid credentials")  → 401

Step 8d: Check active
  If not user.get("is_active", False):
    → raise InvalidCredentialsError("Invalid credentials")  → 401
  (Inactive users cannot log in)

Step 8e: On success — reset lockout state
  repo.update(user["id"], {
    "last_login": now,
    "failed_attempts": 0,
    "locked_until": None,
  })

Step 8f: Generate JWT
  Token payload (NO role in token):
    sub: str(user["id"]),              # auth_users.id
    employee_id: user["employee_id"],   # related employee.id
    email: user["email"],
    must_change_pwd: user.get("must_change_password", False),
  → create_access_token(data)
    → jose.jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
    → exp = now + JWT_ACCESS_TOKEN_EXPIRE_MINUTES (30 min)

Step 8g: Return response
  {
    "access_token": "<JWT string>",
    "token_type": "bearer",
    "auth_role": "admin" | "manager" | "employee"   // for audit logging only
  }
```

**9. AuditMiddleware** captures the request and logs: `{ action: "LOGIN", user_id, user_email, user_role, outcome: "success", ip_address, ... }`.

**10. Backend returns 200 OK** with `TokenResponse`.

**11. AuthContext.login() continues on the frontend:**

```
Step 11a: Store token
  localStorage.setItem('access_token', data.access_token)
  → Token is persisted for future page loads

Step 11b: Decode JWT client-side
  decodeToken(data.access_token)
  → atob(token.split('.')[1]) → JSON.parse
  → Extracts: sub, employee_id, email, must_change_pwd, exp
  Check exp: if expired → clear storage, don't set user

Step 11c: Fetch /auth/me
  GET /auth/me with Authorization: Bearer <token>
  Backend: get_current_user decodes JWT, fetches user from DB, returns AuthUserResponse
  → This is how the frontend gets the ROLE (since JWT omits it)

Step 11d: Merge user state
  merged = { ...jwtPayload, ...me, role: me.auth_role }
  setUser(merged)  → triggers re-render
```

**12. Login.tsx after login completes:**
```typescript
navigate(from, { replace: true })
```
- Redirects to the page the user originally tried to visit (stored in `location.state.from`)
- Or `/dashboard` if they came directly to `/login`

**13. AuthContext.mustChangePassword:**
```typescript
const mustChangePassword = user?.must_change_pwd === true
```
- If `true`, the ProtectedRoute on `/dashboard` redirects to `/change-password`
- Admin can reset this flag via `PUT /auth/users/{id}/activate` with `must_change_password=True`

### Login Error Handling

| Error | Frontend display | Backend source |
|---|---|---|
| 401 Invalid credentials | "Invalid email or password." | Wrong email, wrong password, locked account, or inactive account (all return the same message) |
| 429 Too many requests | "Too many login attempts. Try again in 1 minute." | RateLimitMiddleware — 5/min per IP |
| 422 Validation error | Caught by default handler | Pydantic schema validation failed |
| Network error | "Login failed." | Backend unreachable |

---

## Detailed Flow: Employees List — Display, Create, Update, Delete

This section covers the full employee CRUD cycle from the UI to the database and back.

### Architecture overview

```
Page                  Hooks                  Services               API                   Backend
┌───────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────┐       ┌───────────────┐
│ Employees │       │useEmployees-│       │employee-    │       │api.      │       │GET /employees │
│ List      │──────►│List()       │──────►│Service      │──────►│employees │──────►│ + auth guard  │
│           │       │             │       │             │       │          │       │ + controller  │
│           │◄──────│  RQ cache   │◄──────│  toFrontend │◄──────│.get()    │◄──────│ + repository  │
│           │       │  staleTime  │       │  deptMap    │       │          │       │ + MongoDB     │
│           │       │  30s        │       │             │       │          │       │               │
└───────────┘       └──────────────┘       └──────────────┘       └──────────┘       └───────────────┘
```

### Part A: Displaying the Employees List

**Trigger:** User clicks "Employees" in the sidebar (or hovers over it for prefetch).

**1. Sidebar prefetch (on hover):**
```typescript
// Sidebar.tsx
onMouseEnter={() => prefetchEmployeesList(queryClient)}
```
- Calls `employeeService.listEmployees()` before the user clicks
- Cached with `staleTime: 30s` — renders instantly on navigation

**2. Route resolution:** `"/employees"` → `ProtectedRoute` → `Employees.tsx`

**3. ProtectedRoute** (`components/ProtectedRoute.tsx`):
```
if (loading) → render null (waiting for auth state)
if (!isAuthenticated) → <Navigate to="/login" state={{ from: location }} />  // redirect with return URL
else → render <Employees />
```

**4. Employees.tsx mounts** and calls hooks:
```typescript
const { data: employees = [] } = useEmployeesList(
  filter !== 'all' ? { status: filter } : undefined,
)
const { data: departments = [] } = useDepartmentsList()
```

**5. Hook: useEmployeesList()** (`hooks/useEmployeesQuery.ts:7`):
```typescript
useQuery({
  queryKey: ['employees', 'list', filter !== 'all' ? { status: filter } : {}],
  queryFn: () => employeeService.listEmployees(filters),
})
```
- React Query checks cache: if within 30s staleTime, returns cached data instantly
- If stale or missing, calls the queryFn

**6. employeeService.listEmployees()** (`services/employeeService.ts:56`):
```typescript
async function listEmployees(filters) {
  const data = await api.listEmployees(filters)        // Step 7: API call
  const depts = await deptApi.listDepartments().catch(() => [])  // Step 7: parallel dept fetch
  const deptMap: Record<number, string> = {}
  for (const d of depts) deptMap[d.id] = d.name
  return data.map(e => {
    const fe = toFrontend(e)                            // Step 12: transform
    if (e.department_id != null && deptMap[e.department_id]) {
      fe.dept = deptMap[e.department_id]               // Step 12: resolve dept name
    }
    return fe
  })
}
```

**7. API call** (`api/employees.ts:4`):
```typescript
export function listEmployees(filters) {
  const clean = Object.fromEntries(
    Object.entries(filters).filter(([key, v]) => key && v !== undefined && v !== null && v !== ''),
  )
  return api.get('/employees', { params: clean })
}
```
- Axios request interceptor injects `Authorization: Bearer <token>` (not a public endpoint)
- `GET /employees?status=active` → Vite proxy → backend

**8. FastAPI middleware chain:**
- CORSMiddleware → SecurityHeadersMiddleware → AuditMiddleware (GET → skip) → RateLimitMiddleware (path not rate-limited → pass)

**9. Router-level auth guard** (`routes/employees.py:15`):
```python
router = APIRouter(
    prefix="/employees",
    dependencies=[Depends(require_password_not_expired)],
)
```
- `require_password_not_expired` → depends on `get_current_user`
- `get_current_user` (dependencies/auth.py:14):
  ```
  1. HTTPBearer extracts token from Authorization header
  2. decode_access_token(token)  →  jose.jwt.decode(token, secret, algorithms=[HS256])
  3. If None or expired  →  raise UnauthorizedError("Invalid or expired token")
  4. Extract sub (user_id), fetch from DB: controller.get_user(int(user_id))
  5. Check is_active  →  if False, raise UnauthorizedError("Account is inactive")
  6. Check auth_role is valid  →  if not, raise UnauthorizedError
  7. Return user dict
  ```
- `require_password_not_expired` checks `must_change_password` flag. If True → 403.
- Both return `current_user`, which is reused via FastAPI's request-scope caching (same `Depends()` call = same result).

**10. Route handler** (`routes/employees.py:41`):
```python
@router.get("", response_model=list[EmployeeResponse])
async def list_employees(
    department_id: Optional[int] = Query(None),
    role: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),
):
    return await controller.list(department_id, role, name, current_user)
```
- `require_permissions(EMPLOYEE_READ)` checks `ROLE_PERMISSIONS` dict.
  - ADMIN always passes.
  - Others must have `EMPLOYEE_READ` in their role's permission set (all roles do).

**11. EmployeeController.list()** (`controllers/employee_controller.py:77`):
```python
async def list(self, department_id, role, name, current_user=None):
    query: dict = {}
    if department_id: query["department_id"] = department_id
    if role:           query["role"] = role
    if name:           query["name"] = {"$regex": name, "$options": "i"}  // case-insensitive search

    docs = await self.repo.find_all(query)
    return [EmployeeResponse(**d) for d in docs]
```

**EmployeeRepository.find_all()** (`repositories/employee_repository.py:16`):
```python
async def find_all(self, query=None, skip=0, limit=100, sort=None):
    cursor = self.db[self.COLLECTION].find(query or {}).sort(sort or [("id", 1)]).skip(skip).limit(limit)
    return [doc async for doc in cursor]
```

**Response** — array of `EmployeeResponse` Pydantic models:
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Engineer",
    "department_id": 1,
    "status": "active",
    "position": "Senior Engineer",
    "phone": "+1234567890",
    "location": "New York",
    "manager": "Sarah Smith",
    "start_date": "2024-01-15T00:00:00",
    "date_of_birth": "1990-05-20T00:00:00",
    "createdAt": "2024-01-15T00:00:00",
    "updatedAt": "2024-01-15T00:00:00"
  }
]
```
Note: `salary`, `national_id`, and `rating` are EXCLUDED from `EmployeeResponse` (only in `EmployeeInternalResponse`).

**12. employeeService transforms the data** (`services/employeeService.ts:35`):
```
toFrontend(emp):
  id: emp.id
  name: emp.name
  email: emp.email
  dept: resolved from department_id → deptMap (parallel fetch)
  role: emp.role
  status: emp.status
  start: emp.start_date.slice(0, 10)           → "2024-01-15"
  color: hashColor(emp.name)                   → deterministic avatar color
  salary: "$" + Number(emp.salary).toLocaleString()  → "$120,000"
  rating: Number(emp.rating).toFixed(1) + "/5.0"    → "4.5/5.0"
  phone: emp.phone ?? "—"
  location: emp.location ?? "—"
  manager: emp.manager ?? "—"
  date_of_birth: emp.date_of_birth?.slice(0, 10) ?? "—"
  national_id: emp.national_id ?? "—"
```

**13. React Query caches** the result with key `['employees', 'list', { status: 'active' }]`. Cache is valid for 30s (`staleTime`).

**14. Employees.tsx renders the table:**
```
Filter pills: All | Active | Inactive | On Leave | Terminated
  ↓ Client-side filter (passed to useEmployeesList as `filters.status`)
Department dropdown: All Departments | IT | HR | FIN | MKT
  ↓ Client-side filter (displayedEmployees useMemo)
Search box: [name, email search]
  ↓ Client-side filter (displayedEmployees useMemo)

Table columns: Employee (avatar + name + email) | Department | Role | Status | Start Date
  ↓ Row click: navigate(`/employees/${e.id}`) → EmployeeProfile

Pagination bar: 8 per page, prev/next buttons, page numbers
```

### Part B: Creating an Employee

**Trigger:** User clicks "+ Add Employee" button (only visible if `canCreate` is true).

**1. Permission check:**
```typescript
const { canCreate } = usePermissions()  // canCreate = !!role (any authenticated user)
```

**2. EmployeeFormModal opens** (`components/EmployeeFormModal.tsx`):
- Form fields: Name*, Email*, Role*, Department*, Position, Status, Phone, Location, Manager, Salary, Rating, Start Date, Date of Birth, National ID
- Department dropdown populated by `useDepartmentsList()`
- Validation: name, email, role, department required

**3. On submit** (`handleSubmit`):
```typescript
async function handleSubmit(e) {
  // Client-side validation
  if (!form.name || !form.email || !form.role || !form.department_id) {
    setError('Name, email, role, and department are required.')
    return
  }
  const payload = {
    ...form,
    department_id: Number(form.department_id),
    salary: form.salary ? Number(form.salary) : null,
    rating: form.rating ? Number(form.rating) : null,
    // ... handle optionals, convert types
  }
  await updateMutation.mutateAsync(payload)  // or createMutation
}
```

**4. useCreateEmployee() mutation** (`hooks/useEmployeesQuery.ts:22`):
```typescript
useMutation({
  mutationFn: (data) => employeeService.createEmployee(data),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['employees', 'list'] }),
})
```
- Calls `employeeService.createEmployee(payload)` → `api.createEmployee(data)` → Axios `POST /employees`
- On success: invalidates `['employees', 'list']` cache → triggers refetch → list auto-updates

**5. Backend POST /employees:**
- Router-level guard: `require_password_not_expired`
- Route-level guard: `require_permissions(EMPLOYEE_CREATE)` (all roles pass)
- Controller: `EmployeeController.create(payload, current_user)`:
  ```
  1. Check email uniqueness in employees collection
  2. Validate department exists and is active
  3. Generate auto-increment id via next_id()
  4. Set createdAt / updatedAt timestamps
  5. Insert into MongoDB
  6. Return EmployeeResponse
  ```
- Audit middleware: records `{ action: "CREATE", resource_type: "employee", outcome: "success" }`

**6. Response returns → service transforms → React Query caches → table re-renders with new employee.**

### Part C: Viewing Employee Detail

**Trigger:** User clicks a row in the employee table → navigates to `/employees/:id`.

**1. EmployeeProfile.tsx mounts** (`pages/EmployeeProfile.tsx:12`):
```typescript
const { id } = useParams<{ id: string }>()
const { data: employee, isLoading } = useEmployeeDetail(id!)
```
- `useEmployeeDetail(id)` → `useQuery({ queryKey: ['employees', id], queryFn: () => employeeService.getEmployee(id), enabled: !!id })`
- Checks cache by id first

**2. Backend** `GET /employees/{id}`:
- Auth guards: `require_password_not_expired` + `require_permissions(EMPLOYEE_READ)`
- Controller: `get(employee_id)` → `repo.find_by_id(employee_id)` → `db.employees.find_one({"id": employee_id})`
- If not found: `raise NotFoundError` → 404

**3. EmployeeProfile renders four tabs:**
```
Personal tab:   Full Name | Date of Birth | National ID | Phone | Email | Location
Employment tab: Employee ID | Department | Role | Manager | Start Date | Salary
Performance tab: Rating | Last Review | Goals Met | Training | Tenure | Status pill
Documents tab:  Mock file cards (Employment Contract, Performance Review, NDA, Benefits)
```

Edit button (visible if `canUpdate` = admin or manager) → opens EmployeeFormModal pre-filled with employee data.

Delete button (visible if `canDelete` = admin only) → opens ConfirmModal.

### Part D: Updating an Employee

**Trigger:** Admin/Manager clicks Edit button on EmployeeProfile, modifies fields, clicks "Update Employee".

**1. EmployeeFormModal opens in edit mode** — pre-fills form from `employee: EmployeeView`.

**2. On submit:**
```typescript
await updateMutation.mutateAsync({ id: employee.id, data: payload })
```

**3. useUpdateEmployee()** (`hooks/useEmployeesQuery.ts:33`):
```typescript
useMutation({
  mutationFn: ({ id, data }) => employeeService.updateEmployee(id, data),
  onSuccess: (_data, { id }) => {
    qc.invalidateQueries({ queryKey: ['employees', 'list'] })
    qc.invalidateQueries({ queryKey: ['employees', id] })
  },
})
```
- Invalidates both the list and the specific employee cache

**4. Backend** `PUT /employees/{id}`:
- Router-level: `require_password_not_expired`
- Route-level: `require_permissions(EMPLOYEE_UPDATE)` (admin or manager only)
- Controller: `EmployeeController.update(employee_id, payload, current_user)`:
  ```
  1. Find existing employee (404 if not found)
  2. Defense-in-depth: if caller_role == EMPLOYEE → raise ForbiddenError (403)
  3. Build updates dict from payload (exclude_unset=True — partial update)
  4. If department_id in updates: validate dept exists and is active
  5. If email in updates: check uniqueness (exclude self)
  6. Set updatedAt = now
  7. repo.update() → db.employees.update_one({"id": id}, {"$set": updates})
  8. Fetch updated doc and return EmployeeResponse
  ```

**5. Audit log:** `{ action: "UPDATE", resource_type: "employee", resource_id: id, ... }`

**6. Cache invalidation on frontend** → list and detail re-render with fresh data.

### Part E: Deleting an Employee

**Trigger:** Admin clicks Delete button on EmployeeProfile, confirms in ConfirmModal.

**1. ConfirmModal** (`components/ConfirmModal.tsx`):
- Shows: "Are you sure you want to delete John Doe? This will also revoke their user login access."

**2. On confirm:**
```typescript
async function handleDelete() {
  await deleteMutation.mutateAsync(id)
  navigate('/employees')
}
```

**3. useDeleteEmployee()** (`hooks/useEmployeesQuery.ts:45`) — uses **optimistic update**:
```typescript
useMutation({
  mutationFn: (id) => employeeService.deleteEmployee(id),
  onMutate: async (id) => {
    await qc.cancelQueries({ queryKey: ['employees', 'list'] })    // Cancel in-flight refetches
    const previous = qc.getQueryData(['employees', 'list', {}])    // Snapshot current cache
    qc.setQueryData(['employees', 'list', {}], (old) =>             // Optimistically remove
      old ? old.filter(e => e.id !== Number(id)) : [],
    )
    return { previous }
  },
  onError: (_err, _id, context) => {
    if (context?.previous) qc.setQueryData(['employees', 'list', {}], context.previous)  // Rollback
  },
  onSettled: () => qc.invalidateQueries({ queryKey: ['employees', 'list'] }),  // Always refetch
})
```

**4. Backend** `DELETE /employees/{id}`:
- Router-level: `require_password_not_expired`
- Route-level: `require_permissions(EMPLOYEE_DELETE)` (admin only)
- Controller: `EmployeeController.delete(employee_id, current_user)`:
  ```
  1. Defense-in-depth: if caller_role != ADMIN → raise ForbiddenError (403)
  2. repo.delete(employee_id) → db.employees.delete_one({"id": id})
  3. If deleted_count == 0 → raise NotFoundError (404)
  4. Cascade delete: auth_repo.delete_by_employee_id(employee_id)
     → db.auth_users.delete_one({"employee_id": employee_id})
  5. Return { "message": "Employee 12 deleted successfully" }
  ```

**5. Audit log:** `{ action: "DELETE", resource_type: "employee", resource_id: id, ... }`

**6. Frontend redirects** to `/employees` — the list already shows the employee removed (optimistic update), then refetches to confirm.

### Employee CRUD: Permission Matrix

| Action | Frontend Permission | Route Permission | Controller Defense |
|---|---|---|---|
| **List** | any authenticated | `EMPLOYEE_READ` (all roles) | None (unscoped) |
| **View detail** | any authenticated | `EMPLOYEE_READ` (all roles) | None (unscoped) |
| **Create** | `canCreate` (all roles) | `EMPLOYEE_CREATE` (all roles) | None |
| **Update** | `canUpdate` (admin/manager) | `EMPLOYEE_UPDATE` (admin/manager) | Rejects EMPLOYEE role with 403 |
| **Delete** | `canDelete` (admin only) | `EMPLOYEE_DELETE` (admin only) | Rejects non-ADMIN with 403 |

### Employee List: Client-side Filtering

The `displayedEmployees` array is derived via `useMemo`:
```typescript
const displayedEmployees = useMemo(() => {
  return employees.filter(e =>
    (deptFilter === 'all' || e.dept === deptFilter) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) ||
     e.email.toLowerCase().includes(search.toLowerCase()))
  )
}, [employees, deptFilter, search])
```

- **Status filter**: passed to `useEmployeesList()` as API parameter → server-side MongoDB regex filter
- **Department filter**: client-side filter on `e.dept` after data arrives
- **Search**: client-side case-insensitive match on name or email
- **Pagination**: 8 items per page, resets to page 1 when filters change

---

## Data Model Relationships

```
employees                   auth_users                  departments
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ id (PK, int)     │       │ id (PK, int)     │       │ id (PK, int)     │
│ name             │       │ employee_id (FK) │◄──────│ code             │
│ email (unique)   │◄──────│ email (unique)   │       │ name             │
│ department_id(FK)│──────►│ password_hash    │       │ description      │
│ role             │       │ auth_role (enum) │       │ head             │
│ status           │       │ is_active        │       │ status           │
│ position         │       │ must_change_pwd  │       └──────────────────┘
│ salary*          │       │ failed_attempts  │
│ national_id*     │       │ locked_until     │           audit_logs
│ rating*          │       │ last_login       │       ┌──────────────────┐
│ phone            │       └──────────────────┘       │ id (PK, int)     │
│ location         │                                   │ user_id (FK)     │
│ manager          │                                   │ action (enum)    │
│ start_date       │           counters                │ resource_type    │
│ date_of_birth    │       ┌──────────────────┐       │ resource_id      │
│ created_at       │       │ _id              │       │ outcome          │
│ updated_at       │       │ seq_value        │       │ detail           │
└──────────────────┘       └──────────────────┘       │ ip_address       │
                                                        │ timestamp        │
* Hidden from regular EmployeeResponse                   └──────────────────┘
  (only in EmployeeInternalResponse)
```

---

## Frontend Service Layer: Data Transformation

```
EmployeeApi (raw from API)          EmployeeView (used by components)
┌──────────────────────────┐       ┌──────────────────────────┐
│ id: 1                    │       │ id: 1                    │
│ name: "John Doe"         │       │ name: "John Doe"         │
│ email: "john@..."        │       │ email: "john@..."        │
│ department_id: 1         │       │ dept: "Engineering"      │
│ role: "Engineer"         │───►   │ role: "Engineer"         │
│ status: "active"         │       │ status: "active"         │
│ salary: 120000           │       │ salary: "$120,000"       │
│ rating: 4.5              │       │ rating: "4.5/5.0"        │
│ start_date: "2024-..."   │       │ startDate: "2024-01-15"  │
│ phone: "+1234567890"     │       │ phone: "+1234567890"     │
│ location: null           │       │ location: "—"            │
└──────────────────────────┘       │ avatarColor: "#3B82F6"   │
                                   └──────────────────────────┘
```

DepartmentService also enriches department data with:
- `headcount` (fetched in parallel from employee counts)
- `icon` (deterministic: IT → laptop, HR → people, FIN → money)
- `color` (deterministic from name hash)

---

## Development Workflow

### Local Setup

```bash
# Terminal 1: Backend
cd backend
make install     # uv pip install -r requirements.txt
make run         # uvicorn app.main:app --reload (port 8000)

# Terminal 2: Frontend
cd frontend
npm install
npm run dev      # Vite dev server (port 5173, proxies to 8000)
```

**Prerequisites:** Python 3.11+, Node 18+, MongoDB running on `localhost:27017`.

### Testing

```bash
# Backend (from backend/)
make tests              # pytest --cov=app tests/ (110 tests)
pytest tests/test_auth.py -v --tb=short  # single file

# Frontend (from frontend/)
npm test                # Vitest
npm run typecheck       # tsc -b --noEmit
npm run lint            # ESLint
```

### Vite Dev Proxy

Requests from the frontend dev server are proxied to the backend:

| Frontend URL | Proxied To |
|---|---|
| /auth/* | localhost:8000/auth/* |
| /employees/* | localhost:8000/employees/* |
| /departments/* | localhost:8000/departments/* |
| /audit/* | localhost:8000/audit/* |
| /health | localhost:8000/health |

Paths that accept `text/html` bypass the proxy and serve `index.html` (for client-side routing).

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Auto-increment `id` instead of ObjectId** | Human-readable IDs, consistent across environments |
| **Role NOT in JWT** | Role changes take effect immediately (no token reissue needed) |
| **`require_password_not_expired` at router level** | Single declaration protects all endpoints in a router; auth self-service routes are on a separate unguarded router |
| **Defense-in-depth at controller level** | Even if route-level permissions are misconfigured, controllers enforce the real rules |
| **Lazy `db` property in repositories** | No DB connection needed at import time; works with DI lifecycle |
| **`EmployeeApi` / `EmployeeView` dual types** | API shape differs from display shape (formatting, null coalescing, computed fields) |
| **React Query staleTime: 30s** | Re-navigation is instant; background refetch keeps data fresh |
| **Mock fallback in services** | App works offline or without backend for development |
| **Code splitting via React.lazy** | Smaller initial bundle; pages load on demand |

---

## Commit Convention

Every meaningful change gets its own commit following TDD (Red → Green → Refactor):

| Step | Type | Example |
|---|---|---|
| Red (failing test) | `test` | `test(auth): add login validation tests` |
| Green (passing code) | `feat` | `feat(auth): add login endpoint with validation` |
| Refactor (cleanup) | `refactor` | `refactor(auth): extract password hashing helper` |

Format: `<type>(<scope>): <description>` (imperative, lowercase, no period).
