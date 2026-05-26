from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import DomainError


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error_handler(_request, exc: DomainError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": str(exc)},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_request, exc: RequestValidationError):
        errors = exc.errors()
        first_error = errors[0] if errors else {}
        msg = first_error.get("msg", "Validation error")
        if msg.startswith("Value error, "):
            msg = msg.removeprefix("Value error, ")
        return JSONResponse(
            status_code=422,
            content={"detail": msg},
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(_request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
