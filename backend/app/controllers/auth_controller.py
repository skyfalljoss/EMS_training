"""Controller layer: validation, business rules and orchestration for the Auth resource."""

from typing import Optional

from fastapi import APIRouter, HTTPException, status

from app.auth.utils import hash_password, verify_password
from app.models.user import ActivityLogEntry, UserCreate, UserInDB, UserResponse
from app.repositories.user_repository import DuplicateEmailError, UserRepository


class AuthController:
    """Coordinates validation, password hashing, and the user repository layer."""

    def __init__(self, repo: Optional[UserRepository] = None) -> None:
        self.repo = repo or UserRepository()

    async def register_user(self, user_create: UserCreate) -> UserResponse:
        try:
            hashed_password = hash_password(user_create.password)
            user_response = await self.repo.create_user(user_create, hashed_password)
        except DuplicateEmailError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        await self.repo.append_activity_log(
            user_id=user_response.id,
            activity_log_entry=ActivityLogEntry(
                action="User Registration",
                details=f"User {user_create.email} registered successfully.",
            ),
        )
        return user_response
