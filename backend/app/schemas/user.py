"""User identity and authentication schemas."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRole(StrEnum):
    """Supported account roles."""

    TRAVELER = "traveler"
    GUIDE = "guide"
    ADMIN = "admin"


class RegistrationRole(StrEnum):
    """Roles a visitor may choose during public registration."""

    TRAVELER = "traveler"
    GUIDE = "guide"


class UserCreate(BaseModel):
    """Validated public account-registration input."""

    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=2, max_length=80, strip_whitespace=True)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    role: RegistrationRole = RegistrationRole.TRAVELER

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class UserLogin(BaseModel):
    """Validated account-login input."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class UserPublic(BaseModel):
    """Safe user data returned to clients."""

    model_config = ConfigDict(extra="forbid")

    id: str
    display_name: str
    email: EmailStr
    role: UserRole
    created_at: datetime
