"""Booking-scoped messages visible only to the two booking participants."""

from datetime import UTC, datetime
from hashlib import sha256
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.asynchronous.database import AsyncDatabase

from app.models.message import MessageDocument
from app.schemas.messages import ConversationSummary, MessagePublic, MessageWrite


def _conversation_id(booking_id: str) -> str:
    return sha256(f"its-us:booking:{booking_id}".encode()).hexdigest()


def _public_message(document: dict[str, Any]) -> MessagePublic:
    return MessagePublic(
        id=str(document["_id"]) if "_id" in document else document["id"],
        conversation_id=document["conversation_id"],
        booking_id=document["booking_id"],
        sender_id=document["sender_id"],
        recipient_id=document["recipient_id"],
        body=document["body"],
        created_at=document["created_at"],
        read_at=document.get("read_at"),
    )


async def _participant_booking(
    database: AsyncDatabase[Any], user: dict[str, Any], booking_id: str
) -> dict[str, Any] | None:
    """Load an active booking only when the caller is one of its participants."""

    try:
        object_id = ObjectId(booking_id)
    except (InvalidId, TypeError, ValueError):
        return None
    booking = await database.bookings.find_one(
        {"_id": object_id, "status": "requested"},
        {"user_id": 1, "guide_owner_id": 1, "guide_name": 1},
    )
    if booking is None:
        return None
    if user["id"] == booking["user_id"] and user["role"] == "traveler":
        peer = await database.users.find_one(
            {"_id": ObjectId(booking["guide_owner_id"])}, {"_id": 1, "display_name": 1}
        )
        peer_name = booking["guide_name"]
    elif user["id"] == booking["guide_owner_id"] and user["role"] == "guide":
        peer = await database.users.find_one(
            {"_id": ObjectId(booking["user_id"])}, {"_id": 1, "display_name": 1}
        )
        peer_name = peer["display_name"] if peer else "Traveler"
    else:
        return None
    if peer is None:
        return None
    booking["_id"] = str(booking["_id"])
    booking["peer_id"] = str(peer["_id"])
    booking["peer_name"] = peer_name
    return booking


async def send_booking_message(
    database: AsyncDatabase[Any], user: dict[str, Any], payload: MessageWrite
) -> MessagePublic | None:
    """Send a message only to the other participant in an active booking request."""

    booking = await _participant_booking(database, user, payload.booking_id)
    if booking is None:
        return None
    now = datetime.now(UTC)
    document: MessageDocument = {
        "conversation_id": _conversation_id(booking["_id"]),
        "booking_id": booking["_id"],
        "participant_ids": [user["id"], booking["peer_id"]],
        "sender_id": user["id"],
        "sender_name": user["display_name"],
        "recipient_id": booking["peer_id"],
        "other_user_id": booking["peer_id"],
        "other_user_name": booking["peer_name"],
        "body": payload.body,
        "created_at": now,
        "read_at": None,
    }
    result = await database.messages.insert_one(document)
    return _public_message({**document, "_id": result.inserted_id})


async def list_conversations(
    database: AsyncDatabase[Any], user: dict[str, Any]
) -> list[ConversationSummary]:
    """Return the latest message for each conversation involving this user."""

    pipeline = [
        {"$match": {"participant_ids": user["id"]}},
        {"$sort": {"created_at": 1}},
        {"$group": {"_id": "$conversation_id", "latest": {"$last": "$$ROOT"}}},
        {"$sort": {"latest.created_at": -1}},
        {"$limit": 100},
    ]
    rows = await database.messages.aggregate(pipeline).to_list(length=100)
    summaries = []
    for row in rows:
        latest = row["latest"]
        booking = await database.bookings.find_one(
            {"_id": ObjectId(latest["booking_id"]), "status": "requested"}, {"_id": 1}
        )
        if booking is None:
            continue
        if latest["sender_id"] == user["id"]:
            other_user_id = latest["other_user_id"]
            other_user_name = latest["other_user_name"]
        else:
            other_user_id = latest["sender_id"]
            other_user_name = latest["sender_name"]
        summaries.append(ConversationSummary(
            conversation_id=row["_id"],
            booking_id=latest["booking_id"],
            other_user_id=other_user_id,
            other_user_name=other_user_name,
            latest_message=latest["body"],
            updated_at=latest["created_at"],
        ))
    return summaries


async def read_conversation(
    database: AsyncDatabase[Any], user: dict[str, Any], conversation_id: str
) -> list[MessagePublic] | None:
    """Read a participant's active booking thread and mark incoming messages read."""

    messages = await database.messages.find(
        {"conversation_id": conversation_id, "participant_ids": user["id"]},
        {
            "conversation_id": 1,
            "booking_id": 1,
            "sender_id": 1,
            "recipient_id": 1,
            "body": 1,
            "created_at": 1,
            "read_at": 1,
        },
    ).sort("created_at", 1).to_list(length=500)
    if not messages:
        return None
    booking = await _participant_booking(database, user, messages[0]["booking_id"])
    if booking is None or _conversation_id(booking["_id"]) != conversation_id:
        return None
    now = datetime.now(UTC)
    await database.messages.update_many(
        {"conversation_id": conversation_id, "recipient_id": user["id"], "read_at": None},
        {"$set": {"read_at": now}},
    )
    for message in messages:
        if message["recipient_id"] == user["id"] and message.get("read_at") is None:
            message["read_at"] = now
        message["id"] = str(message.pop("_id"))
    return [MessagePublic.model_validate(message) for message in messages]
