# Backend Design-Pattern Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore strict `Routes → Controllers → Repositories → DB` layering, make DI real, centralize HTTP-error translation, remove cross-aggregate leaks.

**Architecture:** Tighten dependency flow. Controllers require repos via constructor injection (no defaults). Controllers may depend on other controllers but never another aggregate's repo. Domain exceptions replace HTTPException in controllers with a centralized handler. Seed data moves from main.py lifespan to a dedicated seed module.

**Tech Stack:** FastAPI + Motor (async MongoDB), Pydantic v2

---

### Phase 0: Create `core/security.py`

#### Task 0.1: Create `core/security.py`

**Files:**
- Create: `backend/app/core/security.py`

- [ ] **Create backend/app/core/security.py**

```python
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
```

#### Task 0.2: Convert `auth/utils.py` to shim

- [ ] **Replace backend/app/auth/utils.py with re-export shim**

```python
from app.core.security import *  # noqa: F401, F403
```

- [ ] **Run tests to verify no breakage**

Run: `cd backend && pytest -v --tb=short`
Expected: All tests pass (likely flaky due to test DB state, but no import errors)

---

### Phase 1: Real DI

#### Task 1.1: Create `dependencies/repositories.py`

**Files:**
- Create: `backend/app/dependencies/repositories.py`

- [ ] **Create backend/app/dependencies/repositories.py**

```python
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
```

#### Task 1.2: Update `EmployeeController` — require repos, add `create_pending`

**Files:**
- Modify: `backend/app/controllers/employee_controller.py`

- [ ] **Update `__init__` to require repos (no defaults)**

Change:
```python
def __init__(
    self,
    repo: Optional[EmployeeRepository] = None,
    dept_repo: Optional[DepartmentRepository] = None,
) -> None:
    self.repo = repo or EmployeeRepository()
    self.dept_repo = dept_repo or DepartmentRepository()
```

To:
```python
def __init__(
    self,
    repo: EmployeeRepository,
    dept_repo: DepartmentRepository,
) -> None:
    self.repo = repo
    self.dept_repo = dept_repo
```

- [ ] **Add `create_pending` method** (for auth registration — creates placeholder employee, bypasses dept-active check)

Add after the `_own_employee_id_or_403` method:
```python
async def create_pending(
    self,
    name: str,
    email: str,
) -> int:
    doc = {
        "name": name,
        "email": str(email),
        "role": "New Hire",
        "department_id": 1,
        "status": "active",
        "id": await self.repo.next_id(),
        "createdAt": utcnow(),
        "updatedAt": utcnow(),
    }
    await self.repo.insert(doc)
    return doc["id"]
```

#### Task 1.3: Update `DepartmentController` — require repo

**Files:**
- Modify: `backend/app/controllers/department_controller.py`

- [ ] **Update `__init__` to require repo**

Change:
```python
def __init__(self, repo: Optional[DepartmentRepository] = None) -> None:
    self.repo = repo or DepartmentRepository()
```

To:
```python
def __init__(self, repo: DepartmentRepository) -> None:
    self.repo = repo
```

Remove `Optional` import if no longer needed.

#### Task 1.4: Update `AuthController` — require repo + `employee_controller`

**Files:**
- Modify: `backend/app/controllers/auth_controller.py`

- [ ] **Update `__init__` and imports**

Add import at top:
```python
from app.controllers.employee_controller import EmployeeController
```

Change:
```python
def __init__(self, repo: Optional[AuthRepository] = None):
    self.repo = repo or AuthRepository()
```

To:
```python
def __init__(self, repo: AuthRepository, employee_controller: EmployeeController):
    self.repo = repo
    self.employee_controller = employee_controller
```

- [ ] **Update `register` method** — use injected `employee_controller` instead of importing `EmployeeRepository` inline

Remove these lines:
```python
from app.repositories.employee_repository import EmployeeRepository

emp_repo = EmployeeRepository()
emp_id = await emp_repo.next_id()
emp_doc = {
    "id": emp_id,
    ...
}
await emp_repo.insert(emp_doc)
```

