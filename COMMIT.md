# feat(backend): initialize EMS backend project structure

## Summary

Bootstrap the Employee Management System (EMS) backend with FastAPI, MongoDB (Motor), and a health-check endpoint.

## Changes

### Project Setup
- Add `pyproject.toml` with build system config (`setuptools`) targeting Python ≥ 3.11
- Add `requirements.txt` with runtime dependencies: `fastapi`, `motor`, `pydantic-settings`, `uvicorn`
- Add `Makefile` with `install`, `run`, and `tests` targets
- Add `pytest.ini` for test configuration

### Application
- `app/main.py` — create `FastAPI` application instance; wire startup/shutdown lifecycle hooks for MongoDB connection management
- `app/core/config.py` — define `Settings` via `pydantic-settings`; read `MONGO_URL` and `DB_NAME` from `.env`
- `app/db/mongodb.py` — implement async MongoDB client lifecycle (`connect_db`, `close_db`, `get_database`) using `motor`
- `app/api/routes/health.py` — add `GET /health` endpoint that pings MongoDB and returns service status

### Tests
- `tests/test_health.py` — add smoke test for `GET /health` using `TestClient`; assert HTTP 200 response

## Commit Types Reference

| Type       | Description                          |
|------------|--------------------------------------|
| `feat`     | New features                         |
| `fix`      | Bug fixes                            |
| `docs`     | Documentation changes                |
| `style`    | Formatting, no logic changes         |
| `refactor` | Code restructuring                   |
| `test`     | Testing improvements                 |
| `chore`    | Maintenance tasks                    |

## Type

`feat` — new feature (initial project scaffolding)

## Related

- Stack: Python 3.11, FastAPI, Motor (async MongoDB), Pydantic Settings, Uvicorn
- Database: MongoDB (`ems_db`)
