"""Admin-curated place creation and publication review."""

from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase

from app.models.place import PlaceDocument
from app.schemas.city import PlaceModerationStatus, PlacePrivate, PlaceWrite

PLACE_PRIVATE_FIELDS = {
    "city_slug": 1,
    "name": 1,
    "description": 1,
    "category": 1,
    "area": 1,
    "image_url": 1,
    "tags": 1,
    "is_demo": 1,
    "status": 1,
    "created_at": 1,
    "updated_at": 1,
}


def _as_private_place(document: dict[str, Any]) -> PlacePrivate:
    return PlacePrivate(
        id=str(document["_id"]) if "_id" in document else document["id"],
        city_slug=document["city_slug"],
        name=document["name"],
        description=document["description"],
        category=document["category"],
        area=document.get("area"),
        image_url=document.get("image_url"),
        tags=document.get("tags", []),
        is_demo=document.get("is_demo", False),
        status=document["status"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


async def create_place(
    database: AsyncDatabase[Any], city_slug: str, payload: PlaceWrite
) -> PlacePrivate | None:
    """Create a hidden place record for an active city."""

    city = await database.cities.find_one(
        {"slug": city_slug, "active": True}, {"_id": 1, "slug": 1}
    )
    if city is None:
        return None
    now = datetime.now(UTC)
    document: PlaceDocument = {
        "city_id": str(city["_id"]),
        "city_slug": city["slug"],
        "name": payload.name,
        "description": payload.description,
        "category": payload.category,
        "area": payload.area,
        "image_url": str(payload.image_url) if payload.image_url else None,
        "tags": payload.tags,
        "is_demo": payload.is_demo,
        "status": PlaceModerationStatus.DRAFT.value,
        "created_at": now,
        "updated_at": now,
    }
    result = await database.places.insert_one(document)
    response_document: dict[str, Any] = {**document, "_id": result.inserted_id}
    return _as_private_place(response_document)


async def list_places_for_review(
    database: AsyncDatabase[Any], status: PlaceModerationStatus, limit: int = 100
) -> list[PlacePrivate]:
    """List bounded place records for admin review."""

    cursor = database.places.find({"status": status.value}, PLACE_PRIVATE_FIELDS).sort("updated_at", -1)
    documents = await cursor.to_list(length=limit)
    return [_as_private_place(document) for document in documents]


async def update_place(
    database: AsyncDatabase[Any], place_id: str, payload: PlaceWrite, admin_id: str
) -> PlacePrivate | None:
    """Replace curated content and return the record to draft review."""

    try:
        object_id = ObjectId(place_id)
    except (InvalidId, TypeError, ValueError):
        return None
    now = datetime.now(UTC)
    fields = {
        "name": payload.name,
        "description": payload.description,
        "category": payload.category,
        "area": payload.area,
        "image_url": str(payload.image_url) if payload.image_url else None,
        "tags": payload.tags,
        "is_demo": payload.is_demo,
        "status": PlaceModerationStatus.DRAFT.value,
        "moderated_by": admin_id,
        "updated_at": now,
    }
    document = await database.places.find_one_and_update(
        {"_id": object_id},
        {"$set": fields},
        projection=PLACE_PRIVATE_FIELDS,
        return_document=ReturnDocument.AFTER,
    )
    return _as_private_place(document) if document is not None else None


async def set_place_status(
    database: AsyncDatabase[Any], place_id: str, status: PlaceModerationStatus, admin_id: str
) -> PlacePrivate | None:
    """Publish or hide a place record as an admin."""

    try:
        object_id = ObjectId(place_id)
    except (InvalidId, TypeError, ValueError):
        return None
    now = datetime.now(UTC)
    document = await database.places.find_one_and_update(
        {"_id": object_id},
        {"$set": {
            "status": status.value,
            "moderated_by": admin_id,
            "moderated_at": now,
            "updated_at": now,
        }},
        projection=PLACE_PRIVATE_FIELDS,
        return_document=ReturnDocument.AFTER,
    )
    return _as_private_place(document) if document is not None else None