Replace with:
```python
emp_id = await self.employee_controller.create_pending(name, email)
```

#### Task 1.5: Update `AuditController` — require all repos

**Files:**
- Modify: `backend/app/controllers/audit_controller.py`

- [ ] **Update `__init__` to require all three repos**

Change:
```python
def __init__(self, repo: Optional[AuditRepository] = None):
    self.repo = repo or AuditRepository()
```

To:
```python
def __init__(
    self,
    repo: AuditRepository,
    employee_repo: EmployeeRepository,
    auth_repo: AuthRepository,
) -> None:
    self.repo = repo
    self.employee_repo = employee_repo
    self.auth_repo = auth_repo
```

Remove `Optional` import if no longer needed.

- [ ] **Update `get_logs_for_user`** — use `self.employee_repo` and `self.auth_repo` instead of inline instantiation

Change:
```python
emp_repo = EmployeeRepository()
manager_emp = await emp_repo.find_by_id(current_user["employee_id"])
```
To:
```python
manager_emp = await self.employee_repo.find_by_id(current_user["employee_id"])
```

And change:
```python
dept_emps = await emp_repo.find_all(
    {"department_id": manager_emp["department_id"]}
)
```
To:
```python
dept_emps = await self.employee_repo.find_all(
    {"department_id": manager_emp["department_id"]}
)
```

And change:
```python
auth_repo = AuthRepository()
dept_user_ids = []
for eid in dept_employee_ids:
    u = await auth_repo.find_by_employee_id(eid)
    if u:
        dept_user_ids.append(u["id"])
```
To:
```python
dept_user_ids = await self.auth_repo.find_by_employee_ids(dept_employee_ids)
```

Note: This requires the bulk query method added in Phase 3. For now, keep the loop but use `self.auth_repo` — or you can keep the loop and refactor in Phase 3. The key change here is using `self.employee_repo`/`self.auth_repo` instead of inline `EmployeeRepository()`/`AuthRepository()`.

Actually, let's keep the loop for now and add `find_by_employee_ids` in Phase 3. Just update to use `self.auth_repo.find_by_employee_id(eid)` in the loop. We'll refactor to bulk query in Phase 3.

#### Task 1.6: Update dependency providers

**Files:**
- Modify: `backend/app/dependencies/employees.py`
- Modify: `backend/app/dependencies/departments.py`
- Modify: `backend/app/dependencies/audit.py`

- [ ] **Update `dependencies/employees.py`**

```python
from fastapi import Depends

from app.controllers.employee_controller import EmployeeController
from app.dependencies.repositories import get_department_repository, get_employee_repository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository


def get_employee_controller(
    repo: EmployeeRepository = Depends(get_employee_repository),
    dept_repo: DepartmentRepository = Depends(get_department_repository),
) -> EmployeeController:
    return EmployeeController(repo=repo, dept_repo=dept_repo)
```

- [ ] **Update `dependencies/departments.py`**

```python
from fastapi import Depends

from app.controllers.department_controller import DepartmentController
from app.dependencies.repositories import get_department_repository
from app.repositories.department_repository import DepartmentRepository


def get_department_controller(
    repo: DepartmentRepository = Depends(get_department_repository),
) -> DepartmentController:
    return DepartmentController(repo=repo)
```

- [ ] **Update `dependencies/audit.py`**

```python
from fastapi import Depends

from app.controllers.audit_controller import AuditController
from app.dependencies.repositories import (
    get_audit_repository,
    get_auth_repository,
    get_employee_repository,
)
from app.repositories.audit_repository import AuditRepository
from app.repositories.auth_repository import AuthRepository
from app.repositories.employee_repository import EmployeeRepository


def get_audit_controller(
    repo: AuditRepository = Depends(get_audit_repository),
    employee_repo: EmployeeRepository = Depends(get_employee_repository),
    auth_repo: AuthRepository = Depends(get_auth_repository),
) -> AuditController:
    return AuditController(repo=repo, employee_repo=employee_repo, auth_repo=auth_repo)
```

