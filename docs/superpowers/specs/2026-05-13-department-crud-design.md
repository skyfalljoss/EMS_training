# Department CRUD Resource — Design Spec

## Overview

Add a full Department CRUD resource to the EMS backend, matching the existing Employee MVC pattern. Employees reference departments by ID with referential integrity validation.

## Architecture

### New files (6)

| File | Role |
|------|------|
| `app/models/department.py` | Pydantic schemas (DepartmentBase, Create, Update, Response) |
| `app/repositories/department_repository.py` | MongoDB data access (CRUD, count_employees, exists_by_code) |
| `app/controllers/department_controller.py` | Business logic, validation, normalization, logging |
| `app/api/routes/departments.py` | HTTP endpoints — thin, 3-5 lines each |
| `app/data/sample_departments.py` | Seed data (4 departments) |
| `tests/test_departments.py` | Integration tests |

### Modified files (7)

| File | Change |
|------|--------|
| `app/models/employee.py` | Replace `department: str` with `department_id: int` |
| `app/controllers/employee_controller.py` | Validate department_id exists and is active |
| `app/api/routes/employees.py` | department_id filter instead of department string |
| `app/data/sample_employees.py` | Use department_id references |
| `app/dependencies/controllers.py` | Add get_department_controller |
| `app/main.py` | Register department router, update seeding order |
| `tests/test_employees.py` | Update payloads to use department_id |

### New __init__.py files (10)

```
app/__init__.py, app/api/__init__.py, app/api/routes/__init__.py,
app/controllers/__init__.py, app/core/__init__.py, app/data/__init__.py,
app/db/__init__.py, app/dependencies/__init__.py, app/models/__init__.py,
app/repositories/__init__.py
```

## Department Schema

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | `int` | auto | Auto-increment via counters collection (`department_id`) |
| `name` | `str` | yes | 1-100 chars, trimmed |
| `code` | `str` | yes | 2-10 chars, uppercase + digits + underscore only, unique |
| `description` | `Optional[str]` | no | Max 500 chars |
| `head` | `Optional[str]` | no | Max 100 chars |
| `status` | `str` | no | One of: `active`, `inactive`, `archived` |
| `createdAt` | `datetime` | auto | UTC |
| `updatedAt` | `datetime` | auto | UTC |

### Validation Rules

- `code`: auto-uppercased + trimmed before storage. Regex: `^[A-Z][A-Z0-9_]*$`
- `name`: trimmed, reject if empty after trim
- All string fields: trimmed, `max_length` capped
- `code` uniqueness: case-sensitive (since stored uppercased)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/departments` | Create department |
| `GET` | `/departments` | List departments (paginated) |
| `GET` | `/departments/{id}` | Get by ID |
| `PUT` | `/departments/{id}` | Update department |
| `DELETE` | `/departments/{id}` | Delete department |

### Query Parameters (list)

| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| `status` | `str?` | None | Must be active/inactive/archived |
| `skip` | `int` | 0 | 0-10000 |
| `limit` | `int` | 20 | 1-100 |
| `sort_by` | `str` | `name` | One of: name, code, createdAt, updatedAt |
| `sort_order` | `str` | `asc` | asc or desc |

## Controller Behaviors

### create()
1. Normalize inputs (trim strings, uppercase code)
2. Check code uniqueness → 400 if exists
3. Auto-increment ID, set timestamps
4. Insert to MongoDB
5. Log: `"Department created: id=%d code=%s name=%s"`

### list()
1. Build query filter from optional `status`
2. Return paginated, sorted results

### get()
1. Find by ID → 404 if not found

### update()
1. Find by ID → 404 if not found
2. If `code` in updates: normalize + check uniqueness (exclude self)
3. If `status` in updates: validate allowed value (defense-in-depth)
4. Partial update via `exclude_unset=True`
5. Log: `"Department updated: id=%d fields=%s"`

### delete()
1. Find by ID → 404 if not found
2. Count employees referencing this department → 409 if > 0
3. Hard delete
4. Log: `"Department deleted: id=%d code=%s name=%s"`

## Employee Changes

### Model changes

- `EmployeeBase.department: str` → `EmployeeBase.department_id: int = Field(..., ge=1)`
- `EmployeeUpdate`: add `department_id: Optional[int] = Field(None, ge=1)`
- `EmployeeResponse`: inherits `department_id` from base

### Controller changes

- `EmployeeController.__init__` accepts optional `DepartmentRepository` parameter
- `create()`: validate `department_id` exists and status is `active` → 400 if not
- `update()`: validate `department_id` if present in updates
- `list()`: filter by `department_id` instead of `department` string
- `_to_response()`: map `department_id` instead of `department`

### Route changes

- `list_employees`: query param `department_id: Optional[int]` replaces `department: Optional[str]`

## Seeding

### Departments (seeded first)

| id | name | code |
|----|------|------|
| 1 | Information Technology | IT |
| 2 | Human Resources | HR |
| 3 | Finance | FIN |
| 4 | Marketing | MKT |

### Employees (seeded second)

Existing seed employees updated to reference department_id: John/IT(1), Sarah/HR(2), Mike/FIN(3), Emily/MKT(4), David/IT(1)

## Security & Robustness

| Concern | Mitigation |
|---------|-----------|
| NoSQL injection (code param) | Regex restricts to `[A-Z][A-Z0-9_]*` |
| NoSQL injection (name param) | `max_length=100` |
| Resource exhaustion (large queries) | Pagination: skip≤10000, limit≤100 |
| Orphaned employees | 409 Conflict if employees still reference department |
| Inactive department assignment | Validated — only active departments allowed |
| Duplicate codes | Case-sensitive uniqueness enforced |
| Data pollution | Input normalization (trim, uppercase) |
| Concurrent delete-then-assign | Find-before-delete check |
| No audit trail | `logging.info()` on all mutations |
| Invalid status values | Pydantic `pattern` + defense-in-depth in controller |

## Testing

### Department tests (`tests/test_departments.py`)
- POST create: success, duplicate code (400), invalid code format (422), empty name (422)
- GET list: empty, pagination, status filter, sorting
- GET by ID: success, 404
- PUT update: rename, reassign head, deactivate, duplicate code (400)
- DELETE: success (no employees), 409 (has employees), 404

### Employee tests updates (`tests/test_employees.py`)
- Create with valid department_id → 201
- Create with invalid department_id → 400
- Create with inactive department_id → 400
- Update with invalid department_id → 400
- Filter by department_id instead of department string
