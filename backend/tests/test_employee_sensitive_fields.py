"""Tests for sensitive field filtering in employee responses."""

from app.models.employee import EmployeeResponse, EmployeeInternalResponse
from app.models.employee import utcnow


def test_employee_response_excludes_sensitive_fields():
    """EmployeeResponse model_dump must not contain salary/national_id/rating."""
    resp = EmployeeResponse(
        id=1,
        name="Test User",
        email="test@test.com",
        role="Engineer",
        department_id=1,
    )
    dumped = resp.model_dump()
    assert "salary" not in dumped
    assert "national_id" not in dumped
    assert "rating" not in dumped


def test_employee_internal_response_includes_sensitive_fields():
    """EmployeeInternalResponse includes salary/national_id/rating."""
    now = utcnow()
    internal = EmployeeInternalResponse(
        id=1,
        name="Test User",
        email="test@test.com",
        role="Engineer",
        department_id=1,
        salary=120000.0,
        national_id="123-45-6789",
        rating=4.5,
        createdAt=now,
        updatedAt=now,
    )
    dumped = internal.model_dump()
    assert dumped["salary"] == 120000.0
    assert dumped["national_id"] == "123-45-6789"
    assert dumped["rating"] == 4.5


def test_employee_api_omits_sensitive_fields(api, auth_headers):
    """The /employees API endpoint must not leak sensitive fields."""
    emp = api.get("/employees/1", headers=auth_headers).json()
    assert "salary" not in emp
    assert "national_id" not in emp
    assert "rating" not in emp


def test_employee_list_omits_sensitive_fields(api, auth_headers):
    """The list endpoint must also omit sensitive fields."""
    employees = api.get("/employees", headers=auth_headers).json()
    for emp in employees:
        assert "salary" not in emp
        assert "national_id" not in emp
        assert "rating" not in emp


def test_employee_response_ignores_extra_sensitive_data():
    """Passing sensitive data to EmployeeResponse silently ignores them."""
    resp = EmployeeResponse(
        id=1,
        name="Test",
        email="test@test.com",
        role="R",
        department_id=1,
        salary=99999,
        national_id="xxx",
        rating=5.0,
    )
    dumped = resp.model_dump()
    assert "salary" not in dumped
    assert "national_id" not in dumped
    assert "rating" not in dumped
