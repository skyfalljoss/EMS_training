# MVC Architecture Convention

Always structure backend projects using a layered MVC architecture:

## Directory Layout

```
├── app/
│   ├── main.py                    # App factory, lifespan events
│   ├── api/routes/                # View layer — HTTP handling only
│   │   ├── health.py
│   │   └── employees.py
│   ├── controllers/               # Business logic layer (alt name: services/)
│   │   └── employee_controller.py
│   ├── services/                  # Business logic layer (preferred name)
│   │   └── employee_service.py
│   ├── repositories/              # Data access layer — DB queries only
│   │   └── employee_repository.py
│   ├── models/                    # Domain entities
│   │   └── employee.py
│   ├── schemas/                   # Pydantic request/response schemas
│   │   └── employee.py
│   ├── db/                        # Connection management
│   │   └── mongodb.py
│   ├── core/                      # Config, settings
│   │   └── settings.py
│   └── data/                      # Seed data, fixtures
│       └── sample_employees.py
└── tests/
    └── test_*.py
```

## Layer Responsibilities

| Layer | Directory | Role |
|-------|-----------|------|
| **View** | `api/routes/` | Parse request, call service, return response. Max ~5 lines per endpoint. |
| **Controller/Service** | `services/` | Business logic, validation, orchestration, error handling. |
| **Repository** | `repositories/` | Data access queries only — no business logic. |
| **Model** | `models/` or `schemas/` | Data definitions, Pydantic schemas. |

## Dependency Flow

```
Routes → Services → Repositories → Database
```

Each layer only talks to the one directly below it. Never skip layers (e.g., routes must not call repositories directly).

## Conventions

- **Routes are thin** — they only parse input and delegate to services
- **Services own business logic** — duplicate checks, filtering rules, error handling
- **Repositories own data queries** — one method per query pattern
- **No global state** — use dependency injection or class instances
- **Async first** — all DB operations use async/await
- **One class per file** — files are named after their primary class/entity
- **`__init__.py`** — include in all Python package directories

## Example Flow

```
POST /employees
  → routes/employees.py: create_employee(payload)
    → services/employee_service.py: create(payload)
      → repositories/employee_repository.py: find_by_email(), next_id(), insert()
```

## Testing

- Unit tests for services (mock repositories)
- Integration tests for routes (use TestClient)
- Tests go in `tests/` mirroring the `app/` structure
