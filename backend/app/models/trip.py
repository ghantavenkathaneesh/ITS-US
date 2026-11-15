"""Typed MongoDB fields for traveler-owned trip plans."""

from datetime import datetime
from typing import TypedDict


class TripDocument(TypedDict):
    """Stored trip fields, keyed by the owning traveler ID."""

    user_id: str
    city_id: str
    city_slug: str
    city_name: str
    title: str
    overview: str
    days: list[dict[str, object]]
    created_at: datetime
    updated_at: datetime
