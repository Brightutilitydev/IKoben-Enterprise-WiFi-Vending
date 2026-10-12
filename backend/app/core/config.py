from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "IKoben Enterprise Wi-Fi Vending SaaS"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./ikoben.db" # Default to local sqlite for dev
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # MikroTik
    MIKROTIK_HOST: str = "10.5.50.1"
    MIKROTIK_PORT: int = 8728
    MIKROTIK_USER: str = "ikoben_api"
    MIKROTIK_PASSWORD: str = ""
    
    # Kuda
    KUDA_API_KEY: str = ""
    KUDA_SECRET: str = ""
    
    # Portal URLs
    PUBLIC_PORTAL_URL: str = "http://localhost:3000"
    FRONTEND_API_BASE_URL: str = "http://localhost:8000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
