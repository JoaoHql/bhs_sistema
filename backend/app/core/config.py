from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
BACKEND_ENV_LOCAL_FILE = Path(__file__).resolve().parents[2] / ".env.local"
DEFAULT_JWT_SECRET = "supersecretmockjwtsecretkeytochangeinprod"


class Settings(BaseSettings):
    app_name: str = "BHS Modelo Backend"
    environment: str = "local"
    api_cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    database_url: str | None = None
    default_user_email: str = "admin@bhs.demo"
    default_client_slug: str = "bhs-demo"
    internal_api_token: str | None = None
    jwt_secret: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_access_token_minutes: int = 180
    jwt_issuer: str = "bhs-modelo-backend"
    jwt_audience: str = "bhs-modelo-api"
    password_min_length: int = Field(default=10, ge=10, le=200)
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_number: bool = True
    password_require_special: bool = True
    generated_password_length: int = Field(default=16, ge=10, le=200)
    temporary_password_ttl_hours: int = Field(default=24, ge=1, le=168)
    dev_mock_auth: bool = True
    db_pool_min_size: int = 1
    db_pool_max_size: int = 10
    db_pool_max_waiting: int = 20
    db_pool_timeout_seconds: float = 10.0
    whatsapp_api_url: str | None = Field(default=None, validation_alias=AliasChoices("BHS_WHATSAPP_API_URL", "WHATSAPP_API_URL"))
    whatsapp_api_token: str | None = Field(default=None, validation_alias=AliasChoices("BHS_WHATSAPP_API_TOKEN", "WHATSAPP_API_TOKEN"))
    whatsapp_api_instance: str | None = Field(default=None, validation_alias=AliasChoices("BHS_WHATSAPP_API_INSTANCE", "WHATSAPP_API_INSTANCE"))
    whatsapp_request_timeout_seconds: float = 15.0
    whatsapp_connect_retries: int = Field(default=1, ge=0, le=3)
    whatsapp_provider_name: str = "evolution"
    redis_url: str | None = Field(default=None, validation_alias=AliasChoices("REDIS_URL", "BHS_REDIS_URL"))
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    openai_request_timeout_seconds: float = 20.0

    model_config = SettingsConfigDict(
        env_prefix="BHS_",
        env_file=(BACKEND_ENV_FILE, BACKEND_ENV_LOCAL_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.environment.lower() != "production":
            return self

        errors: list[str] = []
        if self.jwt_secret == DEFAULT_JWT_SECRET or len(self.jwt_secret) < 32:
            errors.append("BHS_JWT_SECRET seguro")
        if self.dev_mock_auth:
            errors.append("BHS_DEV_MOCK_AUTH=false")
        if not self.internal_api_token:
            errors.append("BHS_INTERNAL_API_TOKEN")
        if not self.api_cors_origins or any("localhost" in origin or "127.0.0.1" in origin or origin == "*" for origin in self.api_cors_origins):
            errors.append("BHS_API_CORS_ORIGINS sem localhost ou wildcard")
        if errors:
            raise ValueError("Configuracao de producao invalida: " + ", ".join(errors))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
