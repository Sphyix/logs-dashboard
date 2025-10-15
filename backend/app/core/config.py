from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Logs Dashboard API"

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = True

        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str):
            if field_name == 'BACKEND_CORS_ORIGINS':
                return json.loads(raw_val)
            return raw_val


settings = Settings()
