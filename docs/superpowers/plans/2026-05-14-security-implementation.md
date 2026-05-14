# Security System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authentication (JWT), permission-based RBAC, and audit logging to the EMS backend.

**Architecture:** Separate `auth_users` collection for login identities. String-based permission system where roles are collections of permission strings. Audit logs written asynchronously. All existing endpoints protected via FastAPI dependencies. Follows existing repository pattern (lazy `get_database()` via `@property`).

**Tech Stack:** FastAPI, Motor (MongoDB), python-jose (JWT), passlib+bcrypt (hashing), pytest+TestClient

**Prerequisites:** All file paths relative to `backend/` directory.

---

### Task 1: Install dependencies and update settings

**Files:**
- Modify: `requirements.txt`
- Modify: `app/core/settings.py`

- [ ] **Step 1: Add packages to requirements.txt**

Append:
```
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.9
```

- [ ] **Step 2: Install**

```bash
uv pip install python-jose[cryptography] passlib[bcrypt] python-multipart
```

- [ ] **Step 3: Add settings** (JWT fields already exist at lines 14-16)

Add after `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`:
```python
BCRYPT_WORK_FACTOR: int = 12
CORS_ORIGINS: list[str] = ["*"]
```

- [ ] **Step 4: Commit**

```bash
git add requirements.txt app/core/settings.py
git commit -m "feat: add auth dependencies and config (bcrypt, cors)"
```

---

### Task 2: Create core security utilities

**Files:**
- Create: `app/core/security.py`

- [ ] **Step 1: Create `app/core/security.py`**

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

- [ ] **Step 2: Commit**

```bash
git add app/core/security.py
git commit -m "feat: add JWT and bcrypt password utilities"
```

---

### Task 3: Create permissions system

**Files:**
- Create: `app/core/permissions.py`

- [ ] **Step 1: Create `app/core/permissions.py`**

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add app/core/permissions.py
git commit -m "feat: add permission enum and RBAC role mapping"
```

---

### Task 4: Create AuthUser Pydantic models

**Files:**
- Create: `app/models/auth_user.py`

- [ ] **Step 1: Create `app/models/auth_user.py`**

```python
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re
from app.core.permissions import AuthRole


_SPECIAL_RE = re.compile(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\\\;'/`~]")


def _validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit")
    if not _SPECIAL_RE.search(v):
        raise ValueError("Password must contain at least one special character")
    return v


class AuthUserCreate(BaseModel):
    employee_id: int
    email: EmailStr
    password: str
    auth_role: AuthRole = AuthRole.EMPLOYEE

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, v: str) -> str:
        return _validate_password(v)


class AuthUserResponse(BaseModel):
    id: int
    employee_id: int
    email: str
    auth_role: AuthRole
    is_active: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    employee_id: int
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, v: str) -> str:
        return _validate_password(v)


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_field(cls, v: str) -> str:
        return _validate_password(v)
```

- [ ] **Step 2: Commit**

```bash
git add app/models/auth_user.py
git commit -m "feat: add AuthUser Pydantic models"
```

---

### Task 5: Create AuthUser repository

**Important:** Follow the existing repository pattern exactly: no constructor `db` parameter, use lazy `get_database()` via `@property`. Use `"id"` as document field (not `"_id"`), matching `EmployeeRepository`.

**Files:**
- Create: `app/repositories/auth_repository.py`

- [ ] **Step 1: Create `app/repositories/auth_repository.py`**

```python
from datetime import datetime, timezone
from typing import Any, Optional
from app.db.mongodb import get_database

COLLECTION = "auth_users"
COUNTERS = "counters"


