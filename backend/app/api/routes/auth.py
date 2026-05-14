from fastapi import APIRouter, Depends, status

from app.controllers.auth_controller import AuthController
from app.dependencies.auth import get_auth_controller
from app.models.user import UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreate,
    controller: AuthController = Depends(get_auth_controller),
) -> UserResponse:
    return await controller.register_user(payload)
