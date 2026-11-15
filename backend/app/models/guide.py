"""Typed MongoDB document fields for guide profiles."""

from datetime import datetime
from typing import TypedDict


class GuideDocument(TypedDict):
    """Persisted guide profile fields; public APIs expose an explicit subset."""

    owner_id: str
    city_id: str
    city_slug: str
    display_name: str
    bio: str
    languages: list[str]
    interests: list[str]
    photo_url: str | None
    status: str
    created_at: datetime
    updated_at: datetime
