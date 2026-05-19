from fastapi import Depends

from app.controllers.auth_controller import AuthController
from app.controllers.employee_controller import EmployeeController
from app.dependencies.employees import get_employee_controller
from app.dependencies.repositories import get_auth_repository
from app.repositories.auth_repository import AuthRepository


def get_auth_controller(
    repo: AuthRepository = Depends(get_auth_repository),
    employee_controller: EmployeeController = Depends(get_employee_controller),
) -> AuthController:
    return AuthController(repo=repo, employee_controller=employee_controller)
