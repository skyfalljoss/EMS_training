# Department CRUD Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full Department CRUD resource with referential integrity from Employees.

**Architecture:** New layer follows existing Employee MVC pattern: model → repository → controller → routes. Employee model replaces `department: str` with `department_id: int`, with validation against Department collection.

**Tech Stack:** FastAPI, Motor (async MongoDB), Pydantic v2, pytest, pytest-asyncio

---

### Task 1: Add `__init__.py` files to all packages

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/routes/__init__.py`
- Create: `backend/app/controllers/__init__.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/data/__init__.py`
- Create: `backend/app/db/__init__.py`
- Create: `backend/app/dependencies/__init__.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/repositories/__init__.py`

- [ ] **Step 1: Create all 10 files**

Each file is empty. This enables explicit package imports per AGENTS.md convention.

```bash
touch backend/app/__init__.py backend/app/api/__init__.py backend/app/api/routes/__init__.py backend/app/controllers/__init__.py backend/app/core/__init__.py backend/app/data/__init__.py backend/app/db/__init__.py backend/app/dependencies/__init__.py backend/app/models/__init__.py backend/app/repositories/__init__.py
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/*/__init__.py backend/app/api/*/__init__.py
git commit -m "chore: add __init__.py files to all packages"
```

---

### Task 2: Create Department model

**Files:**
- Create: `backend/app/models/department.py`

- [ ] **Step 1: Write Department Pydantic schemas**

```python
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(
        ...,
        min_length=2,
        max_length=10,
        pattern=r"^[A-Z][A-Z0-9_]*$",
    )
    description: Optional[str] = Field(None, max_length=500)
    head: Optional[str] = Field(None, max_length=100)
    status: str = Field("active", pattern=r"^(active|inactive|archived)$")


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=10, pattern=r"^[A-Z][A-Z0-9_]*$")
    description: Optional[str] = Field(None, max_length=500)
    head: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, pattern=r"^(active|inactive|archived)$")


class DepartmentResponse(DepartmentBase):
    model_config = {"from_attributes": True}
    id: int = Field(...)
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
```

Write to `backend/app/models/department.py`.

---

### Task 3: Create Department repository

**Files:**
- Create: `backend/app/repositories/department_repository.py`

- [ ] **Step 1: Write DepartmentRepository**

```python
from typing import Any
from app.db.mongodb import get_database

COLLECTION = "departments"
COUNTERS = "counters"


