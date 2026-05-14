"""Dependency providers for the Department resource."""

from app.controllers.department_controller import DepartmentController


def get_department_controller() -> DepartmentController:
    """Provide a ``DepartmentController`` instance per request."""
    return DepartmentController()
