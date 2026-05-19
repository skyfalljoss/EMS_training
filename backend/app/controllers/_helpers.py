from typing import Optional

from app.core.permissions import AuthRole


def _role(current_user: Optional[dict]) -> Optional[AuthRole]:
    if not current_user:
        return None
    raw = current_user.get("auth_role")
    try:
        return AuthRole(raw) if raw is not None else None
    except ValueError:
        return None