class DepartmentRepository:
    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            self._db = get_database()
        return self._db

    async def find_by_code(self, code: str) -> dict | None:
        return await self.db[COLLECTION].find_one({"code": code})

    async def find_by_id(self, dept_id: int) -> dict | None:
        return await self.db[COLLECTION].find_one({"id": dept_id})

    async def find_all(
        self,
        query: dict | None = None,
        skip: int = 0,
        limit: int = 20,
        sort: list | None = None,
    ) -> list[dict]:
        cursor = self.db[COLLECTION].find(query or {}).sort(sort or [("name", 1)]).skip(skip).limit(limit)
        return [doc async for doc in cursor]

    async def count_documents(self, query: dict | None = None) -> int:
        return await self.db[COLLECTION].count_documents(query or {})

    async def insert(self, department: dict) -> None:
        await self.db[COLLECTION].insert_one(department)

    async def insert_many(self, departments: list[dict]) -> None:
        await self.db[COLLECTION].insert_many(departments)

    async def update(self, dept_id: int, updates: dict) -> None:
        await self.db[COLLECTION].update_one({"id": dept_id}, {"$set": updates})

    async def delete(self, dept_id: int) -> Any:
        return await self.db[COLLECTION].delete_one({"id": dept_id})

    async def count_employees(self, dept_id: int) -> int:
        return await self.db["employees"].count_documents({"department_id": dept_id})

    async def next_id(self) -> int:
        result = await self.db[COUNTERS].find_one_and_update(
            {"_id": "department_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result["seq"]

    async def set_counter(self, value: int) -> None:
        await self.db[COUNTERS].update_one(
            {"_id": "department_id"},
            {"$set": {"seq": value}},
            upsert=True,
        )

    async def count(self) -> int:
        return await self.db[COLLECTION].count_documents({})
```

---

### Task 4: Create Department controller

**Files:**
- Create: `backend/app/controllers/department_controller.py`

- [ ] **Step 1: Write DepartmentController**

```python
import logging
from typing import Optional
from fastapi import HTTPException, status
from app.models.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate, utcnow
from app.repositories.department_repository import DepartmentRepository

logger = logging.getLogger(__name__)


def _normalize(data: dict) -> dict:
    result = {}
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip()
            if key == "code":
                value = value.upper()
        if key == "name" and value is not None and value == "":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name must not be empty after trimming")
        result[key] = value
    return result


class DepartmentController:
    def __init__(self, repo: Optional[DepartmentRepository] = None) -> None:
        self.repo = repo or DepartmentRepository()

    async def create(self, payload: DepartmentCreate) -> DepartmentResponse:
        data = _normalize(payload.model_dump())
        if await self.repo.find_by_code(data["code"]):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Department code '{data['code']}' already exists",
            )
        now = utcnow()
        data["id"] = await self.repo.next_id()
        data["createdAt"] = now
        data["updatedAt"] = now
        await self.repo.insert(data)
        logger.info("Department created: id=%d code=%s name=%s", data["id"], data["code"], data["name"])
        return DepartmentResponse(**data)

    async def list(
        self,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "name",
        sort_order: str = "asc",
    ) -> list[DepartmentResponse]:
        query = {}
        if status_filter:
            query["status"] = status_filter
        sort_dir = 1 if sort_order == "asc" else -1
        sort = [(sort_by, sort_dir)]
        docs = await self.repo.find_all(query, skip, limit, sort)
        return [DepartmentResponse(**d) for d in docs]

    async def get(self, dept_id: int) -> DepartmentResponse:
        doc = await self.repo.find_by_id(dept_id)
        if not doc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Department with id {dept_id} not found")
        return DepartmentResponse(**doc)

    async def update(self, dept_id: int, payload: DepartmentUpdate) -> DepartmentResponse:
        existing = await self.repo.find_by_id(dept_id)
        if not existing:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Department with id {dept_id} not found")
        updates = _normalize(payload.model_dump(exclude_unset=True))
        if not updates:
            return DepartmentResponse(**existing)
        if "code" in updates:
            clash = await self.repo.find_by_code(updates["code"])
            if clash and clash["id"] != dept_id:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail=f"Department code '{updates['code']}' already exists",
                )
        updates["updatedAt"] = utcnow()
        await self.repo.update(dept_id, updates)
        updated = await self.repo.find_by_id(dept_id)
        logger.info("Department updated: id=%d fields=%s", dept_id, list(updates.keys()))
        return DepartmentResponse(**updated)

    async def delete(self, dept_id: int) -> dict:
        doc = await self.repo.find_by_id(dept_id)
        if not doc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Department with id {dept_id} not found")
        emp_count = await self.repo.count_employees(dept_id)
        if emp_count > 0:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=f"Cannot delete department: {emp_count} employee(s) still assigned. Reassign them first.",
            )
        await self.repo.delete(dept_id)
        logger.info("Department deleted: id=%d code=%s name=%s", dept_id, doc["code"], doc["name"])
        return {"message": f"Department {dept_id} deleted successfully"}
```

---

### Task 5: Create Department routes

**Files:**
- Create: `backend/app/api/routes/departments.py`

- [ ] **Step 1: Write department routes**

```python
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.controllers.department_controller import DepartmentController
from app.dependencies.controllers import get_department_controller
from app.models.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate

router = APIRouter(prefix="/departments", tags=["departments"])


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED, summary="Create a new department")
async def create_department(
    payload: DepartmentCreate,
    controller: DepartmentController = Depends(get_department_controller),
):
    return await controller.create(payload)


@router.get("", response_model=list[DepartmentResponse], summary="List departments with optional filters")
async def list_departments(
    status: Optional[str] = Query(None, pattern=r"^(active|inactive|archived)$"),
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc", pattern=r"^(asc|desc)$"),
    controller: DepartmentController = Depends(get_department_controller),
):
    return await controller.list(status, skip, limit, sort_by, sort_order)


@router.get("/{department_id}", response_model=DepartmentResponse, summary="Get a single department by id")
async def get_department(
    department_id: int,
    controller: DepartmentController = Depends(get_department_controller),
):
    return await controller.get(department_id)


@router.put("/{department_id}", response_model=DepartmentResponse, summary="Update an existing department")
async def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    controller: DepartmentController = Depends(get_department_controller),
):
    return await controller.update(department_id, payload)


@router.delete("/{department_id}", summary="Delete a department")
async def delete_department(
    department_id: int,
    controller: DepartmentController = Depends(get_department_controller),
):
    return await controller.delete(department_id)
```

---

### Task 6: Create Department seed data

**Files:**
- Create: `backend/app/data/sample_departments.py`

- [ ] **Step 1: Write sample departments**

```python
from datetime import datetime, timezone

_NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)

