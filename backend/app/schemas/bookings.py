"""Validated booking request and response models."""

from datetime import UTC, date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BookingStatus(StrEnum):
    """Request lifecycle states; there is no payment or fake confirmation state."""

    REQUESTED = "requested"
    CANCELLED = "cancelled"


class BookingRequest(BaseModel):
    """Traveler request sent to a published guide profile."""

    model_config = ConfigDict(extra="forbid")

    guide_id: str = Field(pattern=r"^[0-9a-fA-F]{24}$")
    requested_date: date | None = None
    guest_count: int = Field(default=1, ge=1, le=10)
    note: str | None = Field(default=None, max_length=1000, strip_whitespace=True)

    @field_validator("requested_date")
    @classmethod
    def requested_date_not_in_past(cls, value: date | None) -> date | None:
        if value is not None and value < datetime.now(UTC).date():
            raise ValueError("Requested date cannot be in the past")
        return value


class BookingPublic(BaseModel):
    """A request owned by a traveler; requested does not mean accepted."""

    model_config = ConfigDict(extra="forbid")

    id: str
    guide_id: str
    guide_name: str
    city_slug: str
    requested_date: date | None
    guest_count: int
    note: str | None
    status: BookingStatus
    created_at: datetime
    updated_at: datetime
