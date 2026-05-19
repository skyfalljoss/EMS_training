from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    APP_NAME: str = "Employee Management System"
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "ems_db"
    MONGO_TEST_DB_NAME: str = "ems_test_db"
    
    # Security settings
    JWT_SECRET_KEY: str = "dev-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    BCRYPT_WORK_FACTOR: int = 12
    CORS_ORIGINS: list[str] = ["*"]


settings = Settings()