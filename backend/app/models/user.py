from typing import Literal

from pydantic import BaseModel, EmailStr, Field, SecretStr

from datetime import datetime,timezone   


UserRole = Literal["user", "Admin"]

class UserCreate(BaseModel):
    email: EmailStr = Field(...,    description="User email (must be unique)")
    password: SecretStr = Field(..., min_length=8, max_length=128, description="User password")

class UserResponse(BaseModel):
    id: str = Field(..., description="Unique user ID")
    email: EmailStr = Field(..., description="User email")
    role: UserRole = Field("user", description="User role (default: user)")

class ActivityLogEntry(BaseModel):
    action: str = Field(..., description="Description of the activity")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp of the activity")
    details: str | None = Field(..., description="Additional details about the activity")

class UserInDB(UserResponse):
    id: str | None = Field(default=None, description="Unique user ID")
    email: EmailStr = Field(..., description="User email")
    hashed_password: SecretStr = Field(..., description="Hashed user password")
    role: UserRole = Field("user", description="User role (default: user)")
    activity: list[ActivityLogEntry] = Field(default_factory=list, description="List of user activity logs")
    