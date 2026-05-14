"""Controller providers for FastAPI dependency injection.

Add new ``get_*_controller`` factories here as the application grows
(e.g. ``get_department_controller``, ``get_auth_controller``).
"""

from app.controllers.department_controller import DepartmentController
from app.controllers.employee_controller import EmployeeController


def get_employee_controller() -> EmployeeController:
    """Provide an ``EmployeeController`` instance per request."""
    return EmployeeController()


def get_department_controller() -> DepartmentController:
    """Provide a ``DepartmentController`` instance per request."""
    return DepartmentController()
