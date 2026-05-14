from fastapi import APIRouter, Depends, HTTPException, status

from app.controllers.auth_controller import AuthController
from app.dependencies.auth import (
    get_auth_controller, get_current_user, require_permissions,
)
from app.core.permissions import Permission
from app.models.auth_user import (
    LoginRequest, TokenResponse, RegisterRequest,
    AuthUserCreate, PasswordChangeRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    controller: AuthController = Depends(get_auth_controller),
):
    result = await controller.login(body.email, body.password)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return result


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    controller: AuthController = Depends(get_auth_controller),
):
    user_id = await controller.register(body.employee_id, body.email, body.password)
    return {"id": user_id, "message": "Registration submitted. Awaiting admin approval."}


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_auth_user(
    body: AuthUserCreate,
    controller: AuthController = Depends(get_auth_controller),
    _: dict = Depends(require_permissions(Permission.AUTH_USER_CREATE)),
):
    user_id = await controller.create_auth_user(
        body.employee_id, body.email, body.password, body.auth_role
    )
    return {"id": user_id}


@router.get("/users")
async def list_auth_users(
    controller: AuthController = Depends(get_auth_controller),
    _: dict = Depends(require_permissions(Permission.AUTH_USER_CREATE)),
):
    return await controller.list_users()


@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    controller: AuthController = Depends(get_auth_controller),
    _: dict = Depends(require_permissions(Permission.AUTH_USER_CREATE)),
):
    await controller.activate_user(user_id)
    return {"message": "User activated"}


@router.put("/password")
async def change_password(
    body: PasswordChangeRequest,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(get_current_user),
):
    success = await controller.change_password(
        current_user["id"], body.old_password, body.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    return {"message": "Password changed successfully"}
