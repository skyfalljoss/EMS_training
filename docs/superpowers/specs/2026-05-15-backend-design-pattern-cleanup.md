# Backend Design-Pattern Cleanup

**Date:** 2026-05-15
**Status:** Draft

## Summary

Restore strict `Routes → Controllers → Repositories → DB` layering, make Dependency Injection real, centralize HTTP-error translation, and remove cross-aggregate leaks — with zero client-visible behavior changes (same status codes, same `{"detail": "..."}` shape).

---

## Architecture Rules (Target State)

```
Routes → Controllers → Repositories → Database
Routes → Auth Dependencies (guards via Depends)
```

- Routes NEVER call repositories directly
- Controllers NEVER instantiate repositories — all DI via `Depends`
- Controllers may depend on other controllers OR their own repos only
- A controller may NEVER reach into another aggregate's repository
- All `id` fields use `"id"` (not `"_id"`), auto-incrementing via `counters` collection

---

## New Files

| File | Purpose |
|------|---------|
| `app/core/exceptions.py` | `DomainError` base with `status_code` + `NotFoundError`, `ConflictError`, `ForbiddenError`, `ValidationError`, `InvalidCredentialsError` |
| `app/core/security.py` | `hash_password`, `verify_password`, `create_access_token`, `decode_access_token` (moved from `auth/utils.py`) |
| `app/api/exception_handlers.py` | `register_exception_handlers(app)` mapping `DomainError` → standard `JSONResponse` |
| `app/dependencies/repositories.py` | `get_employee_repository`, `get_department_repository`, `get_auth_repository`, `get_audit_repository` |
| `app/dependencies/auth_provider.py` | `get_auth_controller` (moved from `dependencies/auth.py`) |
| `app/data/seed.py` | `seed_if_empty()` extracted from `main.py` lifespan |

## Deleted Files

| File | Reason |
|------|--------|
| `app/auth/utils.py` | Implementation moved to `core/security.py`; shim deleted after import migration |

## Modified Files

| File | Changes |
|------|---------|
| `app/main.py` | Lifespan calls `seed_if_empty()`; register exception handlers |
| `app/controllers/auth_controller.py` | DI for AuthRepository + EmployeeController; raise domain exceptions; remove inline repo instantiation |
| `app/controllers/employee_controller.py` | DI for repos; raise domain exceptions; `_to_response` → `EmployeeResponse(**doc)` |
| `app/controllers/department_controller.py` | DI for repos; `current_user` param + defense-in-depth; raise domain exceptions |
| `app/controllers/audit_controller.py` | DI for repos; remove `log_async`; replace per-id loop with bulk queries |
| `app/dependencies/auth.py` | Remove `get_auth_controller` (moved to auth_provider.py); keep guards |
| `app/dependencies/employees.py` | Wire repos via `Depends` |
| `app/dependencies/departments.py` | Wire repos via `Depends` |
| `app/dependencies/audit.py` | Wire repos via `Depends` |
| `app/api/routes/auth.py` | Import `get_auth_controller` from new location; remove None→HTTPException translations |
| `app/api/routes/departments.py` | Pass `current_user` to controller methods |
| `app/repositories/employee_repository.py` | Add `find_ids_by_department`, `count_by_department` |
| `app/repositories/auth_repository.py` | Add `find_by_employee_ids` (single `$in` query) |
| `app/repositories/department_repository.py` | Delete `count_employees` (was reading `db["employees"]`) |
| `app/models/auth_user.py` | Add `AuthUserResponse.from_doc(doc)` classmethod |
| `tests/conftest.py` | Import from `app.core.security` |
| `tests/test_rbac_strict.py` | Import from `app.core.security` |

---

## Phase Breakdown

### Phase 0 — Create `core/security.py`

`core/security.py` becomes the canonical home for `hash_password`, `verify_password`, `create_access_token`, `decode_access_token`. `auth/utils.py` becomes a `from app.core.security import *` shim for backward compat during the transition. The shim is deleted in Phase 4.

