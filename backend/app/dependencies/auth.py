from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from typing import Callable

from app.controllers.auth_controller import AuthController
from app.auth.utils import decode_access_token
from app.core.permissions import AuthRole, Permission, ROLE_PERMISSIONS

security_scheme = HTTPBearer(auto_error=False)


def get_auth_controller() -> AuthController:
    return AuthController()


async def get_current_user(
    token: str = Depends(security_scheme),
    controller: AuthController = Depends(get_auth_controller),
) -> dict:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    payload = decode_access_token(token.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user = await controller.get_user(int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive",
        )
    # DB-authoritative role.  Reject unknown values rather than letting
    # them silently default to "no permissions" (which `require_permissions`
    # would otherwise treat as a regular non-admin denial).
    raw_role = user.get("auth_role")
    try:
        AuthRole(raw_role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User has an invalid role assignment",
        )
    return user


async def require_password_not_expired(
    current_user: dict = Depends(get_current_user),
) -> dict:
    if current_user.get("must_change_password", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required. Use PUT /auth/password",
        )
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
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions: {perm.value} required",
                )
        return current_user
    return dependency
