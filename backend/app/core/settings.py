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
    LOCKOUT_THRESHOLD: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15

    LOGIN_RATE_LIMIT: int = 5
    REGISTER_RATE_LIMIT: int = 3
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    CORS_ORIGINS: list[str] = ["*"]

    @property
    def cors_origins_list(self) -> list[str]:
        if isinstance(self.CORS_ORIGINS, str):
            import json
            try:
                return json.loads(self.CORS_ORIGINS)
            except:
                return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS

    


settings = Settings()