**Rationale:** Security primitives are cross-cutting concerns (used by controllers, dependencies, tests). They belong in `core/` alongside `settings.py` and `permissions.py`, not inside `app/auth/`.

### Phase 1 — Real DI

- Drop `repo or XxxRepository()` defaults in every controller `__init__` — require repos as constructor args.
- `AuthController` additionally takes `employee_controller: EmployeeController` (for `register`'s placeholder employee creation).
- `AuditController` additionally takes `employee_repo: EmployeeRepository` and `auth_repo: AuthRepository`.
- New `dependencies/repositories.py` provides per-request repo instances.
- Dependency provider files wire repos via `Depends(get_xxx_repository)`.
- `get_auth_controller` moves to dedicated `auth_provider.py`.

### Phase 2 — Domain Exceptions + Central Handler

- `DomainError` base class carries a `status_code` class attribute.
- Subclasses: `NotFoundError(404)`, `ConflictError(409)`, `ForbiddenError(403)`, `ValidationError(400)`, `InvalidCredentialsError(401)`.
- Single handler catches `DomainError` → `JSONResponse({"detail": str(exc)}, status_code=exc.status_code)`.
- All 27 `raise HTTPException(...)` in controllers replaced with domain exceptions.
- Auth routes stop translating `None` → `HTTPException` — controller raises `InvalidCredentialsError` instead.

### Phase 3 — Remove Cross-Aggregate Leaks

- `auth_controller.register` calls injected `employee_controller.create_pending(name, email)` instead of importing `EmployeeRepository` inline.
- `EmployeeController.create_pending` creates placeholder employee with `department_id=1, role="New Hire"`, explicit validation bypass.
- `audit_controller.get_logs_for_user`: `EmployeeRepository.find_ids_by_department` + `AuthRepository.find_by_employee_ids(ids)` (single `$in` query) replaces per-id loop.
- `department_controller.delete` uses injected `employee_repo.count_by_department`.
- Delete `DepartmentRepository.count_employees`.

### Phase 4 — Consistency Cleanup

- `EmployeeController._to_response` → `EmployeeResponse(**doc)`.
- `_sanitize_user` → `AuthUserResponse.from_doc(doc)` classmethod.
- `DepartmentController.update/delete` accept `current_user` with defense-in-depth role checks.
- Remove `AuditController.log_async`.
- Delete `auth/utils.py` shim; update 4 import sites to `app.core.security`.
- Share `_role()` helper via `core/permissions.py`.

### Phase 5 — Seed via Controllers

- Extract `_seed_data_if_empty` into `app/data/seed.py` as `seed_if_empty()`.
- Builds repos+controllers explicitly (no DI needed for startup).
- Seeds via controller methods.
- Cleaner `main.py` lifespan.

---

## Error Response Contract

All responses preserve the existing contract:
```json
{"detail": "Human-readable error message"}
```

Status code mapping:
| Exception | Status | When |
|-----------|--------|------|
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Delete-with-employees, duplicate conflict |
| `ForbiddenError` | 403 | Insufficient role |
| `ValidationError` | 400 | Invalid input, inactive department |
| `InvalidCredentialsError` | 401 | Bad login, expired token |

---

## Verification

```bash
cd backend
pytest -v --tb=short             # all 110 tests pass
pytest tests/test_route_guards.py tests/test_rbac_strict.py tests/test_rbac.py -v
grep -r "HTTPException" app/controllers/           # → 0 hits
grep -r "from app.auth.utils" backend/              # → 0 hits
grep -rE "(Employee|Department|Auth|Audit)Repository\(\)" app/ \
  --exclude-dir=dependencies --exclude-dir=data --exclude-dir=__pycache__  # → 0 hits
make run + manual probes: bad-password → 401, duplicate-email → 400,
  delete dept with employees → 409, manager GET /audit/logs → dept-scoped
```
