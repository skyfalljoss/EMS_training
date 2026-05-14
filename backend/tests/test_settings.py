"""Tests for the Settings class in app.core.settings."""

from pathlib import Path
from unittest.mock import patch

from app.core.settings import Settings

ENV_KEYS = ("APP_ENV", "APP_NAME", "MONGO_URL", "DB_NAME", "MONGO_TEST_DB_NAME")


def test_settings_load_defaults_when_env_missing(tmp_path: Path):
    """Settings fall back to defaults when env vars and .env file are absent."""
    fake_env = tmp_path / "missing.env"  # path that does not exist

    # Replace os.environ with an empty dict for the duration of the test
    with patch.dict("os.environ", {}, clear=True):
        s = Settings(_env_file=str(fake_env))

    assert s.APP_ENV == "development"
    assert s.APP_NAME == "Employee Management System"
    assert s.MONGO_URL == "mongodb://localhost:27017"
    assert s.DB_NAME == "ems_db"
    assert s.MONGO_TEST_DB_NAME == "ems_test_db"


def test_settings_read_mongo_uri_from_env():
    """Settings reads MONGO_URL from the environment when present."""
    custom_uri = "mongodb://user:pass@example.com:27018"

    with patch.dict("os.environ", {"MONGO_URL": custom_uri}, clear=False):
        s = Settings(_env_file=None)

    assert s.MONGO_URL == custom_uri