#### Task 1.7: Move `get_auth_controller` to `auth_provider.py`

**Files:**
- Create: `backend/app/dependencies/auth_provider.py`
- Modify: `backend/app/dependencies/auth.py`

- [ ] **Create `backend/app/dependencies/auth_provider.py`**

```python
from fastapi import Depends

from app.controllers.auth_controller import AuthController
from app.dependencies.employees import get_employee_controller
from app.dependencies.repositories import get_auth_repository
from app.repositories.auth_repository import AuthRepository
from app.controllers.employee_controller import EmployeeController


def get_auth_controller(
    repo: AuthRepository = Depends(get_auth_repository),
    employee_controller: EmployeeController = Depends(get_employee_controller),
) -> AuthController:
    return AuthController(repo=repo, employee_controller=employee_controller)
```

- [ ] **Remove `get_auth_controller` from `dependencies/auth.py`**

Delete the function:
```python
def get_auth_controller() -> AuthController:
    return AuthController()
```

And remove the `from app.controllers.auth_controller import AuthController` import from `dependencies/auth.py`.

#### Task 1.8: Update route imports

**Files:**
- Modify: `backend/app/api/routes/auth.py`
- (routes/employees.py, routes/departments.py, routes/audit.py keep their existing imports)

- [ ] **Update `routes/auth.py` import**

Change:
```python
from app.dependencies.auth import (
    get_auth_controller, get_current_user,
    require_password_not_expired, require_permissions,
)
```

To:
```python
from app.dependencies.auth import (
    get_current_user,
    require_password_not_expired, require_permissions,
)
from app.dependencies.auth_provider import get_auth_controller
```

#### Task 1.9: Run tests

- [ ] **Run full test suite**

Run: `cd backend && pytest -v --tb=short`
Expected: All tests pass. If not, fix import/DI wiring issues.

---

### Phase 2: Domain Exceptions + Central Handler

#### Task 2.1: Create `core/exceptions.py`

**Files:**
- Create: `backend/app/core/exceptions.py`

- [ ] **Create backend/app/core/exceptions.py**

```python
class DomainError(Exception):
    status_code: int = 500

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

    def __str__(self) -> str:
        return self.message


class NotFoundError(DomainError):
    status_code = 404


class ConflictError(DomainError):
    status_code = 409


class ForbiddenError(DomainError):
    status_code = 403


class ValidationError(DomainError):
    status_code = 400


class InvalidCredentialsError(DomainError):
    status_code = 401
```

#### Task 2.2: Create `api/exception_handlers.py`

**Files:**
- Create: `backend/app/api/exception_handlers.py`

- [ ] **Create backend/app/api/exception_handlers.py**

```python
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.core.exceptions import DomainError


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error_handler(_request, exc: DomainError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": str(exc)},
        )
```

#### Task 2.3: Register handlers in `main.py`

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Add exception handler registration in `create_app()`**

Add import:
```python
from app.api.exception_handlers import register_exception_handlers
```

Add before `return app`:
```python
    register_exception_handlers(app)
```

#### Task 2.4: Replace `HTTPException` in `EmployeeController`

**Files:**
- Modify: `backend/app/controllers/employee_controller.py`

- [ ] **Remove `from fastapi import HTTPException, status` and add domain exception imports**

Replace:
```python
from fastapi import HTTPException, status
```
With:
```python
from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
```

- [ ] **Replace all `raise HTTPException(...)` calls**

Replace each occurrence:

`_manager_dept_or_403`:
- `raise HTTPException(status_code=403, ...)` → `raise ForbiddenError("Manager account is not linked to an employee record")`
- `raise HTTPException(status_code=403, ...)` → `raise ForbiddenError("Manager profile missing or has no department")`

