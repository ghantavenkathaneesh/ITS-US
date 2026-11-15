"""Validated city, guide, and place response schemas."""

from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class CitySeed(BaseModel):
    """Validated bootstrap data for adding a destination without code changes."""

    model_config = ConfigDict(extra="forbid")

    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    name: str = Field(min_length=2, max_length=100, strip_whitespace=True)
    region: str = Field(min_length=2, max_length=100, strip_whitespace=True)
    country: str = Field(min_length=2, max_length=100, strip_whitespace=True)
    is_launch_city: bool = False
    active: bool = True


class CityPublic(BaseModel):
    """Public information for an active destination."""

    model_config = ConfigDict(extra="forbid")

    id: str
    slug: str
    name: str
    region: str
    country: str
    is_launch_city: bool
    created_at: datetime


class PlacePublic(BaseModel):
    """Curated place information; no unverified pricing or availability."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str
    category: str
    area: str | None = None
    image_url: HttpUrl | None = None
    tags: list[str] = Field(default_factory=list)
    is_demo: bool = False
    created_at: datetime


class GuidePublic(BaseModel):
    """Published guide profile without a fabricated rating or verification claim."""

    model_config = ConfigDict(extra="forbid")

    id: str
    display_name: str
    bio: str
    languages: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    photo_url: HttpUrl | None = None


class GuideProfileWrite(BaseModel):
    """Guide-owned profile input; moderation state cannot be supplied by the guide."""

    model_config = ConfigDict(extra="forbid")

    city_slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    display_name: str = Field(min_length=2, max_length=80, strip_whitespace=True)
    bio: str = Field(min_length=40, max_length=1200, strip_whitespace=True)
    languages: list[str] = Field(min_length=1, max_length=8)
    interests: list[str] = Field(default_factory=list, max_length=12)
    photo_url: HttpUrl | None = None

    @field_validator("languages", "interests")
    @classmethod
    def normalize_guide_lists(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values]
        if any(not value or len(value) > 40 for value in cleaned):
            raise ValueError("List entries must contain between 1 and 40 characters")
        return list(dict.fromkeys(cleaned))


class GuideProfilePrivate(GuidePublic):
    """The guide's own profile with its moderation status."""

    city_slug: str
    status: str
    updated_at: datetime


class GuideModerationStatus(StrEnum):
    """Admin review outcomes; none implies identity verification."""

    PENDING = "pending"
    PUBLISHED = "published"
    REJECTED = "rejected"


class GuideStatusUpdate(BaseModel):
    """Admin-controlled publication state for a guide profile."""

    model_config = ConfigDict(extra="forbid")

    status: GuideModerationStatus


class PlaceWrite(BaseModel):
    """Admin-curated place information, without prices or availability claims."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=120, strip_whitespace=True)
    description: str = Field(min_length=20, max_length=1200, strip_whitespace=True)
    category: str = Field(min_length=2, max_length=60, strip_whitespace=True)
    area: str | None = Field(default=None, max_length=100, strip_whitespace=True)
    image_url: HttpUrl | None = None
    tags: list[str] = Field(default_factory=list, max_length=12)
    is_demo: bool = False

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values]
        if any(not value or len(value) > 40 for value in cleaned):
            raise ValueError("Tags must contain between 1 and 40 characters")
        return list(dict.fromkeys(cleaned))


class PlaceModerationStatus(StrEnum):
    """Whether an admin-curated place is hidden or publicly listed."""

    DRAFT = "draft"
    PUBLISHED = "published"


class PlaceStatusUpdate(BaseModel):
    """Admin-controlled publication state for a place record."""

    model_config = ConfigDict(extra="forbid")

    status: PlaceModerationStatus


class PlacePrivate(PlacePublic):
    """Admin view of a place including destination and moderation state."""

    city_slug: str
    status: str
    updated_at: datetime


class DemoPlaceSeed(BaseModel):
    """Clearly marked demonstration content loaded for the initial city."""

    model_config = ConfigDict(extra="forbid")

    seed_key: str = Field(pattern=r"^[a-z0-9-]+$", max_length=80)
    city_slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=20, max_length=1200)
    category: str = Field(min_length=2, max_length=60)
    area: str | None = Field(default=None, max_length=100)
    tags: list[str] = Field(default_factory=list, max_length=12)
    is_demo: Literal[True]


class CityCatalog(BaseModel):
    """City detail with only explicitly published catalog records."""

    model_config = ConfigDict(extra="forbid")

    city: CityPublic
    places: list[PlacePublic]
    guides: list[GuidePublic]
