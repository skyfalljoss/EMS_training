from fastapi import FastAPI

from app.core.settings import settings
from app.main import create_app


def test_create_app_returns_fastapi_instance():
    """create_app() returns a FastAPI instance."""
    app = create_app()
    assert isinstance(app, FastAPI)


def test_app_includes_health_route():
    """The /health route is registered on the app."""
    app = create_app()
    paths = {route.path for route in app.routes}
    assert "/health" in paths


def test_app_loads_settings_into_state():
    """create_app() attaches the Settings object to app.state."""
    app = create_app()
    assert app.state.settings is settings
    assert isinstance(app.state.settings.APP_NAME, str)
    assert app.state.settings.APP_NAME != ""
