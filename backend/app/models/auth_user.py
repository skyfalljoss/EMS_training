from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import re
from app.core.permissions import AuthRole


_SPECIAL_RE = re.compile(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\\\;'/`~]")


def _validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit")
    if not _SPECIAL_RE.search(v):
        raise ValueError("Password must contain at least one special character")
    return v


class AuthUserCreate(BaseModel):
    employee_id: int
    email: EmailStr
    password: str
    auth_role: AuthRole = AuthRole.EMPLOYEE

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, v: str) -> str:
        return _validate_password(v)


class AuthUserResponse(BaseModel):
    id: int
    employee_id: Optional[int] = None
    email: str
    auth_role: AuthRole
    is_active: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_doc(cls, doc: dict) -> "AuthUserResponse":
        return cls(**doc)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Full name")
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, v: str) -> str:
        return _validate_password(v)


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_field(cls, v: str) -> str:
        return _validate_password(v)


class AuthUserRoleUpdate(BaseModel):
    auth_role: AuthRole
