"""Traveler-owned trip persistence with published-place validation."""

from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase

from app.models.trip import TripDocument
from app.schemas.trips import TripPublic, TripWrite

TRIP_FIELDS = {
    "city_slug": 1,
    "city_name": 1,
    "title": 1,
    "overview": 1,
    "days": 1,
    "created_at": 1,
    "updated_at": 1,
}


def _as_public_trip(document: dict[str, Any]) -> TripPublic:
    """Convert an owner-filtered Mongo document to its public response model."""

    return TripPublic(
        id=str(document["_id"]) if "_id" in document else document["id"],
        city_slug=document["city_slug"],
        city_name=document["city_name"],
        title=document["title"],
        overview=document["overview"],
        days=document["days"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


async def _resolve_trip_document(
    database: AsyncDatabase[Any], user_id: str, payload: TripWrite
) -> TripDocument | None:
    """Build a trip snapshot after resolving every activity to a published place."""

    city = await database.cities.find_one(
        {"slug": payload.city_slug, "active": True}, {"_id": 1, "name": 1, "slug": 1}
    )
    if city is None:
        return None
    requested_ids = {
        activity.place_id.lower()
        for day in payload.days
        for activity in day.activities
    }
    try:
        object_ids = [ObjectId(place_id) for place_id in requested_ids]
    except (InvalidId, TypeError, ValueError):
        return None
    cursor = database.places.find(
        {"_id": {"$in": object_ids}, "city_id": str(city["_id"]), "status": "published"},
        {"name": 1, "is_demo": 1},
    )
    place_documents = await cursor.to_list(length=len(object_ids))
    places = {str(place["_id"]): place for place in place_documents}
    if len(places) != len(requested_ids):
        return None

    now = datetime.now(UTC)
    saved_days = [
        {
            "day_number": day.day_number,
            "theme": day.theme,
            "activities": [
                {
                    "place_id": activity.place_id.lower(),
                    "place_name": places[activity.place_id.lower()]["name"],
                    "is_demo": bool(places[activity.place_id.lower()].get("is_demo", False)),
                    "time_block": activity.time_block.value,
                    "idea": activity.idea,
                }
                for activity in day.activities
            ],
        }
        for day in payload.days
    ]
    return {
        "user_id": user_id,
        "city_id": str(city["_id"]),
        "city_slug": city["slug"],
        "city_name": city["name"],
        "title": payload.title,
        "overview": payload.overview,
        "days": saved_days,
        "created_at": now,
        "updated_at": now,
    }


async def create_trip(
    database: AsyncDatabase[Any], user_id: str, payload: TripWrite
) -> TripPublic | None:
    """Save a trip under its authenticated owner's ID."""

    document = await _resolve_trip_document(database, user_id, payload)
    if document is None:
        return None
    result = await database.trips.insert_one(document)
    response_document: dict[str, Any] = {**document, "_id": result.inserted_id}
    return _as_public_trip(response_document)


async def list_owned_trips(database: AsyncDatabase[Any], user_id: str) -> list[TripPublic]:
    """List trips belonging only to the authenticated user."""

    cursor = database.trips.find({"user_id": user_id}, TRIP_FIELDS).sort("updated_at", -1)
    documents = await cursor.to_list(length=100)
    return [_as_public_trip(document) for document in documents]


async def get_owned_trip(
    database: AsyncDatabase[Any], user_id: str, trip_id: str
) -> TripPublic | None:
    """Read one trip only when its user ID matches the current user."""

    try:
        object_id = ObjectId(trip_id)
    except (InvalidId, TypeError, ValueError):
        return None
    document = await database.trips.find_one(
        {"_id": object_id, "user_id": user_id}, TRIP_FIELDS
    )
    return _as_public_trip(document) if document is not None else None


async def update_owned_trip(
    database: AsyncDatabase[Any], user_id: str, trip_id: str, payload: TripWrite
) -> TripPublic | None:
    """Replace a trip only when it belongs to the authenticated user."""

    try:
        object_id = ObjectId(trip_id)
    except (InvalidId, TypeError, ValueError):
        return None
    replacement = await _resolve_trip_document(database, user_id, payload)
    if replacement is None:
        return None
    del replacement["created_at"]
    now = datetime.now(UTC)
    replacement["updated_at"] = now
    document = await database.trips.find_one_and_update(
        {"_id": object_id, "user_id": user_id},
        {"$set": replacement},
        projection=TRIP_FIELDS,
        return_document=ReturnDocument.AFTER,
    )
    return _as_public_trip(document) if document is not None else None


async def delete_owned_trip(database: AsyncDatabase[Any], user_id: str, trip_id: str) -> bool:
    """Delete a trip only when it belongs to the authenticated user."""

    try:
        object_id = ObjectId(trip_id)
    except (InvalidId, TypeError, ValueError):
        return False
    result = await database.trips.delete_one({"_id": object_id, "user_id": user_id})
    return result.deleted_count == 1