`_own_employee_id_or_403`:
- `raise HTTPException(status_code=403, ...)` → `raise ForbiddenError("User account is not linked to an employee record")`

`create`:
- `raise HTTPException(status_code=400, ...)` → `raise ValidationError(f"Email '{payload.email}' is already registered")`
- `raise HTTPException(400, ...)` → `raise ValidationError(f"Department with id {payload.department_id} not found")`
- `raise HTTPException(400, ...)` → `raise ValidationError(f"Department '{dept['name']}' is not active")`

`get`:
- `raise HTTPException(status_code=404, ...)` → `raise NotFoundError(f"Employee with id {employee_id} not found")`

`update`:
- `raise HTTPException(status_code=404, ...)` → `raise NotFoundError(f"Employee with id {employee_id} not found")`
- `raise HTTPException(403, ...)` → `raise ForbiddenError("Employees cannot update employee records")`
- `raise HTTPException(400, ...)` → `raise ValidationError(f"Department with id {updates['department_id']} not found")`
- `raise HTTPException(400, ...)` → `raise ValidationError(f"Department '{dept['name']}' is not active")`
- `raise HTTPException(status_code=400, ...)` → `raise ValidationError(f"Email '{updates['email']}' is already registered")`

`delete`:
- `raise HTTPException(403, ...)` → `raise ForbiddenError("Only administrators can delete employees")`
- `raise HTTPException(status_code=404, ...)` → `raise NotFoundError(f"Employee with id {employee_id} not found")`

Remove `from fastapi import HTTPException, status` if no longer needed. Keep `status` if it was only used for HTTPException status codes. Since we removed all those, remove the whole line.

#### Task 2.5: Replace `HTTPException` in `DepartmentController`

**Files:**
- Modify: `backend/app/controllers/department_controller.py`

- [ ] **Replace imports and all `raise HTTPException`**

Replace:
```python
from fastapi import HTTPException, status
```
With:
```python
from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    ValidationError,
)
```

Replace each occurrence:

`_normalize`:
- `raise HTTPException(422, ...)` → `raise ValidationError("name must not be empty after trimming")`

`create`:
- `raise HTTPException(400, ...)` → `raise ConflictError(f"Department code '{data['code']}' already exists")`

`get`:
- `raise HTTPException(404, ...)` → `raise NotFoundError(f"Department with id {dept_id} not found")`

`update`:
- `raise HTTPException(404, ...)` → `raise NotFoundError(f"Department with id {dept_id} not found")`
- `raise HTTPException(400, ...)` → `raise ConflictError(f"Department code '{updates['code']}' already exists")`

`delete`:
- `raise HTTPException(404, ...)` → `raise NotFoundError(f"Department with id {dept_id} not found")`
- `raise HTTPException(409, ...)` → `raise ConflictError(f"Cannot delete department: {emp_count} employee(s) still assigned. Reassign them first.")`

Remove `from fastapi import HTTPException, status` import.

#### Task 2.6: Replace `HTTPException` in `AuthController`

**Files:**
- Modify: `backend/app/controllers/auth_controller.py`

- [ ] **Replace imports**

Replace:
```python
from fastapi import HTTPException, status
```
With:
```python
from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
    InvalidCredentialsError,
)
```

- [ ] **Replace all `raise HTTPException(...)` calls**

`register`:
- `raise HTTPException(status_code=400, ...)` → `raise ConflictError(f"User with email '{email}' already registered")`

`create_auth_user`:
- `raise HTTPException(status_code=400, ...)` → `raise ConflictError(f"Auth user with email '{email}' already exists")`

`reject_user`:
- `raise HTTPException(status_code=404, ...)` → `raise NotFoundError("User not found")`

- [ ] **Replace `login None returns with exceptions`**

The `login` method returns `None` for 4 failure paths. Replace `return None` with `raise InvalidCredentialsError("Invalid credentials")`:

