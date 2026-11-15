"""Validated booking-participant message models."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MessageWrite(BaseModel):
    """New message tied to a booking shared by the sender and recipient."""

    model_config = ConfigDict(extra="forbid")

    booking_id: str = Field(pattern=r"^[0-9a-fA-F]{24}$")
    body: str = Field(min_length=1, max_length=2000, strip_whitespace=True)


class MessagePublic(BaseModel):
    """A message visible only to a participant in its booking conversation."""

    model_config = ConfigDict(extra="forbid")

    id: str
    conversation_id: str
    booking_id: str
    sender_id: str
    recipient_id: str
    body: str
    created_at: datetime
    read_at: datetime | None


class ConversationSummary(BaseModel):
    """Latest message information for one booking conversation."""

    model_config = ConfigDict(extra="forbid")

    conversation_id: str
    booking_id: str
    other_user_id: str
    other_user_name: str
    latest_message: str
    updated_at: datetime
