from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class AuditLogEntry(BaseModel):
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    outcome: str
    detail: Optional[str] = None
    ip_address: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None


class AuditLogResponse(AuditLogEntry):
    id: int
    timestamp: datetime

    model_config = {"from_attributes": True}
