from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.controllers.department_controller import DepartmentController
from app.dependencies.controllers import get_department_controller
from app.models.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate

router = APIRouter(prefix="/departments", tags=["departments"])


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED, summary="Create a new department")
async def create_department(
    payload: DepartmentCreate,
    controller: DepartmentController = Depends(get_department_controller),
):
    return await controller.create(payload)


@router.get("", response_model=list[DepartmentResponse], summary="List departments with optional filters")
async def list_departments(
    status: Optional[str] = Query(None, pattern=r"^(active|inactive|archived)$"),
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc", pattern=r"^(asc|desc)$"),
    controller: DepartmentController = Depends(get_department_controller),
):
    return await controller.list(status, skip, limit, sort_by, sort_order)


@router.get("/{department_id}", response_model=DepartmentResponse, summary="Get a single department by id")
async def get_department(
    department_id: int,
    controller: DepartmentController = Depends(get_department_controller),
):
    return await controller.get(department_id)


@router.put("/{department_id}", response_model=DepartmentResponse, summary="Update an existing department")
async def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    controller: DepartmentController = Depends(get_department_controller),
):
    return await controller.update(department_id, payload)


@router.delete("/{department_id}", summary="Delete a department")
async def delete_department(
    department_id: int,
    controller: DepartmentController = Depends(get_department_controller),
):
    return await controller.delete(department_id)
