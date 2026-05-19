from fastapi import Depends
from fastapi.security import HTTPBearer
from typing import Callable

from app.auth.utils import decode_access_token
from app.controllers.auth_controller import AuthController
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.permissions import AuthRole, Permission, ROLE_PERMISSIONS
from app.dependencies.auth_provider import get_auth_controller

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    token: str = Depends(security_scheme),
    controller: AuthController = Depends(get_auth_controller),
) -> dict:
    if token is None:
        raise UnauthorizedError("Authentication required")
    payload = decode_access_token(token.credentials)
    if payload is None:
        raise UnauthorizedError("Invalid or expired token")
    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthorizedError("Invalid token payload")
    user = await controller.get_user(int(user_id))
    if user is None:
        raise UnauthorizedError("User not found")
    if not user.get("is_active", False):
        raise UnauthorizedError("Account is inactive")
    raw_role = user.get("auth_role")
    try:
        AuthRole(raw_role)
    except ValueError:
        raise UnauthorizedError("User has an invalid role assignment")
    return user


async def require_password_not_expired(
    current_user: dict = Depends(get_current_user),
) -> dict:
    if current_user.get("must_change_password", False):
        raise ForbiddenError("Password change required. Use PUT /auth/password")
    return current_user


def require_permissions(*permissions: Permission) -> Callable:
    async def dependency(
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        if current_user.get("auth_role") == AuthRole.ADMIN.value:
            return current_user
        user_perms = ROLE_PERMISSIONS.get(AuthRole(current_user.get("auth_role")), [])
        for perm in permissions:
            if perm.value not in user_perms:
                raise ForbiddenError(f"Insufficient permissions: {perm.value} required")
        return current_user
    return dependency
