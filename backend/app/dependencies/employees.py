"""Dependency providers for the Employee resource."""

from app.controllers.employee_controller import EmployeeController


def get_employee_controller() -> EmployeeController:
    """Provide an ``EmployeeController`` instance per request."""
    return EmployeeController()