SAMPLE_DEPARTMENTS = [
    {
        "id": 1,
        "name": "Information Technology",
        "code": "IT",
        "description": "Technology and software development",
        "head": "Jane Smith",
        "status": "active",
        "createdAt": _NOW,
        "updatedAt": _NOW,
    },
    {
        "id": 2,
        "name": "Human Resources",
        "code": "HR",
        "description": "People operations and hiring",
        "head": "Alex Chen",
        "status": "active",
        "createdAt": _NOW,
        "updatedAt": _NOW,
    },
    {
        "id": 3,
        "name": "Finance",
        "code": "FIN",
        "description": "Financial planning and accounting",
        "head": "Sarah Lee",
        "status": "active",
        "createdAt": _NOW,
        "updatedAt": _NOW,
    },
    {
        "id": 4,
        "name": "Marketing",
        "code": "MKT",
        "description": "Brand and customer engagement",
        "head": "Jane Smith",
        "status": "active",
        "createdAt": _NOW,
        "updatedAt": _NOW,
    },
]
```

---

### Task 7: Update Employee model

**Files:**
- Modify: `backend/app/models/employee.py`

- [ ] **Step 1: Replace `department: str` with `department_id: int`**

In `EmployeeBase`: remove `department: str = Field(...)`, add `department_id: int = Field(..., ge=1)`

In `EmployeeUpdate`: remove `department: Optional[str] = Field(None, min_length=1)`, add `department_id: Optional[int] = Field(None, ge=1)`

In `EmployeeResponse`: inherits `department_id` from base.

Edit changes:
1. Remove line: `    department: str = Field(..., min_length=1, description="Department, e.g. IT")`
2. Add after `role` line: `    department_id: int = Field(..., ge=1, description="Reference to Department.id")`
3. In `EmployeeUpdate`: replace `    department: Optional[str] = Field(None, min_length=1)` with `    department_id: Optional[int] = Field(None, ge=1)`

---

### Task 8: Update Employee controller

**Files:**
- Modify: `backend/app/controllers/employee_controller.py`

- [ ] **Step 1: Import and inject DepartmentRepository, add validation**

Add import: `from app.repositories.department_repository import DepartmentRepository`

Change `__init__` to accept `dept_repo`:
```python
def __init__(self, repo: Optional[EmployeeRepository] = None, dept_repo: Optional[DepartmentRepository] = None) -> None:
    self.repo = repo or EmployeeRepository()
    self.dept_repo = dept_repo or DepartmentRepository()
```

In `create()`: after email uniqueness check, add:
```python
dept = await self.dept_repo.find_by_id(payload.department_id)
if not dept:
    raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Department with id {payload.department_id} not found")
if dept.get("status") != "active":
    raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Department '{dept['name']}' is not active")
```

In `update()`: after `exclude_unset=True` check, add:
```python
if "department_id" in updates:
    dept = await self.dept_repo.find_by_id(updates["department_id"])
    if not dept:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Department with id {updates['department_id']} not found")
    if dept.get("status") != "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Department '{dept['name']}' is not active")
```

Change `list()` signature: `department: Optional[str]` → `department_id: Optional[int] = None`
Change query filter: `if department_id: query["department_id"] = department_id`

Update `_to_response()`: change `department=doc["department"]` to `department_id=doc["department_id"]`

---

### Task 9: Update Employee routes

**Files:**
- Modify: `backend/app/api/routes/employees.py`

- [ ] **Step 1: Change `department` param to `department_id`**

Replace query param in `list_employees`:
```python
department_id: Optional[int] = Query(None, description="Filter by department id"),
```

Change the controller call:
```python
return await controller.list(department_id, role, name)
```

---

### Task 10: Update Employee seed data

**Files:**
- Modify: `backend/app/data/sample_employees.py`

- [ ] **Step 1: Replace `"department": "IT"` with `"department_id": 1` etc.**

Replace all `"department": "X"` with `"department_id": N`:
- John Doe: `department_id: 1` (IT)
- Sarah Lee: `department_id: 2` (HR)
- Mike Ross: `department_id: 3` (FIN)
- Emily Chen: `department_id: 4` (MKT)
- David Kim: `department_id: 1` (IT)

---

### Task 11: Update dependencies

**Files:**
- Modify: `backend/app/dependencies/controllers.py`

- [ ] **Step 1: Add department controller provider**

```python
from app.controllers.department_controller import DepartmentController


def get_department_controller() -> DepartmentController:
    return DepartmentController()
```

---

### Task 12: Update app factory

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Import and register department router, update seeding**

Add imports:
```python
from app.api.routes.departments import router as departments_router
from app.data.sample_departments import SAMPLE_DEPARTMENTS
from app.repositories.department_repository import DepartmentRepository
```

Replace `_seed_employees_if_empty` with `_seed_data_if_empty`:
```python
async def _seed_data_if_empty() -> None:
    dept_repo = DepartmentRepository()
    if await dept_repo.count() == 0:
        await dept_repo.insert_many(list(SAMPLE_DEPARTMENTS))
        max_dept_id = max(d["id"] for d in SAMPLE_DEPARTMENTS)
        await dept_repo.set_counter(max_dept_id)

    emp_repo = EmployeeRepository()
    if await emp_repo.count() == 0:
        await emp_repo.insert_many([dict(e) for e in SAMPLE_EMPLOYEES])
        max_emp_id = max(e["id"] for e in SAMPLE_EMPLOYEES)
        await emp_repo.set_counter(max_emp_id)
