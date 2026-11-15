"""Typed application settings sourced from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import EmailStr, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration; secrets are never exposed in API responses."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    app_name: str = "ITS US API"
    api_prefix: str = "/api/v1"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "its_us"
    jwt_secret: SecretStr
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-4o-mini"
    admin_email: EmailStr | None = None
    admin_password: SecretStr | None = None
    cors_origins: list[str] = ["http://localhost:3000"]

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_must_be_long_enough(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters")
        return value

    @field_validator("admin_email")
    @classmethod
    def normalize_admin_email(cls, value: EmailStr | None) -> str | None:
        return str(value).strip().lower() if value is not None else None

    @model_validator(mode="after")
    def admin_bootstrap_requires_both_values(self) -> "Settings":
        if (self.admin_email is None) != (self.admin_password is None):
            raise ValueError("Set both ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap an admin account")
        if self.admin_password is not None and len(self.admin_password.get_secret_value()) < 12:
            raise ValueError("ADMIN_PASSWORD must contain at least 12 characters")
        return self


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""

    return Settings()
