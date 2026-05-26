"""Audit middleware — logs all mutating requests to audit_logs collection."""

from typing import Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.auth.utils import decode_access_token
from app.repositories.audit_repository import AuditRepository

SKIP_PATHS = {"/", "/health"}
SKIP_PREFIXES = {"/docs", "/redoc", "/openapi.json"}


class AuditMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        audit_repo: Optional[AuditRepository] = None,
    ):
        super().__init__(app)
        self._audit_repo = audit_repo

    async def dispatch(self, request: Request, call_next):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return await call_next(request)

        path = request.url.path
        if path in SKIP_PATHS or any(path.startswith(p) for p in SKIP_PREFIXES):
            return await call_next(request)

        response = await call_next(request)
        try:
            await self._log(request, response.status_code)
        except Exception:
            pass
        return response

    async def _log(self, request: Request, status_code: int):
        user_id = None
        user_email = None
        user_role = None

        audit_state = getattr(request.state, "audit", None)
        if audit_state:
            user_id = audit_state.get("user_id")
            user_email = audit_state.get("user_email")
            user_role = audit_state.get("user_role")
        else:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                payload = decode_access_token(auth_header.removeprefix("Bearer "))
                if payload:
                    user_id = payload.get("sub")
                    user_email = payload.get("email")
                    user_role = payload.get("role")

        path = request.url.path
        method = request.method
        resource_type, resource_id = self._parse_resource(path)
        action = self._action(method, path)
        outcome = "success" if status_code < 400 else "failure"

        entry = {
            "user_id": user_id,
            "user_email": user_email,
            "user_role": user_role,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "outcome": outcome,
            "detail": f"{method} {path} -> {status_code}",
            "ip_address": request.client.host if request.client else None,
            "method": method,
            "path": path,
        }
        repo = self._audit_repo or AuditRepository()
        await repo.insert(entry)

    @staticmethod
    def _parse_resource(path: str) -> tuple[str, str | None]:
        parts = path.strip("/").split("/")
        if not parts or not parts[0]:
            return "unknown", None
        resource = parts[0].rstrip("s")
        resource_id = None
        if len(parts) > 1 and parts[1].isdigit():
            resource_id = parts[1]
        return resource, resource_id

    @staticmethod
    def _action(method: str, path: str) -> str:
        if path == "/auth/login":
            return "LOGIN"
        if path == "/auth/register":
            return "REGISTER"
        if path == "/auth/password":
            return "CHANGE_PASSWORD"
        mapping = {"POST": "CREATE", "PUT": "UPDATE", "PATCH": "UPDATE", "DELETE": "DELETE"}
        return mapping.get(method, method)
