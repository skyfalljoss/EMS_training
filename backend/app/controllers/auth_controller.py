from datetime import datetime, timezone, timedelta
from typing import Optional

from app.auth.utils import hash_password, verify_password, create_access_token
from app.core.exceptions import (
    InvalidCredentialsError,
    NotFoundError,
    ValidationError,
)
from app.controllers.employee_controller import EmployeeController
from app.core.permissions import AuthRole
from app.models.auth_user import AuthUserResponse
from app.repositories.auth_repository import AuthRepository
from app.core.settings import settings

# LOCKOUT_THRESHOLD = 5
# LOCKOUT_DURATION_MINUTES = 15


class AuthController:
    def __init__(self, repo: AuthRepository, employee_controller: EmployeeController):
        self.repo = repo
        self.employee_controller = employee_controller

    async def login(self, email: str, password: str) -> dict:
        user = await self.repo.find_by_email(email)
        if user is None:
            raise InvalidCredentialsError("Invalid credentials")
        now = datetime.now(timezone.utc)
        locked_until = user.get("locked_until")
        if locked_until and locked_until > now:
            raise InvalidCredentialsError("Invalid credentials")
        if not verify_password(password, user["password_hash"]):
            failed = user.get("failed_attempts", 0) + 1
            update = {"failed_attempts": failed}
            if failed >= settings.LOCKOUT_THRESHOLD:
                update["locked_until"] = now + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
            await self.repo.update(user["id"], update)
            raise InvalidCredentialsError("Invalid credentials")
        if not user.get("is_active", False):
            raise InvalidCredentialsError("Invalid credentials")
        await self.repo.update(user["id"], {
            "last_login": now,
            "failed_attempts": 0,
            "locked_until": None,
        })
        # Token holds identity only.  auth_role is NEVER read from the
        # token — `get_current_user` re-fetches it from the DB on every
        # request so that role revocation takes effect immediately.
        token_data = {
            "sub": str(user["id"]),
            "employee_id": user.get("employee_id"),
            "email": user["email"],
            "must_change_pwd": user.get("must_change_password", False),
        }
        return {"access_token": create_access_token(data=token_data), "token_type": "bearer"}

    async def register(self, name: str, email: str, password: str) -> int:
        existing = await self.repo.find_by_email(email)
        if existing:
            raise ValidationError(f"User with email '{email}' already registered")
        emp_id = await self.employee_controller.create_pending(name, email)
        password_hash = hash_password(password)
        return await self.repo.insert({
            "employee_id": emp_id,
            "email": str(email),
            "password_hash": password_hash,
            "auth_role": AuthRole.EMPLOYEE.value,
            "is_active": False,
        })

    async def create_auth_user(self, employee_id: int, email: str, password: str, role: AuthRole) -> int:
        existing = await self.repo.find_by_email(email)
        if existing:
            raise ValidationError(f"Auth user with email '{email}' already exists")
        try:
            await self.employee_controller.get(employee_id)
        except NotFoundError:
            raise ValidationError(f"Employee with id {employee_id} not found")
        password_hash = hash_password(password)
        return await self.repo.insert({
            "employee_id": employee_id,
            "email": email,
            "password_hash": password_hash,
            "auth_role": role.value,
            "is_active": True,
            "must_change_password": True,
        })

    async def activate_user(self, user_id: int) -> bool:
        user = await self.repo.find_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        await self.repo.update(user_id, {"is_active": True})
        return True

    async def reject_user(self, user_id: int) -> bool:
        user = await self.repo.find_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        await self.repo.delete(user_id)
        return True

    async def change_password(self, user_id: int, old_password: str, new_password: str) -> dict:
        user = await self.repo.find_by_id(user_id)
        if user is None:
            raise InvalidCredentialsError("Current password is incorrect")
        if not verify_password(old_password, user["password_hash"]):
            raise InvalidCredentialsError("Current password is incorrect")
        new_hash = hash_password(new_password)
        await self.repo.update(user_id, {
            "password_hash": new_hash,
            "must_change_password": False,
            "failed_attempts": 0,
            "locked_until": None,
        })
        token_data = {
            "sub": str(user["id"]),
            "employee_id": user.get("employee_id"),
            "email": user["email"],
            "must_change_pwd": False,
        }
        return {"access_token": create_access_token(data=token_data), "token_type": "bearer"}

    async def get_user(self, user_id: int) -> Optional[dict]:
        return await self.repo.find_by_id(user_id)

    async def update_role(self, user_id: int, new_role: AuthRole) -> bool:
        user = await self.repo.find_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        await self.repo.update(user_id, {"auth_role": new_role.value})
        return True

    async def list_users(self) -> list[AuthUserResponse]:
        users = await self.repo.find_all()
        return [AuthUserResponse.from_doc(u) for u in users]