```python
async def login(self, email: str, password: str) -> dict:
    user = await self.repo.find_by_email(email)
    if user is None:
        raise InvalidCredentialsError("Invalid credentials")
    now = datetime.now(timezone.utc)
    locked_until = user.get("locked_until")
    if locked_until and locked_until > now:
        raise InvalidCredentialsError("Invalid credentials")
    if not verify_password(password, user["password_hash"]):
        failed = user.get("failed_attempts", 0) + 1
        update = {"failed_attempts": failed}
        if failed >= LOCKOUT_THRESHOLD:
            update["locked_until"] = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        await self.repo.update(user["id"], update)
        raise InvalidCredentialsError("Invalid credentials")
    if not user.get("is_active", False):
        raise InvalidCredentialsError("Invalid credentials")
    await self.repo.update(user["id"], {
        "last_login": now,
        "failed_attempts": 0,
        "locked_until": None,
    })
    token_data = {
        "sub": str(user["id"]),
        "employee_id": user.get("employee_id"),
        "email": user["email"],
        "must_change_pwd": user.get("must_change_password", False),
    }
    return {"access_token": create_access_token(data=token_data), "token_type": "bearer"}
```

Also update `change_password` to raise instead of returning None:

In `change_password`:
- `return None` (user not found) → `raise InvalidCredentialsError("User not found")`
- `return None` (wrong old password) → `raise InvalidCredentialsError("Current password is incorrect")`

#### Task 2.7: Clean up auth routes

**Files:**
- Modify: `backend/app/api/routes/auth.py`

- [ ] **Remove None→HTTPException translations from `/login` and `/password`**

Change `/login`:
```python
@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    controller: AuthController = Depends(get_auth_controller),
):
    result = await controller.login(body.email, body.password)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return result
```
To:
```python
@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    controller: AuthController = Depends(get_auth_controller),
):
    return await controller.login(body.email, body.password)
```

Change `/password`:
```python
@router.put("/password", response_model=TokenResponse)
async def change_password(
    body: PasswordChangeRequest,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(get_current_user),
):
    result = await controller.change_password(
        current_user["id"], body.old_password, body.new_password
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    return result
```
To:
```python
@router.put("/password", response_model=TokenResponse)
async def change_password(
    body: PasswordChangeRequest,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(get_current_user),
):
    return await controller.change_password(
        current_user["id"], body.old_password, body.new_password
    )
```

- [ ] **Remove unused `HTTPException` import from routes/auth.py** if it's no longer used elsewhere in the file.

Check if `HTTPException` is used anywhere else in the file. If not, remove:
```python
from fastapi import APIRouter, Depends, HTTPException, status
```
→
```python
from fastapi import APIRouter, Depends, status
```

#### Task 2.8: Run tests

- [ ] **Run full test suite**

Run: `cd backend && pytest -v --tb=short`
Expected: All tests pass. The exception handler should catch all `DomainError` subclasses and return the same status codes and `{"detail": "..."}` shape as before.

---

### Phase 3: Remove Cross-Aggregate Leaks

#### Task 3.1: Add `find_ids_by_department` + `count_by_department` to `EmployeeRepository`

**Files:**
- Modify: `backend/app/repositories/employee_repository.py`

- [ ] **Add two new methods**

```python
async def find_ids_by_department(self, dept_id: int) -> list[int]:
    cursor = self.db[COLLECTION].find(
        {"department_id": dept_id},
        {"id": 1, "_id": 0},
    )
    return [doc["id"] async for doc in cursor]

async def count_by_department(self, dept_id: int) -> int:
    return await self.db[COLLECTION].count_documents({"department_id": dept_id})
```

#### Task 3.2: Add `find_by_employee_ids` to `AuthRepository`

**Files:**
- Modify: `backend/app/repositories/auth_repository.py`

- [ ] **Add bulk query method**

```python
async def find_by_employee_ids(self, employee_ids: list[int]) -> list[dict]:
    cursor = self.db[COLLECTION].find({"employee_id": {"$in": employee_ids}})
    return await cursor.to_list(length=None)
```

