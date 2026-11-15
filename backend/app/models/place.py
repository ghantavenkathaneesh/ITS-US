"""Typed MongoDB document fields for curated places."""

from datetime import datetime
from typing import TypedDict


class PlaceDocument(TypedDict):
    """Persisted place fields; prices and availability are intentionally absent."""

    city_id: str
    city_slug: str
    name: str
    description: str
    category: str
    area: str | None
    image_url: str | None
    tags: list[str]
    is_demo: bool
    status: str
    created_at: datetime
    updated_at: datetime
