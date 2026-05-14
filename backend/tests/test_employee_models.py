"""Unit tests for Pydantic models in app.models.employee."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.models.employee import (
    EmployeeBase,
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
    utcnow,
)


# ---------- helpers ----------

def _valid_payload(**overrides) -> dict:
    base = {
        "name": "John Doe",
        "email": "john@test.com",
        "role": "Engineer",
        "department_id": 1,
        "position": "Senior Developer",
        "status": "active",
    }
    base.update(overrides)
    return base


# ---------- utcnow ----------

def test_utcnow_returns_timezone_aware_datetime():
    now = utcnow()
    assert isinstance(now, datetime)
    assert now.tzinfo is not None
    assert now.utcoffset() == timezone.utc.utcoffset(now)


# ---------- EmployeeBase ----------

def test_employee_base_accepts_minimum_valid_fields():
    employee = EmployeeBase(**_valid_payload())
    assert employee.name == "John Doe"
    assert employee.email == "john@test.com"
    assert employee.role == "Engineer"
    assert employee.department_id == 1
    assert employee.position == "Senior Developer"
    assert employee.status == "active"  # default


def test_employee_base_accepts_optional_position_and_custom_status():
    employee = EmployeeBase(
        **_valid_payload(position="Senior Engineer", status="inactive")
    )
    assert employee.position == "Senior Engineer"
    assert employee.status == "inactive"


@pytest.mark.parametrize("field", ["name", "role"])
def test_employee_base_rejects_empty_string_for_required_fields(field):
    with pytest.raises(ValidationError):
        EmployeeBase(**_valid_payload(**{field: ""}))


@pytest.mark.parametrize("field", ["name", "email", "role", "department_id"])
def test_employee_base_requires_field(field):
    payload = _valid_payload()
    payload.pop(field)
    with pytest.raises(ValidationError):
        EmployeeBase(**payload)


@pytest.mark.parametrize("bad_email", ["not-an-email", "missing@tld", "@nope.com", ""])
def test_employee_base_rejects_invalid_email(bad_email):
    with pytest.raises(ValidationError):
        EmployeeBase(**_valid_payload(email=bad_email))


def test_employee_base_rejects_empty_position_when_provided():
    with pytest.raises(ValidationError):
        EmployeeBase(**_valid_payload(position=""))


# ---------- EmployeeCreate ----------

def test_employee_create_inherits_validation():
    create = EmployeeCreate(**_valid_payload())
    assert create.email == "john@test.com"


def test_employee_create_does_not_accept_id_or_timestamps():
    """Server-managed fields are not part of the create payload."""
    create = EmployeeCreate(**_valid_payload())
    dumped = create.model_dump()
    assert "id" not in dumped
    assert "createdAt" not in dumped
    assert "updatedAt" not in dumped


# ---------- EmployeeUpdate ----------

def test_employee_update_allows_no_fields():
    """An empty update payload is valid (used as a no-op)."""
    update = EmployeeUpdate()
    assert update.model_dump(exclude_unset=True) == {}


def test_employee_update_allows_partial_fields():
    update = EmployeeUpdate(role="Lead Engineer")
    assert update.role == "Lead Engineer"
    assert update.model_dump(exclude_unset=True) == {"role": "Lead Engineer"}


def test_employee_update_rejects_empty_string_when_field_present():
    with pytest.raises(ValidationError):
        EmployeeUpdate(name="")


def test_employee_update_rejects_invalid_email():
    with pytest.raises(ValidationError):
        EmployeeUpdate(email="not-an-email")


def test_employee_update_excludes_unset_fields_from_dump():
    update = EmployeeUpdate(department_id=2)
    dumped = update.model_dump(exclude_unset=True)
    assert dumped == {"department_id": 2}


# ---------- EmployeeResponse ----------

def test_employee_response_requires_id():
    with pytest.raises(ValidationError):
        EmployeeResponse(**_valid_payload())


def test_employee_response_with_full_fields():
    now = utcnow()
    response = EmployeeResponse(
        **_valid_payload(position="Tech Lead"),
        id=1,
        createdAt=now,
        updatedAt=now,
    )
    assert response.id == 1
    assert response.createdAt == now
    assert response.updatedAt == now


def test_employee_response_timestamps_are_optional():
    response = EmployeeResponse(**_valid_payload(), id=42)
    assert response.id == 42
    assert response.createdAt is None
    assert response.updatedAt is None


def test_employee_response_serializes_to_dict():
    now = utcnow()
    response = EmployeeResponse(**_valid_payload(), id=7, createdAt=now, updatedAt=now)
    dumped = response.model_dump()
    assert dumped["id"] == 7
    assert dumped["name"] == "John Doe"
    assert dumped["status"] == "active"
    assert dumped["createdAt"] == now
