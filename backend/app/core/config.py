from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    project_name: str = "AI Drawing Inspection System"
    api_prefix: str = "/api/v1"

    database_url: str = "sqlite:///./qip.db"

    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 720

    anthropic_api_key: str = ""
    ai_model: str = "claude-opus-5"
    ai_confidence_threshold: float = 0.75
    ai_max_pages: int = 6

    storage_dir: str = "./storage"
    cors_origins: str = "http://localhost:3000"
    company_name: str = "Precision Components Pvt. Ltd."

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def storage_path(self) -> Path:
        p = Path(self.storage_dir)
        if not p.is_absolute():
            p = BASE_DIR / p
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
