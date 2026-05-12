from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    APP_NAME: str = "Employee Management System"
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "ems_db"
    MONGO_TEST_DB_NAME: str = "ems_test_db"

settings = Settings()