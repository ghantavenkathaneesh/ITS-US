"""Guide-owned profile edits and admin publication review."""

from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase

from app.models.guide import GuideDocument
from app.schemas.city import GuideModerationStatus, GuideProfilePrivate, GuideProfileWrite

GUIDE_PRIVATE_FIELDS = {
    "city_slug": 1,
    "display_name": 1,
    "bio": 1,
    "languages": 1,
    "interests": 1,
    "photo_url": 1,
    "status": 1,
    "created_at": 1,
    "updated_at": 1,
}


def _as_private_profile(document: dict[str, Any]) -> GuideProfilePrivate:
    document["id"] = str(document.pop("_id"))
    return GuideProfilePrivate.model_validate(document)


async def get_owned_profile(
    database: AsyncDatabase[Any], owner_id: str
) -> GuideProfilePrivate | None:
    """Read only the profile belonging to the authenticated guide."""

    document = await database.guides.find_one({"owner_id": owner_id}, GUIDE_PRIVATE_FIELDS)
    return _as_private_profile(document) if document is not None else None


async def list_profiles_for_review(
    database: AsyncDatabase[Any], status: GuideModerationStatus, limit: int = 100
) -> list[GuideProfilePrivate]:
    """List bounded guide submissions for admin review."""

    cursor = database.guides.find({"status": status.value}, GUIDE_PRIVATE_FIELDS).sort("updated_at", -1)
    documents = await cursor.to_list(length=limit)
    return [_as_private_profile(document) for document in documents]


async def save_owned_profile(
    database: AsyncDatabase[Any], owner_id: str, payload: GuideProfileWrite
) -> GuideProfilePrivate | None:
    """Create or replace an owned profile, returning edits to pending review."""

    city = await database.cities.find_one(
        {"slug": payload.city_slug, "active": True}, {"_id": 1, "slug": 1}
    )
    if city is None:
        return None
    now = datetime.now(UTC)
    document: GuideDocument = {
        "owner_id": owner_id,
        "city_id": str(city["_id"]),
        "city_slug": city["slug"],
        "display_name": payload.display_name,
        "bio": payload.bio,
        "languages": payload.languages,
        "interests": payload.interests,
        "photo_url": str(payload.photo_url) if payload.photo_url else None,
        "status": GuideModerationStatus.PENDING.value,
        "created_at": now,
        "updated_at": now,
    }
    await database.guides.update_one(
        {"owner_id": owner_id},
        {"$set": {key: value for key, value in document.items() if key != "created_at"},
         "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    return await get_owned_profile(database, owner_id)


async def set_guide_status(
    database: AsyncDatabase[Any], guide_id: str, status: GuideModerationStatus, admin_id: str
) -> GuideProfilePrivate | None:
    """Change publication state for an existing guide profile as an admin."""

    try:
        object_id = ObjectId(guide_id)
    except (InvalidId, TypeError, ValueError):
        return None
    now = datetime.now(UTC)
    document = await database.guides.find_one_and_update(
        {"_id": object_id},
        {"$set": {
            "status": status.value,
            "moderated_by": admin_id,
            "moderated_at": now,
            "updated_at": now,
        }},
        projection=GUIDE_PRIVATE_FIELDS,
        return_document=ReturnDocument.AFTER,
    )
    return _as_private_profile(document) if document is not None else None