```

Update lifespan: `await _seed_data_if_empty()` instead of `await _seed_employees_if_empty()`

Add router: `app.include_router(departments_router)`

---

### Task 13: Write Department integration tests

**Files:**
- Create: `backend/tests/test_departments.py`

- [ ] **Step 1: Write test file**

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture()
def api():
    with TestClient(app) as client:
        yield client


def _dept_payload(code_suffix: str = "DEV") -> dict:
    return {
        "name": "Development",
        "code": f"DEV{code_suffix}",
        "description": "Software development team",
        "head": "Alice",
        "status": "active",
    }


def test_list_departments_returns_seed_data(api: TestClient):
    response = api.get("/departments")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 4
    assert {"id", "name", "code", "status"} <= set(body[0].keys())


def test_get_department_by_id(api: TestClient):
    response = api.get("/departments/1")
    assert response.status_code == 200
    assert response.json()["id"] == 1


def test_get_department_not_found(api: TestClient):
    response = api.get("/departments/9999")
    assert response.status_code == 404


def test_create_department_success(api: TestClient):
    payload = _dept_payload("CR1")
    response = api.post("/departments", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Development"
    assert body["code"] == "DEVCR1"
    assert body["id"] > 0


def test_create_department_duplicate_code(api: TestClient):
    payload = _dept_payload("DUP")
    api.post("/departments", json=payload)
    response = api.post("/departments", json=payload)
    assert response.status_code == 400


def test_create_department_invalid_code_format(api: TestClient):
    payload = _dept_payload("")
    payload["code"] = "invalid code!"
    response = api.post("/departments", json=payload)
    assert response.status_code == 422


def test_create_department_empty_name(api: TestClient):
    payload = _dept_payload("EMP")
    payload["name"] = ""
    response = api.post("/departments", json=payload)
    assert response.status_code == 422


def test_update_department(api: TestClient):
    created = api.post("/departments", json=_dept_payload("UPD")).json()
    new_id = created["id"]
    response = api.put(f"/departments/{new_id}", json={"head": "Bob"})
    assert response.status_code == 200
    assert response.json()["head"] == "Bob"
    assert response.json()["name"] == "Development"


def test_update_department_not_found(api: TestClient):
    response = api.put("/departments/9999", json={"head": "X"})
    assert response.status_code == 404


def test_delete_department(api: TestClient):
    created = api.post("/departments", json=_dept_payload("DEL")).json()
    new_id = created["id"]
    response = api.delete(f"/departments/{new_id}")
    assert response.status_code == 200
    assert api.get(f"/departments/{new_id}").status_code == 404


def test_delete_department_not_found(api: TestClient):
    response = api.delete("/departments/9999")
    assert response.status_code == 404


def test_delete_department_with_employees_conflict(api: TestClient):
    response = api.delete("/departments/1")
    assert response.status_code == 409
    assert "employee" in response.json()["detail"].lower()


def test_filter_departments_by_status(api: TestClient):
    response = api.get("/departments", params={"status": "active"})
    assert response.status_code == 200
    assert all(d["status"] == "active" for d in response.json())
```

---

### Task 14: Update Employee tests

**Files:**
- Modify: `backend/tests/test_employees.py`

- [ ] **Step 1: Update all `department` references to `department_id`**

Update all test payloads:
- Replace `"department": "IT"` with `"department_id": 1`
- Replace `"department": "D"` with `"department_id": 1`

- [ ] **Step 2: Add test for invalid department_id on create**

Add these new tests:
```python
def test_create_employee_invalid_department_id(api: TestClient):
    payload = {
        "name": "Bad Dept",
        "email": _unique_email("baddept"),
        "role": "Engineer",
        "department_id": 9999,
    }
    response = api.post("/employees", json=payload)
    assert response.status_code == 400


def test_filter_by_department_id(api: TestClient):
    response = api.get("/employees", params={"department_id": 1})
    assert response.status_code == 200
    assert all(e["department_id"] == 1 for e in response.json())
```

- [ ] **Step 3: Remove `test_filter_by_department` (now replaced by department_id filter)**

---

### Task 15: Run all tests and verify

- [ ] **Step 1: Run full test suite**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 2: Commit final state**

```bash
git add -A
git commit -m "feat: add Department CRUD resource with employee referential integrity"
```
