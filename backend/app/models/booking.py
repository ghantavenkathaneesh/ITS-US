"""Typed MongoDB fields for booking requests."""

from datetime import datetime
from typing import TypedDict


class BookingDocument(TypedDict):
    """Stored request data; a request is not a confirmed booking."""

    user_id: str
    guide_id: str
    guide_owner_id: str
    guide_name: str
    city_id: str
    city_slug: str
    requested_date: datetime | None
    guest_count: int
    note: str | None
    status: str
    created_at: datetime
    updated_at: datetime
