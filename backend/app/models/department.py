from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(
        ...,
        min_length=2,
        max_length=10,
        pattern=r"^[A-Z][A-Z0-9_]*$",
    )
    description: Optional[str] = Field(None, max_length=500)
    head: Optional[str] = Field(None, max_length=100)
    status: str = Field("active", pattern=r"^(active|inactive|archived)$")


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=10, pattern=r"^[A-Z][A-Z0-9_]*$")
    description: Optional[str] = Field(None, max_length=500)
    head: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, pattern=r"^(active|inactive|archived)$")


class DepartmentResponse(DepartmentBase):
    model_config = {"from_attributes": True}
    id: int = Field(...)
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
