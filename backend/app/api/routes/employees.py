"""HTTP layer for the Employee resource."""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from app.controllers.employee_controller import EmployeeController
from app.dependencies.employees import get_employee_controller
from app.models.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate

router = APIRouter(prefix="/employees", tags=["employees"])


@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employee",
)
async def create_employee(
    payload: EmployeeCreate,
    controller: EmployeeController = Depends(get_employee_controller),
):
    return await controller.create(payload)


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
):
    return await controller.list(department_id, role, name)


@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Get a single employee by id",
)
async def get_employee(
    employee_id: int,
    controller: EmployeeController = Depends(get_employee_controller),
):
    return await controller.get(employee_id)


@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Update an existing employee",
)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    controller: EmployeeController = Depends(get_employee_controller),
):
    return await controller.update(employee_id, payload)


@router.delete(
    "/{employee_id}",
    summary="Delete an employee",
)
async def delete_employee(
    employee_id: int,
    controller: EmployeeController = Depends(get_employee_controller),
):
    return await controller.delete(employee_id)
