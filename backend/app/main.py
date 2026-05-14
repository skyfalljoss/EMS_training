"""FastAPI application factory and lifecycle."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes.departments import router as departments_router
from app.api.routes.employees import router as employees_router
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.core.permissions import AuthRole
from app.core.settings import settings
from app.data.sample_departments import SAMPLE_DEPARTMENTS
from app.data.sample_employees import SAMPLE_EMPLOYEES
from app.db.mongodb import close_db, connect_db
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository


async def _seed_data_if_empty() -> None:
    """Insert sample departments and employees once if collections are empty."""
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle for the FastAPI app."""
    await connect_db()
    await _seed_data_if_empty()
    yield
    await close_db()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)
    app.state.settings = settings

    app.include_router(departments_router)
    app.include_router(health_router)
    app.include_router(employees_router)
    app.include_router(auth_router)

    @app.get("/", tags=["root"])
    async def root():
        return {"message": f"Welcome to the {settings.APP_NAME} API"}

    return app


app = create_app()
