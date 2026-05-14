# MVC Architecture Refactoring

## Goal

Restructure the EMS backend from logic-heavy route handlers into clean MVC layers:
**Routes → Services → Repositories**

## Current Structure (Problem)

- `app/api/routes/employees.py` (132 lines) — mixes HTTP handling, business logic, and raw MongoDB queries
- `app/db/mongodb.py` — global mutable state with messy formatting
- No separation of concerns — business logic cannot be tested independently of HTTP

## Target Structure

```
app/
├── main.py                          # App factory (unchanged)
├── api/routes/
│   ├── __init__.py
│   ├── health.py                    # Unchanged
│   └── employees.py                 # Thin: HTTP only, delegate to service
├── services/
│   ├── __init__.py
│   └── employee_service.py          # NEW: business logic, orchestration
├── repositories/
│   ├── __init__.py
│   └── employee_repository.py       # NEW: MongoDB queries only
├── schemas/
│   └── employee.py                  # Unchanged
├── core/
│   └── settings.py                  # Unchanged
├── db/
│   └── mongodb.py                   # Cleaned up formatting
└── data/
    └── sample_employees.py          # Fix trailing space in role
```

## Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| **Routes** | Parse request, call service, return response |
| **Services** | Business logic, duplicate checks, orchestration |
| **Repositories** | MongoDB CRUD queries only (no business logic) |
| **Schemas** | Pydantic models (unchanged) |
| **DB** | Connection lifecycle (cleaned up) |

## Dependency Flow

```
Routes → Services → Repositories → MongoDB
```

Each layer only talks to the one directly below it.

## Changes Summary

1. **`repositories/employee_repository.py`** — Extract all MongoDB queries:
   - `find_by_email()`, `find_by_id()`, `find_all()`, `insert()`, `update()`, `delete()`, `next_id()`, `count()`

2. **`services/employee_service.py`** — Extract business logic:
   - `create()`, `list()`, `get()`, `update()`, `delete()` — each calls repository, applies business rules

3. **`api/routes/employees.py`** — Thin to HTTP concerns only (5 lines per endpoint)

4. **`db/mongodb.py`** — Clean up formatting, remove dead comments

5. **`data/sample_employees.py`** — Fix `" "` → `""` in David Kim role

6. Add `__init__.py` files where missing

## Files Unchanged

- `main.py`
- `core/settings.py`
- `schemas/employee.py`
- `tests/` — no changes needed (tests use TestClient, behavior is identical)
- `api/routes/health.py`

## Test Strategy

Existing tests should pass without modification since the API contract is unchanged. All behavior is preserved — only internal structure changes.
