"""Backward-compatibility shim.

Canonical implementation lives in `app.auth.utils`.  This module re-exports
its public names so existing `from app.core.security import ...` callers
keep working.  Do not add new code here — edit `app/auth/utils.py` instead.
"""

from app.auth.utils import (  # noqa: F401
    create_access_token,
    decode_access_token,
    hash_password,
    pwd_context,
    verify_password,
)
