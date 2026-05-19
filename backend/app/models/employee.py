"""Pydantic models for the Employee resource."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp helper."""
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class EmploymentStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"


# ---------------------------------------------------------------------------
# Base model
# ---------------------------------------------------------------------------

class EmployeeBase(BaseModel):
    """Shared fields for create payloads and responses."""

    model_config = ConfigDict(
        str_strip_whitespace=True,  # trims accidental leading/trailing spaces
        use_enum_values=True,       # stores the enum value, not the member
        populate_by_name=True,      # allows both alias and field name on input
    )

    name: str = Field(..., min_length=1, description="Employee full name")
    email: EmailStr = Field(..., description="Employee email (must be unique)")
    role: str = Field(..., min_length=1, description="Job role, e.g. Engineer")
    department_id: int = Field(..., ge=1, description="Reference to Department.id")
    position: Optional[str] = Field(None, min_length=1, description="Optional job title")
    status: EmploymentStatus = Field(
        EmploymentStatus.ACTIVE,
        description="Employment status",
    )
    phone: Optional[str] = Field(None, description="E.164-normalised phone number")
    location: Optional[str] = Field(None, description="Office location (city, state)")
    manager: Optional[str] = Field(None, description="Manager name (free-text)")
    start_date: Optional[datetime] = Field(None, description="Employment start date")
    date_of_birth: Optional[datetime] = Field(None, description="Date of birth")

    # ------------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------------

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = re.sub(r"[\s\-\(\)\.]+", "", v)
        if not re.match(r"^\+?\d{7,15}$", cleaned):
            raise ValueError(
                "Invalid phone number — use digits only, optionally prefixed with +"
            )
        return cleaned

    @field_validator("start_date", "date_of_birth", mode="before")
    @classmethod
    def ensure_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        """Attach UTC timezone to naive datetimes rather than rejecting them."""
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

class EmployeeCreate(EmployeeBase):
    """Payload for POST /employees. Timestamps are server-managed."""


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

class EmployeeUpdate(BaseModel):
    """Payload for PUT /employees/{id} — all fields optional."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        use_enum_values=True,
        populate_by_name=True,
    )

    name: Optional[str] = Field(None, min_length=1)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, min_length=1)
    department_id: Optional[int] = Field(None, ge=1)
    position: Optional[str] = Field(None, min_length=1)
    status: Optional[EmploymentStatus] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    manager: Optional[str] = None
    start_date: Optional[datetime] = None
    date_of_birth: Optional[datetime] = None

    # Sensitive fields remain updatable internally but are handled separately
    salary: Optional[float] = Field(None, ge=0)
    national_id: Optional[str] = None
    rating: Optional[float] = Field(None, ge=0, le=5)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = re.sub(r"[\s\-\(\)\.]+", "", v)
        if not re.match(r"^\+?\d{7,15}$", cleaned):
            raise ValueError(
                "Invalid phone number — use digits only, optionally prefixed with +"
            )
        return cleaned

    @field_validator("start_date", "date_of_birth", mode="before")
    @classmethod
    def ensure_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

class EmployeeResponse(EmployeeBase):
    """
    Safe response returned to general API consumers.
    Excludes sensitive fields (salary, national_id, rating).
    """

    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        use_enum_values=True,
        populate_by_name=True,
    )

    id: int = Field(..., description="Auto-incremented employee id")
    created_at: Optional[datetime] = Field(
        None,
        alias="createdAt",
        description="Creation timestamp (UTC)",
    )
    updated_at: Optional[datetime] = Field(
        None,
        alias="updatedAt",
        description="Last update timestamp (UTC)",
    )


class EmployeeInternalResponse(EmployeeResponse):
    """
    Full response for privileged consumers (HR, payroll systems).
    Includes sensitive fields hidden from the public response.
    """

    salary: Optional[float] = Field(None, ge=0, description="Annual salary (numeric)")
    rating: Optional[float] = Field(None, ge=0, le=5, description="Performance rating 0-5")
    national_id: Optional[str] = Field(None, description="National ID / SSN")