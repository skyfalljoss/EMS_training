"""Dependency providers for the Auth resource."""

from app.controllers.auth_controller import AuthController


def get_auth_controller() -> AuthController:
    """Provide an ``AuthController`` instance per request."""
    return AuthController()
