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
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5-20250929"
    resend_api_key: str = ""
    notification_from_email: str = "Trendus <alerts@trendus.app>"
    cors_origins: str = "http://localhost:3000,http://localhost:8081"


@lru_cache
def get_settings() -> Settings:
    return Settings()
