from fastapi import Depends

from app.controllers.department_controller import DepartmentController
from app.dependencies.repositories import get_department_repository, get_employee_repository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository


def get_department_controller(
    repo: DepartmentRepository = Depends(get_department_repository),
    employee_repo: EmployeeRepository = Depends(get_employee_repository),
) -> DepartmentController:
    return DepartmentController(repo=repo, employee_repo=employee_repo)