#### Task 3.3: Update `audit_controller.get_logs_for_user` to use bulk queries

**Files:**
- Modify: `backend/app/controllers/audit_controller.py`

- [ ] **Replace the per-id loop**

Replace the manager-scope section (from `if role == AuthRole.MANAGER.value:` through to the `get_logs_by_user_ids` call) with:

```python
if role == AuthRole.MANAGER.value:
    manager_emp = await self.employee_repo.find_by_id(current_user["employee_id"])
    if manager_emp is None:
        return []
    dept_employee_ids = await self.employee_repo.find_ids_by_department(
        manager_emp["department_id"]
    )
    if not dept_employee_ids:
        return []
    dept_auth_users = await self.auth_repo.find_by_employee_ids(dept_employee_ids)
    dept_user_ids = [u["id"] for u in dept_auth_users if u]
    if not dept_user_ids:
        return []
    return await self.get_logs_by_user_ids(
        dept_user_ids, limit=limit, skip=skip,
    )
```

Remove unused `from app.repositories.employee_repository import EmployeeRepository` and `from app.repositories.auth_repository import AuthRepository` imports if they're no longer needed (they're now injected via constructor).

Actually check: they're still needed for type hints in `__init__`. Keep them.

#### Task 3.4: Delete `DepartmentRepository.count_employees`, update `department_controller.delete`

**Files:**
- Modify: `backend/app/repositories/department_repository.py`
- Modify: `backend/app/controllers/department_controller.py`

- [ ] **Remove `count_employees` from `DepartmentRepository`**

Delete:
```python
async def count_employees(self, dept_id: int) -> int:
    return await self.db["employees"].count_documents({"department_id": dept_id})
```

- [ ] **Update `DepartmentController.__init__` to accept `employee_repo`**

Change `__init__`:
```python
def __init__(self, repo: DepartmentRepository) -> None:
    self.repo = repo
```

To:
```python
def __init__(self, repo: DepartmentRepository, employee_repo: EmployeeRepository) -> None:
    self.repo = repo
    self.employee_repo = employee_repo
```

Add import at top:
```python
from app.repositories.employee_repository import EmployeeRepository
```

- [ ] **Update `delete` to use `employee_repo.count_by_department`**

Change:
```python
emp_count = await self.repo.count_employees(dept_id)
```

To:
```python
emp_count = await self.employee_repo.count_by_department(dept_id)
```

- [ ] **Update `dependencies/departments.py`**

```python
from fastapi import Depends

from app.controllers.department_controller import DepartmentController
from app.dependencies.repositories import get_department_repository, get_employee_repository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository


def get_department_controller(
    repo: DepartmentRepository = Depends(get_department_repository),
    employee_repo: EmployeeRepository = Depends(get_employee_repository),
) -> DepartmentController:
    return DepartmentController(repo=repo, employee_repo=employee_repo)
```

#### Task 3.5: Run tests

- [ ] **Run full test suite**

Run: `cd backend && pytest -v --tb=short`
Expected: All tests pass.

---

### Phase 4: Consistency Cleanup

#### Task 4.1: Simplify `EmployeeController._to_response`

**Files:**
- Modify: `backend/app/controllers/employee_controller.py`

- [ ] **Replace `_to_response` static method**

Change:
```python
@staticmethod
def _to_response(doc: dict) -> EmployeeResponse:
    return EmployeeResponse(
        id=doc["id"],
        name=doc["name"],
        ...
    )
```

To:
```python
@staticmethod
def _to_response(doc: dict) -> EmployeeResponse:
    return EmployeeResponse(**doc)
```

`EmployeeResponse` uses aliases (`createdAt` → `created_at`, `updatedAt` → `updated_at`) with `populate_by_name=True`, so `**doc` works correctly.

#### Task 4.2: Move `_sanitize_user` to `AuthUserResponse.from_doc`

**Files:**
- Modify: `backend/app/models/auth_user.py`
- Modify: `backend/app/controllers/auth_controller.py`

