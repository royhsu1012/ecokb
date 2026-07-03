from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    google_api_key: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""
    admin_secret_key: str = ""
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"  # 容忍多餘環境變數（如已淘汰的 SUPABASE_ANON_KEY），避免啟動崩潰

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
