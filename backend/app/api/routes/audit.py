from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.controllers.audit_controller import AuditController
from app.core.permissions import Permission
from app.dependencies.audit import get_audit_controller
from app.dependencies.auth import (
    get_current_user,
    require_password_not_expired,
    require_permissions,
)
from app.models.audit_log import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
async def get_audit_logs(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    controller: AuditController = Depends(get_audit_controller),
    current_user: dict = Depends(require_permissions(Permission.AUDIT_READ)),
    _: dict = Depends(require_password_not_expired),
):
    logs = await controller.get_logs_for_user(
        current_user, action=action, resource_type=resource_type,
        outcome=outcome, limit=limit, skip=skip,
    )
    return [AuditLogResponse(**log) for log in logs]