- [ ] **Add `from_doc` classmethod to `AuthUserResponse`**

```python
@classmethod
def from_doc(cls, doc: dict) -> "AuthUserResponse":
    return cls(**doc)
```

- [ ] **Update `auth_controller.list_users`**

Change:
```python
async def list_users(self) -> list[dict]:
    users = await self.repo.find_all()
    return [_sanitize_user(u) for u in users]
```

To:
```python
async def list_users(self) -> list[dict]:
    from app.models.auth_user import AuthUserResponse
    users = await self.repo.find_all()
    return [AuthUserResponse.from_doc(u).model_dump() for u in users]
```

- [ ] **Remove `_sanitize_user` function** from `auth_controller.py`

Delete the entire `_sanitize_user` function (lines 13-27).

#### Task 4.3: Add `current_user` + defense-in-depth to `DepartmentController`

**Files:**
- Modify: `backend/app/controllers/department_controller.py`

- [ ] **Add import for role checking**

```python
from app.core.permissions import AuthRole
```

- [ ] **Add `_role` helper or import from shared location**

For now, add as module-level private function (mirrors `employee_controller.py`):
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

- [ ] **Add `current_user` param to `update` and `delete`**

`update` signature change:
```python
async def update(self, dept_id: int, payload: DepartmentUpdate, current_user: Optional[dict] = None) -> DepartmentResponse:
```

Add defense-in-depth block after `existing` check (before updates logic):
```python
    if _role(current_user) == AuthRole.EMPLOYEE:
        raise ForbiddenError("Employees cannot update departments")
```

`delete` signature change:
```python
async def delete(self, dept_id: int, current_user: Optional[dict] = None) -> dict:
```

Add defense-in-depth block after `existing` check (before count check):
```python
    role = _role(current_user)
    if role is not None and role != AuthRole.ADMIN:
        raise ForbiddenError("Only administrators can delete departments")
```

#### Task 4.4: Update `routes/departments.py` to pass `current_user`

**Files:**
- Modify: `backend/app/api/routes/departments.py`

- [ ] **Add `current_user` to update and delete route handlers**

```python
@router.put("/{department_id}", response_model=DepartmentResponse, summary="Update an existing department")
async def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    controller: DepartmentController = Depends(get_department_controller),
    current_user: dict = Depends(require_permissions(Permission.DEPARTMENT_UPDATE)),
):
    return await controller.update(department_id, payload, current_user)
```

```python
@router.delete("/{department_id}", summary="Delete a department")
async def delete_department(
    department_id: int,
    controller: DepartmentController = Depends(get_department_controller),
    current_user: dict = Depends(require_permissions(Permission.DEPARTMENT_DELETE)),
):
    return await controller.delete(department_id, current_user)
```

#### Task 4.5: Remove `AuditController.log_async`

**Files:**
- Modify: `backend/app/controllers/audit_controller.py`

- [ ] **Delete the `log_async` method and remove `import asyncio`**

Remove:
```python
import asyncio
```

Remove:
```python
def log_async(self, entry: AuditLogEntry) -> None:
    asyncio.ensure_future(self.log(entry))
```

#### Task 4.6: Delete `auth/utils.py` shim, update all imports to `core/security`

**Files:**
- Delete: `backend/app/auth/utils.py`
- Modify: `backend/app/controllers/auth_controller.py`
- Modify: `backend/app/dependencies/auth.py`
- Modify: `tests/conftest.py`
- Modify: `tests/test_rbac_strict.py`

- [ ] **Delete `backend/app/auth/utils.py`**

- [ ] **Update `controllers/auth_controller.py`**

Change:
```python
from app.auth.utils import hash_password, verify_password, create_access_token
```
To:
```python
from app.core.security import hash_password, verify_password, create_access_token
```

- [ ] **Update `dependencies/auth.py`**

Change:
```python
from app.auth.utils import decode_access_token
```
To:
```python
from app.core.security import decode_access_token
```

