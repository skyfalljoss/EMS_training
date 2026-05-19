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
