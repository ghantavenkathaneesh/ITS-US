"""Traveler-owned booking requests with no payment or confirmation behavior."""

from datetime import UTC, datetime, time
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase

from app.models.booking import BookingDocument
from app.schemas.bookings import BookingPublic, BookingRequest, BookingStatus

BOOKING_FIELDS = {
    "guide_id": 1,
    "guide_name": 1,
    "city_slug": 1,
    "requested_date": 1,
    "guest_count": 1,
    "note": 1,
    "status": 1,
    "created_at": 1,
    "updated_at": 1,
}


def _as_public_booking(document: dict[str, Any]) -> BookingPublic:
    return BookingPublic(
        id=str(document["_id"]) if "_id" in document else document["id"],
        guide_id=document["guide_id"],
        guide_name=document["guide_name"],
        city_slug=document["city_slug"],
        requested_date=document.get("requested_date"),
        guest_count=document["guest_count"],
        note=document.get("note"),
        status=document["status"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


async def create_booking_request(
    database: AsyncDatabase[Any], user_id: str, payload: BookingRequest
) -> BookingPublic | None:
    """Create a pending request for a published guide profile."""

    try:
        guide_object_id = ObjectId(payload.guide_id)
    except (InvalidId, TypeError, ValueError):
        return None
    guide = await database.guides.find_one(
        {"_id": guide_object_id, "status": "published"},
        {"owner_id": 1, "city_id": 1, "city_slug": 1, "display_name": 1},
    )
    if guide is None:
        return None
    city = await database.cities.find_one(
        {"_id": ObjectId(guide["city_id"]), "active": True}, {"_id": 1}
    )
    if city is None:
        return None
    now = datetime.now(UTC)
    document: BookingDocument = {
        "user_id": user_id,
        "guide_id": str(guide["_id"]),
        "guide_owner_id": guide["owner_id"],
        "guide_name": guide["display_name"],
        "city_id": str(guide["city_id"]),
        "city_slug": guide["city_slug"],
        "requested_date": (
            datetime.combine(payload.requested_date, time.min, tzinfo=UTC)
            if payload.requested_date is not None
            else None
        ),
        "guest_count": payload.guest_count,
        "note": payload.note,
        "status": BookingStatus.REQUESTED.value,
        "created_at": now,
        "updated_at": now,
    }
    result = await database.bookings.insert_one(document)
    response_document: dict[str, Any] = {**document, "_id": result.inserted_id}
    return _as_public_booking(response_document)


async def list_owned_bookings(
    database: AsyncDatabase[Any], user_id: str
) -> list[BookingPublic]:
    """List booking requests belonging only to the authenticated traveler."""

    cursor = database.bookings.find({"user_id": user_id}, BOOKING_FIELDS).sort("created_at", -1)
    documents = await cursor.to_list(length=100)
    return [_as_public_booking(document) for document in documents]


async def list_guide_bookings(
    database: AsyncDatabase[Any], guide_owner_id: str
) -> list[BookingPublic]:
    """List requests only for the authenticated guide's own profile."""

    cursor = database.bookings.find(
        {"guide_owner_id": guide_owner_id}, BOOKING_FIELDS
    ).sort("created_at", -1)
    documents = await cursor.to_list(length=100)
    return [_as_public_booking(document) for document in documents]


async def get_owned_booking(
    database: AsyncDatabase[Any], user_id: str, booking_id: str
) -> BookingPublic | None:
    """Read one request only when it belongs to the authenticated traveler."""

    try:
        object_id = ObjectId(booking_id)
    except (InvalidId, TypeError, ValueError):
        return None
    document = await database.bookings.find_one(
        {"_id": object_id, "user_id": user_id}, BOOKING_FIELDS
    )
    return _as_public_booking(document) if document is not None else None


async def cancel_owned_booking(
    database: AsyncDatabase[Any], user_id: str, booking_id: str
) -> BookingPublic | None:
    """Cancel only the authenticated traveler's still-requested booking."""

    try:
        object_id = ObjectId(booking_id)
    except (InvalidId, TypeError, ValueError):
        return None
    now = datetime.now(UTC)
    document = await database.bookings.find_one_and_update(
        {"_id": object_id, "user_id": user_id, "status": BookingStatus.REQUESTED.value},
        {"$set": {"status": BookingStatus.CANCELLED.value, "updated_at": now}},
        projection=BOOKING_FIELDS,
        return_document=ReturnDocument.AFTER,
    )
    if document is None:
        document = await database.bookings.find_one(
            {"_id": object_id, "user_id": user_id, "status": BookingStatus.CANCELLED.value},
            BOOKING_FIELDS,
        )
    return _as_public_booking(document) if document is not None else None
