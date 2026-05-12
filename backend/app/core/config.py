from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongo_url: str = "mongodb://localhost:27017"
    db_name: str = "ems_db"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
