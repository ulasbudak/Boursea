from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    supabase_url: str = ""
    supabase_db_url: str = ""
    supabase_anon_key: str = ""
    finnhub_api_key: str = ""
    twelvedata_api_key: str = ""
    google_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    resend_api_key: str = ""
    notification_from_email: str = "Borocean <alerts@borocean.app>"
    cors_origins: str = "http://localhost:3000,http://localhost:8081"


@lru_cache
def get_settings() -> Settings:
    return Settings()
