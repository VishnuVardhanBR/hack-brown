from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Keys
    gemini_api_key: str = ""
    serpapi_key: str = ""
    
    # Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Gemini
    gemini_model: str = "gemini-2.0-flash"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
