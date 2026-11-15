"""Booking-participant messaging endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.dependencies import get_current_user, get_database
from app.schemas.messages import ConversationSummary, MessagePublic, MessageWrite
from app.services.messages import list_conversations, read_conversation, send_booking_message

router = APIRouter(prefix="/messages", tags=["messages"])
CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
Database = Annotated[AsyncDatabase[Any], Depends(get_database)]


@router.post("", response_model=MessagePublic, status_code=status.HTTP_201_CREATED)
async def create_message(
    payload: MessageWrite, user: CurrentUser, database: Database
) -> MessagePublic:
    """Send a message through a booking shared by a traveler and its guide."""

    message = await send_booking_message(database, user, payload)
    if message is None:
        raise HTTPException(status_code=404, detail="Active booking or participant not found")
    return message


@router.get("/conversations", response_model=list[ConversationSummary])
async def get_conversations(user: CurrentUser, database: Database) -> list[ConversationSummary]:
    """List booking conversations that include the authenticated account."""

    return await list_conversations(database, user)


@router.get("/conversations/{conversation_id}", response_model=list[MessagePublic])
async def get_conversation(
    conversation_id: str, user: CurrentUser, database: Database
) -> list[MessagePublic]:
    """Read a thread only when the account participates in its active booking."""

    messages = await read_conversation(database, user, conversation_id)
    if messages is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return messages
