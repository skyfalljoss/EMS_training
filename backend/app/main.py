"""FastAPI application factory and lifecycle."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.departments import router as departments_router
from app.api.routes.employees import router as employees_router
from app.api.routes.health import router as health_router
from app.api.routes.audit import router as audit_router
from app.api.exception_handlers import register_exception_handlers
from app.api.routes.auth import router as auth_router, admin_router as auth_admin_router
from app.core.settings import settings
from app.middleware.audit import AuditMiddleware
from app.middleware.ratelimit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.data.seed import seed_if_empty
from app.db.mongo_db import close_db, connect_db, ensure_indexes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle for the FastAPI app."""
    await connect_db()
    await ensure_indexes()
    await seed_if_empty()
    yield
    await close_db()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AuditMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.state.settings = settings

    app.include_router(departments_router)
    app.include_router(health_router)
    app.include_router(employees_router)
    app.include_router(auth_router)
    app.include_router(auth_admin_router)
    app.include_router(audit_router)

    register_exception_handlers(app)

    @app.get("/", tags=["root"])
    async def root():
        return {"message": f"Welcome to the {settings.APP_NAME} API"}

    return app


app = create_app()