- [ ] **Update `tests/conftest.py`**

Change:
```python
from app.auth.utils import create_access_token
```
To:
```python
from app.core.security import create_access_token
```

- [ ] **Update `tests/test_rbac_strict.py`**

Change:
```python
from app.auth.utils import create_access_token
```
To:
```python
from app.core.security import create_access_token
```

#### Task 4.7: Run tests

- [ ] **Run full test suite**

Run: `cd backend && pytest -v --tb=short`
Expected: All tests pass.

- [ ] **Run grep checks**

```bash
grep -r "from app.auth.utils" backend/
```
Expected: 0 hits

---

### Phase 5: Seed via Controllers

#### Task 5.1: Create `data/seed.py`

**Files:**
- Create: `backend/app/data/seed.py`

- [ ] **Create backend/app/data/seed.py**

```python
from app.controllers.auth_controller import AuthController
from app.controllers.employee_controller import EmployeeController
from app.data.sample_auth_users import SAMPLE_AUTH_USERS
from app.data.sample_departments import SAMPLE_DEPARTMENTS
from app.data.sample_employees import SAMPLE_EMPLOYEES
from app.repositories.auth_repository import AuthRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository


async def seed_if_empty() -> None:
    dept_repo = DepartmentRepository()
    emp_repo = EmployeeRepository()
    auth_repo = AuthRepository()

    if await dept_repo.count() == 0:
        await dept_repo.insert_many(list(SAMPLE_DEPARTMENTS))
        max_dept_id = max(d["id"] for d in SAMPLE_DEPARTMENTS)
        await dept_repo.set_counter(max_dept_id)

    if await emp_repo.count() == 0:
        await emp_repo.insert_many([dict(e) for e in SAMPLE_EMPLOYEES])
        max_emp_id = max(e["id"] for e in SAMPLE_EMPLOYEES)
        await emp_repo.set_counter(max_emp_id)

    if await auth_repo.count() == 0:
        emp_ctrl = EmployeeController(repo=emp_repo, dept_repo=dept_repo)
        auth_ctrl = AuthController(repo=auth_repo, employee_controller=emp_ctrl)
        for au in SAMPLE_AUTH_USERS:
            await auth_ctrl.create_auth_user(
                au["employee_id"], au["email"],
                au["password"], au["auth_role"],
            )
```

#### Task 5.2: Update `main.py` lifespan

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Replace inline `_seed_data_if_empty` with call to `seed_if_empty`**

Add import:
```python
from app.data.seed import seed_if_empty
```

Remove imports:
```python
from app.data.sample_departments import SAMPLE_DEPARTMENTS
from app.data.sample_employees import SAMPLE_EMPLOYEES
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository
```

Delete the entire `_seed_data_if_empty` function.

Update lifespan:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await seed_if_empty()
    yield
    await close_db()
```

Remove the inline seed-data import block:
```python
from app.repositories.auth_repository import AuthRepository
from app.controllers.auth_controller import AuthController
```

#### Task 5.3: Run tests

- [ ] **Run full test suite**

Run: `cd backend && pytest -v --tb=short`
Expected: All 110+ tests pass.

---

### Final Verification

- [ ] **Run all tests**

```bash
cd backend && pytest -v --tb=short
```

- [ ] **Run specific guard/RBAC tests**

```bash
pytest tests/test_route_guards.py tests/test_rbac_strict.py tests/test_rbac.py -v
```

- [ ] **Verify zero HTTPException in controllers**

```bash
grep -r "HTTPException" app/controllers/
```
Expected: 0 hits

- [ ] **Verify zero `from app.auth.utils` imports**

```bash
grep -r "from app.auth.utils" backend/
```
Expected: 0 hits

- [ ] **Verify no inline repo instantiation in controllers**

```bash
grep -rE "(Employee|Department|Auth|Audit)Repository\(\)" app/ \
  --exclude-dir=dependencies --exclude-dir=data --exclude-dir=__pycache__
```
Expected: 0 hits
