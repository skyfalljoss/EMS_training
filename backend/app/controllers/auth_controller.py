from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, status

from app.core.security import hash_password, verify_password, create_access_token
from app.core.permissions import AuthRole
from app.repositories.auth_repository import AuthRepository

LOCKOUT_THRESHOLD = 5
LOCKOUT_DURATION_MINUTES = 15


class AuthController:
    def __init__(self, repo: Optional[AuthRepository] = None):
        self.repo = repo or AuthRepository()

    async def login(self, email: str, password: str) -> Optional[dict]:
        user = await self.repo.find_by_email(email)
        if user is None:
            return None
        now = datetime.now(timezone.utc)
        locked_until = user.get("locked_until")
        if locked_until and locked_until > now:
            return None
        if not verify_password(password, user["password_hash"]):
            failed = user.get("failed_attempts", 0) + 1
            update = {"failed_attempts": failed}
            if failed >= LOCKOUT_THRESHOLD:
                update["locked_until"] = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            await self.repo.update(user["id"], update)
            return None
        await self.repo.update(user["id"], {
            "last_login": now,
            "failed_attempts": 0,
            "locked_until": None,
        })
        token_data = {
            "sub": str(user["id"]),
            "role": user["auth_role"],
            "employee_id": user.get("employee_id"),
            "email": user["email"],
            "must_change_pwd": user.get("must_change_password", False),
        }
        return {"access_token": create_access_token(data=token_data), "token_type": "bearer"}

    async def register(self, name: str, email: str, password: str) -> int:
        existing = await self.repo.find_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email '{email}' already registered",
            )
        now = datetime.now(timezone.utc)
        from app.repositories.employee_repository import EmployeeRepository

        emp_repo = EmployeeRepository()
        emp_id = await emp_repo.next_id()
        emp_doc = {
            "id": emp_id,
            "name": name,
            "email": str(email),
            "role": "New Hire",
            "department_id": 1,
            "status": "active",
            "createdAt": now,
            "updatedAt": now,
        }
        await emp_repo.insert(emp_doc)
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Auth user with email '{email}' already exists",
            )
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
        await self.repo.update(user_id, {"is_active": True})
        return True

    async def change_password(self, user_id: int, old_password: str, new_password: str) -> Optional[dict]:
        user = await self.repo.find_by_id(user_id)
        if user is None:
            return None
        if not verify_password(old_password, user["password_hash"]):
            return None
        new_hash = hash_password(new_password)
        await self.repo.update(user_id, {
            "password_hash": new_hash,
            "must_change_password": False,
            "failed_attempts": 0,
            "locked_until": None,
        })
        token_data = {
            "sub": str(user["id"]),
            "role": user["auth_role"],
            "employee_id": user.get("employee_id"),
            "email": user["email"],
            "must_change_pwd": False,
        }
        return {"access_token": create_access_token(data=token_data), "token_type": "bearer"}

    async def get_user(self, user_id: int) -> Optional[dict]:
        return await self.repo.find_by_id(user_id)

    async def list_users(self) -> list[dict]:
        return await self.repo.find_all()