class AuthRepository:
    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            self._db = get_database()
        return self._db

    async def find_by_email(self, email: str) -> Optional[dict]:
        return await self.db[COLLECTION].find_one({"email": email})

    async def find_by_id(self, user_id: int) -> Optional[dict]:
        return await self.db[COLLECTION].find_one({"id": user_id})

    async def find_by_employee_id(self, employee_id: int) -> Optional[dict]:
        return await self.db[COLLECTION].find_one({"employee_id": employee_id})

    async def find_all(self) -> list[dict]:
        cursor = self.db[COLLECTION].find()
        return await cursor.to_list(length=None)

    async def insert(self, data: dict) -> int:
        data["id"] = await self.next_id()
        now = datetime.now(timezone.utc)
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data.setdefault("is_active", False)
        data.setdefault("failed_attempts", 0)
        data.setdefault("must_change_password", False)
        await self.db[COLLECTION].insert_one(data)
        return data["id"]

    async def update(self, user_id: int, updates: dict) -> None:
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.db[COLLECTION].update_one({"id": user_id}, {"$set": updates})

    async def delete(self, user_id: int) -> Any:
        return await self.db[COLLECTION].delete_one({"id": user_id})

    async def next_id(self) -> int:
        result = await self.db[COUNTERS].find_one_and_update(
            {"_id": "auth_user_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result["seq"]

    async def set_counter(self, value: int) -> None:
        await self.db[COUNTERS].update_one(
            {"_id": "auth_user_id"},
            {"$set": {"seq": value}},
            upsert=True,
        )

    async def count(self) -> int:
        return await self.db[COLLECTION].count_documents({})
```

- [ ] **Step 2: Commit**

```bash
git add app/repositories/auth_repository.py
git commit -m "feat: add AuthUser repository"
```

---

### Task 6: Create AuthController

**Files:**
- Create: `app/controllers/auth_controller.py`

- [ ] **Step 1: Create `app/controllers/auth_controller.py`**

```python
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, status

from app.core.security import hash_password, verify_password, create_access_token
from app.core.permissions import AuthRole
from app.repositories.auth_repository import AuthRepository

LOCKOUT_THRESHOLD = 5
LOCKOUT_DURATION_MINUTES = 15


class AuthController:
    def __init__(self, repo: Optional[AuthRepository] = None):
        self.repo = repo or AuthRepository()

    async def login(self, email: str, password: str) -> Optional[dict]:
        user = await self.repo.find_by_email(email)
        if user is None:
            return None
        now = datetime.now(timezone.utc)
        locked_until = user.get("locked_until")
        if locked_until and locked_until > now:
            return None
        if not verify_password(password, user["password_hash"]):
            failed = user.get("failed_attempts", 0) + 1
            update = {"failed_attempts": failed}
            if failed >= LOCKOUT_THRESHOLD:
                update["locked_until"] = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            await self.repo.update(user["id"], update)
            return None
        await self.repo.update(user["id"], {
            "last_login": now,
            "failed_attempts": 0,
            "locked_until": None,
        })
        token_data = {
            "sub": str(user["id"]),
            "role": user["auth_role"],
            "employee_id": user.get("employee_id"),
            "email": user["email"],
            "must_change_pwd": user.get("must_change_password", False),
        }
        return {"access_token": create_access_token(data=token_data), "token_type": "bearer"}

    async def register(self, employee_id: int, email: str, password: str) -> int:
        password_hash = hash_password(password)
        return await self.repo.insert({
            "employee_id": employee_id,
            "email": email,
            "password_hash": password_hash,
            "auth_role": AuthRole.EMPLOYEE.value,
            "is_active": False,
        })

    async def create_auth_user(self, employee_id: int, email: str, password: str, role: AuthRole) -> int:
        existing = await self.repo.find_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Auth user with email '{email}' already exists",
            )
        password_hash = hash_password(password)
        return await self.repo.insert({
            "employee_id": employee_id,
            "email": email,
            "password_hash": password_hash,
            "auth_role": role.value,
            "is_active": True,
            "must_change_password": True,
        })

    async def activate_user(self, user_id: int) -> bool:
        await self.repo.update(user_id, {"is_active": True})
        return True

    async def change_password(self, user_id: int, old_password: str, new_password: str) -> bool:
        user = await self.repo.find_by_id(user_id)
        if user is None:
            return False
        if not verify_password(old_password, user["password_hash"]):
            return False
        new_hash = hash_password(new_password)
        await self.repo.update(user_id, {
            "password_hash": new_hash,
            "must_change_password": False,
            "failed_attempts": 0,
            "locked_until": None,
        })
        return True

    async def get_user(self, user_id: int) -> Optional[dict]:
        return await self.repo.find_by_id(user_id)

    async def list_users(self) -> list[dict]:
        return await self.repo.find_all()
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/auth_controller.py
git commit -m "feat: add AuthController (login, register, password, lockout)"
```

---

### Task 7: Update auth dependencies

`app/dependencies/auth.py` already exists with a placeholder `get_auth_controller()`. Keep it and append the security guard dependencies.

**Files:**
- Modify: `app/dependencies/auth.py`

- [ ] **Step 1: Rewrite `app/dependencies/auth.py`**

Replace entire file with:

```python
"""Dependency providers for the Auth resource."""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from typing import Callable

from app.controllers.auth_controller import AuthController
from app.core.security import decode_access_token
from app.core.permissions import AuthRole, Permission, ROLE_PERMISSIONS

security_scheme = HTTPBearer(auto_error=False)


def get_auth_controller() -> AuthController:
    return AuthController()


async def get_current_user(
    token: str = Depends(security_scheme),
    controller: AuthController = Depends(get_auth_controller),
) -> dict:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    payload = decode_access_token(token.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user = await controller.get_user(int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive",
        )
    return user


async def require_password_not_expired(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Reject access if user must change password (skipped by /auth/password)."""
    if current_user.get("must_change_password", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required. Use PUT /auth/password",
        )
    return current_user


def require_permissions(*permissions: Permission) -> Callable:
    async def dependency(
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        if current_user.get("auth_role") == AuthRole.ADMIN.value:
            return current_user
        user_perms = ROLE_PERMISSIONS.get(AuthRole(current_user.get("auth_role")), [])
        for perm in permissions:
            if perm.value not in user_perms:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions: {perm.value} required",
                )
        return current_user
    return dependency
```

- [ ] **Step 2: Commit**

```bash
git add app/dependencies/auth.py
git commit -m "feat: add auth guard dependencies with password expiry check"
```

---

### Task 8: Create auth routes

`app/main.py` line 10 already imports `auth_router` — just create the route file.

**Files:**
- Create: `app/api/routes/auth.py`

- [ ] **Step 1: Create `app/api/routes/auth.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status

from app.controllers.auth_controller import AuthController
from app.dependencies.auth import (
    get_auth_controller, get_current_user, require_permissions,
)
from app.core.permissions import Permission
from app.models.auth_user import (
    LoginRequest, TokenResponse, RegisterRequest,
    AuthUserCreate, PasswordChangeRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


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


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    controller: AuthController = Depends(get_auth_controller),
):
    user_id = await controller.register(body.employee_id, body.email, body.password)
    return {"id": user_id, "message": "Registration submitted. Awaiting admin approval."}


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_auth_user(
    body: AuthUserCreate,
    controller: AuthController = Depends(get_auth_controller),
    _: dict = Depends(require_permissions(Permission.AUTH_USER_CREATE)),
):
    user_id = await controller.create_auth_user(
        body.employee_id, body.email, body.password, body.auth_role
    )
    return {"id": user_id}


@router.get("/users")
async def list_auth_users(
    controller: AuthController = Depends(get_auth_controller),
    _: dict = Depends(require_permissions(Permission.AUTH_USER_CREATE)),
):
    return await controller.list_users()


@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    controller: AuthController = Depends(get_auth_controller),
    _: dict = Depends(require_permissions(Permission.AUTH_USER_CREATE)),
):
    await controller.activate_user(user_id)
    return {"message": "User activated"}


@router.put("/password")
async def change_password(
    body: PasswordChangeRequest,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(get_current_user),
):
    success = await controller.change_password(
        current_user["id"], body.old_password, body.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    return {"message": "Password changed successfully"}
```

- [ ] **Step 2: Verify server starts**

```bash
cd backend && uvicorn app.main:app --reload 2>&1 | head -5
```
Expected: No import errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/routes/auth.py
git commit -m "feat: add auth endpoints (login, register, users, password)"
```

---

### Task 9: Seed auth users and wire into app lifecycle

**Files:**
- Create: `app/data/sample_auth_users.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create `app/data/sample_auth_users.py`**

```python
from app.core.permissions import AuthRole

SAMPLE_AUTH_USERS = [
    {
        "employee_id": 1,
        "email": "admin@ems.com",
        "password": "Admin@1234",
        "auth_role": AuthRole.ADMIN,
        "is_active": True,
        "must_change_password": True,
    },
    {
        "employee_id": 2,
        "email": "manager@ems.com",
        "password": "Manager@1234",
        "auth_role": AuthRole.MANAGER,
        "is_active": True,
        "must_change_password": True,
    },
    {
        "employee_id": 3,
        "email": "employee@ems.com",
        "password": "Employee@1234",
        "auth_role": AuthRole.EMPLOYEE,
        "is_active": True,
        "must_change_password": True,
    },
]
```

- [ ] **Step 2: Add auth seeding to `_seed_data_if_empty()` in main.py**

Read `app/main.py`. Add after the existing employee seeding:

```python
# Add import at top:
from app.core.permissions import AuthRole

# Inside _seed_data_if_empty(), after employee seed block:
    from app.repositories.auth_repository import AuthRepository
    from app.controllers.auth_controller import AuthController

    auth_repo = AuthRepository()
    auth_ctrl = AuthController(auth_repo)
    if await auth_repo.count() == 0:
        from app.data.sample_auth_users import SAMPLE_AUTH_USERS
        for au in SAMPLE_AUTH_USERS:
            await auth_ctrl.create_auth_user(
                au["employee_id"], au["email"],
                au["password"], au["auth_role"],
            )
```

- [ ] **Step 3: Commit**

```bash
git add app/data/sample_auth_users.py app/main.py
git commit -m "feat: add auth user seeding (admin, manager, employee)"
```

---

### Task 10: Add CORS middleware

**Files:**
- Modify: `app/main.py`

- [ ] **Step 1: Add CORS middleware**

In `create_app()`, add after `app = FastAPI(...)`:

```python
from fastapi.middleware.cors import CORSMiddleware

# In create_app():
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
```

- [ ] **Step 2: Commit**

```bash
git add app/main.py
git commit -m "feat: add CORS middleware"
```

---

### Task 11: Create AuditLog Pydantic model

**Files:**
- Create: `app/models/audit_log.py`

- [ ] **Step 1: Create `app/models/audit_log.py`**

```python
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class AuditLogEntry(BaseModel):
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    outcome: str
    detail: Optional[str] = None
    ip_address: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None


class AuditLogResponse(AuditLogEntry):
    id: int
    timestamp: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Commit**

```bash
git add app/models/audit_log.py
git commit -m "feat: add AuditLog Pydantic model"
```

---

### Task 12: Create AuditLog repository

Follow existing repository pattern (lazy `get_database()` via `@property`).

**Files:**
- Create: `app/repositories/audit_repository.py`

- [ ] **Step 1: Create `app/repositories/audit_repository.py`**

```python
from datetime import datetime, timezone
from typing import Optional
from app.db.mongodb import get_database

COLLECTION = "audit_logs"
COUNTERS = "counters"


class AuditRepository:
    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            self._db = get_database()
        return self._db

    async def next_id(self) -> int:
        result = await self.db[COUNTERS].find_one_and_update(
            {"_id": "audit_log_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result["seq"]

    async def set_counter(self, value: int) -> None:
        await self.db[COUNTERS].update_one(
            {"_id": "audit_log_id"},
            {"$set": {"seq": value}},
            upsert=True,
        )

    async def insert(self, entry: dict) -> int:
        entry["id"] = await self.next_id()
        entry["timestamp"] = datetime.now(timezone.utc)
        await self.db[COLLECTION].insert_one(entry)
        return entry["id"]

    async def find_all(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        outcome: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> list[dict]:
        query = {}
        if user_id is not None:
            query["user_id"] = user_id
        if action is not None:
            query["action"] = action
        if resource_type is not None:
            query["resource_type"] = resource_type
        if outcome is not None:
            query["outcome"] = outcome
        cursor = (
            self.db[COLLECTION].find(query)
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )
        return [doc async for doc in cursor]

    async def find_by_user_ids(
        self, user_ids: list[int], limit: int = 100, skip: int = 0
    ) -> list[dict]:
        cursor = (
            self.db[COLLECTION].find({"user_id": {"$in": user_ids}})
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )
        return [doc async for doc in cursor]
```

- [ ] **Step 2: Commit**

```bash
git add app/repositories/audit_repository.py
git commit -m "feat: add AuditLog repository"
```

---

### Task 13: Create AuditController with scope logic

Business logic (including manager department scope) lives in the controller — routes stay thin.

**Files:**
- Create: `app/controllers/audit_controller.py`

- [ ] **Step 1: Create `app/controllers/audit_controller.py`**

```python
from typing import Optional
from app.repositories.audit_repository import AuditRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.auth_repository import AuthRepository
from app.models.audit_log import AuditLogEntry
from app.core.permissions import AuthRole
import asyncio


class AuditController:
    def __init__(self, repo: Optional[AuditRepository] = None):
        self.repo = repo or AuditRepository()

    async def log(self, entry: AuditLogEntry) -> int:
        return await self.repo.insert(entry.model_dump(exclude_none=True))

    def log_async(self, entry: AuditLogEntry) -> None:
        asyncio.ensure_future(self.log(entry))

    async def get_logs(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        outcome: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> list[dict]:
        return await self.repo.find_all(
            user_id=user_id, action=action,
            resource_type=resource_type, outcome=outcome,
            limit=limit, skip=skip,
        )

    async def get_logs_by_user_ids(
        self, user_ids: list[int], limit: int = 100, skip: int = 0
    ) -> list[dict]:
        return await self.repo.find_by_user_ids(user_ids, limit=limit, skip=skip)

    async def get_logs_for_user(
        self,
        current_user: dict,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        outcome: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> list[dict]:
        role = current_user.get("auth_role")
        if role == AuthRole.ADMIN.value:
            return await self.get_logs(
                action=action, resource_type=resource_type,
                outcome=outcome, limit=limit, skip=skip,
            )
        if role == AuthRole.MANAGER.value:
            emp_repo = EmployeeRepository()
            manager_emp = await emp_repo.find_by_id(current_user["employee_id"])
            if manager_emp is None:
                return []
            dept_emps = await emp_repo.find_all(
                {"department_id": manager_emp["department_id"]}
            )
            dept_employee_ids = [e["id"] for e in dept_emps]
            auth_repo = AuthRepository()
            dept_user_ids = []
            for eid in dept_employee_ids:
                u = await auth_repo.find_by_employee_id(eid)
                if u:
                    dept_user_ids.append(u["id"])
            if not dept_user_ids:
                return []
            return await self.get_logs_by_user_ids(
                dept_user_ids, limit=limit, skip=skip,
            )
        return await self.get_logs(
            user_id=current_user["id"], limit=limit, skip=skip,
        )
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/audit_controller.py
git commit -m "feat: add AuditController with role-scoped log queries"
```

---

### Task 14: Create audit routes (thin)

**Files:**
- Create: `app/dependencies/audit.py`
- Create: `app/api/routes/audit.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create `app/dependencies/audit.py`**

```python
from app.controllers.audit_controller import AuditController

def get_audit_controller() -> AuditController:
    return AuditController()
```

- [ ] **Step 2: Create `app/api/routes/audit.py`**

```python
from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.controllers.audit_controller import AuditController
from app.dependencies.audit import get_audit_controller
from app.dependencies.auth import get_current_user, require_password_not_expired
from app.models.audit_log import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
async def get_audit_logs(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    controller: AuditController = Depends(get_audit_controller),
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(require_password_not_expired),
):
    logs = await controller.get_logs_for_user(
        current_user, action=action, resource_type=resource_type,
        outcome=outcome, limit=limit, skip=skip,
    )
    return [AuditLogResponse(**log) for log in logs]
```

- [ ] **Step 3: Wire audit router into main.py**

```python
# Add import:
from app.api.routes.audit import router as audit_router

# Add registration (in create_app()):
app.include_router(audit_router)
```

- [ ] **Step 4: Commit**

```bash
git add app/dependencies/audit.py app/api/routes/audit.py app/main.py
git commit -m "feat: add audit log viewing endpoint with role scoping"
```

---

### Task 15: Create rate limiter middleware

**Files:**
- Create: `app/middleware/__init__.py`
- Create: `app/middleware/ratelimit.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create `app/middleware/__init__.py`**

```python
```

- [ ] **Step 2: Create `app/middleware/ratelimit.py`**

Uses `time.monotonic()` (survives clock adjustments).

```python
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
import time


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self._requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/auth/login":
            ip = request.client.host if request.client else "unknown"
            now = time.monotonic()
            window_start = now - 60
            self._requests[ip] = [t for t in self._requests[ip] if t > window_start]
            if len(self._requests[ip]) >= self.requests_per_minute:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many login attempts. Try again later.",
                )
            self._requests[ip].append(now)
        response = await call_next(request)
        return response
```

- [ ] **Step 3: Wire into main.py**

```python
from app.middleware.ratelimit import RateLimitMiddleware

# In create_app(), after app creation:
app.add_middleware(RateLimitMiddleware)
```

- [ ] **Step 4: Commit**

```bash
git add app/middleware/
git commit -m "feat: add login rate limiter middleware"
```

---

### Task 16: Create security headers middleware

**Files:**
- Create: `app/middleware/security_headers.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create `app/middleware/security_headers.py`**

```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Cache-Control"] = "no-store"
        return response
```

- [ ] **Step 2: Wire into main.py**

```python
from app.middleware.security_headers import SecurityHeadersMiddleware

# In create_app(), after CORS and before RateLimitMiddleware:
app.add_middleware(SecurityHeadersMiddleware)
```

- [ ] **Step 3: Commit**

```bash
git add app/middleware/security_headers.py app/main.py
git commit -m "feat: add security headers middleware"
```

---

### Task 17: Add auth to employee routes + scope filtering

Protected endpoints use **both** `require_permissions` and `require_password_not_expired`:
```
Depends(require_permissions(Permission.X)) checks: authenticated + has permission
Depends(require_password_not_expired)  checks: must_change_password is False
```

FastAPI caches `get_current_user` — it only runs once per request even when called from both.

**Files:**
- Modify: `app/api/routes/employees.py`
- Modify: `app/controllers/employee_controller.py`

- [ ] **Step 1: Update employee routes with auth dependencies**

Read existing `app/api/routes/employees.py`. Add auth to each endpoint:

```python
# Add imports:
from app.dependencies.auth import get_current_user, require_permissions, require_password_not_expired
from app.core.permissions import Permission

# Each endpoint gets BOTH permission check AND password expiry check:

@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_CREATE)),
    _: dict = Depends(require_password_not_expired),
):
    return await controller.create(payload, current_user)


@router.get("", response_model=list[EmployeeResponse])
async def list_employees(
    department_id: Optional[int] = Query(None),
    role: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),
    _: dict = Depends(require_password_not_expired),
):
    return await controller.list(department_id, role, name, current_user)


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),
    _: dict = Depends(require_password_not_expired),
):
    return await controller.get(employee_id, current_user)


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_UPDATE)),
    _: dict = Depends(require_password_not_expired),
):
    return await controller.update(employee_id, payload, current_user)


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: int,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_DELETE)),
    _: dict = Depends(require_password_not_expired),
):
    return await controller.delete(employee_id, current_user)
```

- [ ] **Step 2: Add scope filtering to EmployeeController**

Read existing `app/controllers/employee_controller.py`. Add `current_user` parameter and scope checks to each method:

```python
# Add import at top:
from app.core.permissions import AuthRole

# Modify create() — add manager department scope check:
async def create(self, payload: EmployeeCreate, current_user: Optional[dict] = None) -> EmployeeResponse:
    if current_user and current_user.get("auth_role") == AuthRole.MANAGER.value:
        manager_emp = await self.repo.find_by_id(current_user["employee_id"])
        if manager_emp and payload.department_id != manager_emp.get("department_id"):
            raise HTTPException(status_code=403, detail="Cannot create employees outside your department")
    # ... existing validation unchanged (duplicate email, dept check, insert)...

# Modify list() — add scope filtering:
async def list(
    self,
    department_id: Optional[int] = None,
    role: Optional[str] = None,
    name: Optional[str] = None,
    current_user: Optional[dict] = None,
) -> list[EmployeeResponse]:
    if current_user and current_user.get("auth_role") == AuthRole.EMPLOYEE.value:
        emp = await self.repo.find_by_id(current_user["employee_id"])
        return [self._to_response(emp)] if emp else []
    if current_user and current_user.get("auth_role") == AuthRole.MANAGER.value:
        manager_emp = await self.repo.find_by_id(current_user["employee_id"])
        if manager_emp:
            department_id = manager_emp["department_id"]
    query: dict = {}
    if department_id:
        query["department_id"] = department_id
    if role:
        query["role"] = role
    if name:
        query["name"] = {"$regex": name, "$options": "i"}
    docs = await self.repo.find_all(query)
    return [self._to_response(d) for d in docs]

# Modify get() — add scope check:
async def get(self, employee_id: int, current_user: Optional[dict] = None) -> EmployeeResponse:
    doc = await self.repo.find_by_id(employee_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Employee with id {employee_id} not found")
    if current_user:
        role = current_user.get("auth_role")
        if role == AuthRole.EMPLOYEE.value and doc["id"] != current_user["employee_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        if role == AuthRole.MANAGER.value:
            manager_emp = await self.repo.find_by_id(current_user["employee_id"])
            if manager_emp and doc.get("department_id") != manager_emp.get("department_id"):
                raise HTTPException(status_code=403, detail="Access denied")
    return self._to_response(doc)

# Modify update() — add scope check:
async def update(self, employee_id: int, payload: EmployeeUpdate, current_user: Optional[dict] = None) -> EmployeeResponse:
    if current_user and current_user.get("auth_role") == AuthRole.EMPLOYEE.value:
        if employee_id != current_user["employee_id"]:
            raise HTTPException(status_code=403, detail="Cannot update other employees")
    if current_user and current_user.get("auth_role") == AuthRole.MANAGER.value:
        target = await self.repo.find_by_id(employee_id)
        if target:
            manager_emp = await self.repo.find_by_id(current_user["employee_id"])
            if manager_emp and target.get("department_id") != manager_emp.get("department_id"):
                raise HTTPException(status_code=403, detail="Cannot update employees outside your department")
    # ... existing update logic unchanged ...
```

- [ ] **Step 3: Commit**

```bash
git add app/api/routes/employees.py app/controllers/employee_controller.py
git commit -m "feat: add auth scope filtering to employee endpoints"
```

---

### Task 18: Add auth to department routes

Protected endpoints use **both** `require_permissions` and `require_password_not_expired` (same pattern as Task 17).

**Files:**
- Modify: `app/api/routes/departments.py`

- [ ] **Step 1: Update department routes with auth dependencies**

Read existing `app/api/routes/departments.py`. Add both auth deps to each endpoint:

```python
# Add imports:
from app.dependencies.auth import require_permissions, require_password_not_expired
from app.core.permissions import Permission

# Each endpoint gets both deps. Pattern:
    current_user: dict = Depends(require_permissions(Permission.DEPARTMENT_READ)),
    _: dict = Depends(require_password_not_expired),
```

Apply to all 5 endpoints:
- `GET ""` → `require_permissions(Permission.DEPARTMENT_READ)`
- `GET "/{department_id}"` → `require_permissions(Permission.DEPARTMENT_READ)`
- `POST ""` → `require_permissions(Permission.DEPARTMENT_CREATE)`
- `PUT "/{department_id}"` → `require_permissions(Permission.DEPARTMENT_UPDATE)`
- `DELETE "/{department_id}"` → `require_permissions(Permission.DEPARTMENT_DELETE)`

All also get `Depends(require_password_not_expired)`.

- [ ] **Step 2: Commit**

```bash
git add app/api/routes/departments.py
git commit -m "feat: add auth to department endpoints"
```

---

### Task 19: Update test conftest

Use module-level sync token generation — no async fixtures needed for auth. Auth users are seeded during lifespan via `_seed_data_if_empty()` (already set up in Task 9).

**Files:**
- Modify: `tests/conftest.py`

- [ ] **Step 1: Add env vars and module-level auth tokens**

In `tests/conftest.py`, add after the existing `os.environ` lines:

```python
os.environ["BCRYPT_WORK_FACTOR"] = "4"
os.environ["CORS_ORIGINS"] = '["*"]'
```

After all imports, add module-level tokens and sync fixtures:

```python
from app.core.security import create_access_token
from app.core.permissions import AuthRole

ADMIN_TOKEN = create_access_token({
    "sub": "1",
    "role": AuthRole.ADMIN.value,
    "employee_id": 1,
    "email": "admin@ems.com",
})
MANAGER_TOKEN = create_access_token({
    "sub": "2",
    "role": AuthRole.MANAGER.value,
    "employee_id": 2,
    "email": "manager@ems.com",
})
EMPLOYEE_TOKEN = create_access_token({
    "sub": "3",
    "role": AuthRole.EMPLOYEE.value,
    "employee_id": 3,
    "email": "employee@ems.com",
})


@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {ADMIN_TOKEN}"}


@pytest.fixture
def manager_headers():
    return {"Authorization": f"Bearer {MANAGER_TOKEN}"}


@pytest.fixture
def employee_headers():
    return {"Authorization": f"Bearer {EMPLOYEE_TOKEN}"}
```

These tokens are pure crypto (no DB needed). The seeded auth users have IDs 1, 2, 3 matching the token `sub` values. Tokens are valid for 30 minutes — enough for any test run.

- [ ] **Step 2: Commit**

```bash
git add tests/conftest.py
git commit -m "test: add sync auth fixtures (module-level token generation)"
```

---

### Task 20: Create auth system tests

**Files:**
- Create: `tests/test_auth.py`

Uses the existing sync `TestClient` + `api` fixture pattern (already in test_employees.py).

- [ ] **Step 1: Create `tests/test_auth.py`**

```python
"""Tests for auth endpoints (login, register, password change)."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def api():
    with TestClient(app) as client:
        yield client


def test_login_success_admin(api):
    response = api.post("/auth/login", json={
        "email": "admin@ems.com",
        "password": "Admin@1234",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(api):
    response = api.post("/auth/login", json={
        "email": "admin@ems.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_nonexistent_email(api):
    response = api.post("/auth/login", json={
        "email": "nonexistent@test.com",
        "password": "Test@1234",
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_register_creates_inactive(api):
    response = api.post("/auth/register", json={
        "employee_id": 99,
        "email": "new@test.com",
        "password": "NewUser@1234",
    })
    assert response.status_code == 201


def test_password_validation_short(api):
    response = api.post("/auth/register", json={
        "employee_id": 99,
        "email": "weak@test.com",
        "password": "short",
    })
    assert response.status_code == 422


def test_protected_endpoint_no_token(api):
    response = api.get("/employees/")
    assert response.status_code == 401


def test_change_password(auth_headers, api):
    response = api.put("/auth/password", json={
        "old_password": "Admin@1234",
        "new_password": "NewAdmin@5678",
    }, headers=auth_headers)
    assert response.status_code == 200


def test_health_is_public(api):
    response = api.get("/health")
    assert response.status_code == 200
```

- [ ] **Step 2: Run tests**

```bash
pytest tests/test_auth.py -v
```
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/test_auth.py
git commit -m "test: add auth endpoint tests"
```

---

### Task 21: Create RBAC enforcement tests

**Files:**
- Create: `tests/test_rbac.py`

- [ ] **Step 1: Create `tests/test_rbac.py`**

```python
"""Tests for RBAC permission enforcement."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def api():
    with TestClient(app) as client:
        yield client


def test_unauthenticated_fails(api):
    resp = api.get("/departments/")
    assert resp.status_code == 401


def test_employee_cannot_create_employee(api, employee_headers):
    resp = api.post("/employees/", json={
        "name": "Fail", "email": "fail@test.com",
        "role": "Eng", "department_id": 1,
    }, headers=employee_headers)
    assert resp.status_code == 403


def test_employee_cannot_delete_employee(api, employee_headers):
    resp = api.delete("/employees/1", headers=employee_headers)
    assert resp.status_code == 403


def test_manager_cannot_delete_employee(api, manager_headers):
    resp = api.delete("/employees/1", headers=manager_headers)
    assert resp.status_code == 403


def test_admin_can_delete_employee(api, auth_headers):
    # Create then delete
    created = api.post("/employees/", json={
        "name": "DeleteMe", "email": "del@test.com",
        "role": "Eng", "department_id": 1,
    }, headers=auth_headers).json()
    resp = api.delete(f"/employees/{created['id']}", headers=auth_headers)
    assert resp.status_code == 200


def test_employee_cannot_create_department(api, employee_headers):
    resp = api.post("/departments/", json={
        "name": "Fail", "code": "FAIL",
    }, headers=employee_headers)
    assert resp.status_code == 403


def test_employee_cannot_delete_department(api, employee_headers):
    resp = api.delete("/departments/1", headers=employee_headers)
    assert resp.status_code == 403


def test_manager_cannot_delete_department(api, manager_headers):
    resp = api.delete("/departments/1", headers=manager_headers)
    assert resp.status_code == 403


def test_admin_can_create_department(api, auth_headers):
    import uuid
    code = f"T{uuid.uuid4().hex[:4].upper()}"
    resp = api.post("/departments/", json={
        "name": "Test Dept", "code": code,
    }, headers=auth_headers)
    assert resp.status_code == 201


def test_health_is_public(api):
    resp = api.get("/health")
    assert resp.status_code == 200
```

- [ ] **Step 2: Run tests**

```bash
pytest tests/test_rbac.py -v
```
Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add tests/test_rbac.py
git commit -m "test: add RBAC enforcement tests"
```

---

### Task 22: Create audit log tests

**Files:**
- Create: `tests/test_audit.py`

- [ ] **Step 1: Create `tests/test_audit.py`**

```python
"""Tests for audit logging."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.repositories.audit_repository import AuditRepository
from datetime import datetime, timezone


@pytest.fixture
def api():
    with TestClient(app) as client:
        yield client


def test_audit_endpoint_requires_auth(api):
    resp = api.get("/audit/logs")
    assert resp.status_code == 401


def test_admin_can_view_audit_logs(api, auth_headers):
    repo = AuditRepository()
    repo.set_counter(500)
    repo.insert({
        "user_id": 1, "user_email": "admin@ems.com",
        "user_role": "admin",
        "action": "TEST_ACTION", "resource_type": "test",
        "outcome": "success",
        "timestamp": datetime.now(timezone.utc),
    })
    resp = api.get("/audit/logs", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_employee_can_view_own_logs(api, employee_headers):
    resp = api.get("/audit/logs", headers=employee_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
```

- [ ] **Step 2: Run tests**

```bash
pytest tests/test_audit.py -v
```
Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add tests/test_audit.py
git commit -m "test: add audit log tests"
```

---

### Task 23: Update existing tests with auth headers

**Files:**
- Modify: `tests/test_employees.py`
- Modify: `tests/test_departments.py`

- [ ] **Step 1: Update employee tests**

Add `auth_headers` fixture to the `api` fixture or each test. Since the `api` fixture creates a fresh TestClient, each test needs the header explicitly:

```python
# In each test function that makes API calls, add:
# auth_headers as a parameter and pass it as headers= to each request.

def test_list_employees_returns_seed_data(api, auth_headers):
    response = api.get("/employees", headers=auth_headers)
    assert response.status_code == 200
    # ...
```

- [ ] **Step 2: Update department tests**

Same pattern — add `auth_headers` to each test.

- [ ] **Step 3: Run all existing tests**

```bash
pytest tests/test_employees.py tests/test_departments.py tests/test_health.py tests/test_settings.py tests/test_app_factory.py -v
```
Expected: All pass with auth headers.

- [ ] **Step 4: Commit**

```bash
git add tests/test_employees.py tests/test_departments.py
git commit -m "test: add auth headers to existing tests"
```

---

### Task 24: Final integration verification

- [ ] **Step 1: Run full test suite**

```bash
cd backend && pytest tests/ -v --tb=short
```
Expected: All tests pass.

- [ ] **Step 2: Manual smoke test**

```bash
cd backend && uvicorn app.main:app --reload &
sleep 2
# Login as admin
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ems.com","password":"Admin@1234"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
# Access protected endpoint
curl -s http://localhost:8000/employees/ -H "Authorization: Bearer $TOKEN"
# Expected: employee list JSON
```

- [ ] **Step 3: Move plan to docs**

```bash
mv .opencode/plans/2026-05-14-security-implementation.md docs/superpowers/plans/2026-05-14-security-implementation.md
```

- [ ] **Step 4: Commit plan**

```bash
git add docs/superpowers/plans/2026-05-14-security-implementation.md
git commit -m "docs: add security implementation plan"
```
