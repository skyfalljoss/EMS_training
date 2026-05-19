from fastapi import APIRouter, Depends, status

from app.controllers.auth_controller import AuthController
from app.dependencies.auth import (
    get_current_user,
    require_password_not_expired, require_permissions,
)
from app.dependencies.auth_provider import get_auth_controller
from app.core.permissions import Permission
from app.models.auth_user import (
    AuthUserCreate, AuthUserResponse, AuthUserRoleUpdate, LoginRequest,
    PasswordChangeRequest, RegisterRequest, TokenResponse,
)

# Public router: login/register (no auth) plus self-service endpoints
# (`/me`, `/password`) that MUST stay reachable while the password is
# expired so the user can change it.  Do NOT add a router-level
# `require_password_not_expired` dep here.
router = APIRouter(prefix="/auth", tags=["auth"])

# Admin router: every endpoint requires a non-expired password.
admin_router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    dependencies=[Depends(require_password_not_expired)],
)


@router.get("/me", response_model=AuthUserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return AuthUserResponse.from_doc(current_user)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    controller: AuthController = Depends(get_auth_controller),
):
    return await controller.login(body.email, body.password)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    controller: AuthController = Depends(get_auth_controller),
):
    user_id = await controller.register(body.name, body.email, body.password)
    return {"id": user_id, "message": "Registration submitted. Awaiting admin approval."}


@admin_router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_auth_user(
    body: AuthUserCreate,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(require_permissions(Permission.AUTH_USER_CREATE)),
):
    user_id = await controller.create_auth_user(
        body.employee_id, body.email, body.password, body.auth_role
    )
    return {"id": user_id}


@admin_router.get("/users", response_model=list[AuthUserResponse])
async def list_auth_users(
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(require_permissions(Permission.AUTH_USER_CREATE)),
):
    return await controller.list_users()


@admin_router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(require_permissions(Permission.AUTH_USER_CREATE)),
):
    await controller.activate_user(user_id)
    return {"message": "User activated"}


@admin_router.delete("/users/{user_id}")
async def reject_user(
    user_id: int,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(require_permissions(Permission.AUTH_USER_CREATE)),
):
    await controller.reject_user(user_id)
    return {"message": "User rejected"}


@admin_router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    body: AuthUserRoleUpdate,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(require_permissions(Permission.AUTH_USER_UPDATE)),
):
    await controller.update_role(user_id, body.auth_role)
    return {"message": "User role updated"}


@router.put("/password", response_model=TokenResponse)
async def change_password(
    body: PasswordChangeRequest,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(get_current_user),
):
    return await controller.change_password(
        current_user["id"], body.old_password, body.new_password
    )
