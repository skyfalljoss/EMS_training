from fastapi import Depends

from app.controllers.employee_controller import EmployeeController
from app.dependencies.repositories import (
    get_auth_repository,
    get_department_repository,
    get_employee_repository,
)
from app.repositories.auth_repository import AuthRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository


def get_employee_controller(
    repo: EmployeeRepository = Depends(get_employee_repository),
    dept_repo: DepartmentRepository = Depends(get_department_repository),
    auth_repo: AuthRepository = Depends(get_auth_repository),
) -> EmployeeController:
    return EmployeeController(repo=repo, dept_repo=dept_repo, auth_repo=auth_repo)
