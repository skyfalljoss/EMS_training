"""HTTP layer for the Employee resource."""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from app.controllers.employee_controller import EmployeeController
from app.core.permissions import Permission
from app.dependencies.auth import require_password_not_expired, require_permissions
from app.dependencies.employees import get_employee_controller
from app.models.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate

# Router-level guard: every endpoint here requires a non-expired password.
# Per-endpoint deps only need to declare the *permission* check.
router = APIRouter(
    prefix="/employees",
    tags=["employees"],
    dependencies=[Depends(require_password_not_expired)],
)


@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employee",
)
async def create_employee(
    payload: EmployeeCreate,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_CREATE)),
):
    return await controller.create(payload, current_user)


@router.get(
    "",
    response_model=list[EmployeeResponse],
    summary="List employees with optional filters",
)
async def list_employees(
    department_id: Optional[int] = Query(None, description="Filter by department id"),
    role: Optional[str] = Query(None, description="Filter by role"),
    name: Optional[str] = Query(None, description="Case-insensitive name search"),
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),
):
    return await controller.list(department_id, role, name, current_user)


@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Get a single employee by id",
)
async def get_employee(
    employee_id: int,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_READ)),
):
    return await controller.get(employee_id, current_user)


@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Update an existing employee",
)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_UPDATE)),
):
    return await controller.update(employee_id, payload, current_user)


@router.delete(
    "/{employee_id}",
    summary="Delete an employee",
)
async def delete_employee(
    employee_id: int,
    controller: EmployeeController = Depends(get_employee_controller),
    current_user: dict = Depends(require_permissions(Permission.EMPLOYEE_DELETE)),
):
    return await controller.delete(employee_id, current_user)
