"""Static guards for FastAPI routes.

These tests walk the dependency tree of every registered route and assert
that protected routes have `require_password_not_expired` wired in — so a
future developer cannot accidentally drop the guard from a handler
signature without also breaking this test.
"""

from fastapi.routing import APIRoute

from app.dependencies.auth import require_password_not_expired
from app.main import app


# Routes that MUST be reachable without the password-not-expired guard.
PUBLIC_OR_SELF_SERVICE_PATHS = {
    "/",
    "/health",
    "/auth/login",
    "/auth/register",
    "/auth/me",
    "/auth/password",
}


def _has_dep(dependant, target) -> bool:
    """Recursively scan a FastAPI Dependant tree for a callable."""
    if dependant.call is target:
        return True
    return any(_has_dep(sub, target) for sub in dependant.dependencies)


def test_every_protected_route_requires_password_not_expired():
    missing = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if route.path in PUBLIC_OR_SELF_SERVICE_PATHS:
            continue
        if not _has_dep(route.dependant, require_password_not_expired):
            missing.append(f"{','.join(route.methods)} {route.path}")
    assert not missing, (
        "These routes are missing `require_password_not_expired`:\n  "
        + "\n  ".join(missing)
    )


def test_public_routes_do_not_require_password_not_expired():
    """Self-service paths (login/me/password) MUST stay reachable when expired."""
    leaks = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if route.path not in PUBLIC_OR_SELF_SERVICE_PATHS:
            continue
        if _has_dep(route.dependant, require_password_not_expired):
            leaks.append(f"{','.join(route.methods)} {route.path}")
    assert not leaks, (
        "These routes must NOT have `require_password_not_expired`:\n  "
        + "\n  ".join(leaks)
    )
