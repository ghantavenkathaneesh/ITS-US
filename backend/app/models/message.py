"""Typed MongoDB fields for participant-scoped messages."""

from datetime import datetime
from typing import TypedDict


class MessageDocument(TypedDict):
    """A message belongs to exactly two booking participants."""

    conversation_id: str
    booking_id: str
    participant_ids: list[str]
    sender_id: str
    sender_name: str
    recipient_id: str
    other_user_id: str
    other_user_name: str
    body: str
    created_at: datetime
    read_at: datetime | None
