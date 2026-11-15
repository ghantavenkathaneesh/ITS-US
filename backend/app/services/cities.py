"""City and published discovery catalog queries."""

from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from app.schemas.city import CityCatalog, CityPublic, GuidePublic, PlacePublic

CITY_FIELDS = {
    "slug": 1,
    "name": 1,
    "region": 1,
    "country": 1,
    "is_launch_city": 1,
    "created_at": 1,
}
PLACE_FIELDS = {
    "name": 1,
    "description": 1,
    "category": 1,
    "area": 1,
    "image_url": 1,
    "tags": 1,
    "is_demo": 1,
    "created_at": 1,
}
GUIDE_FIELDS = {
    "display_name": 1,
    "bio": 1,
    "languages": 1,
    "interests": 1,
    "photo_url": 1,
}


def _with_public_id(document: dict[str, Any]) -> dict[str, Any]:
    """Convert a projected Mongo document into the public model shape."""

    document["id"] = str(document.pop("_id"))
    return document


async def list_active_cities(database: AsyncDatabase[Any]) -> list[CityPublic]:
    """Return currently active city records, ordered by their display names."""

    cursor = database.cities.find({"active": True}, CITY_FIELDS).sort("name", 1)
    documents = await cursor.to_list(length=200)
    return [CityPublic.model_validate(_with_public_id(item)) for item in documents]


async def get_city_catalog(database: AsyncDatabase[Any], slug: str) -> CityCatalog | None:
    """Return one active city and its published places and guide profiles."""

    city = await database.cities.find_one({"slug": slug, "active": True}, CITY_FIELDS)
    if city is None:
        return None
    city_id = str(city["_id"])
    places_cursor = database.places.find(
        {"city_id": city_id, "status": "published"}, PLACE_FIELDS
    ).sort("name", 1)
    guides_cursor = database.guides.find(
        {"city_id": city_id, "status": "published"}, GUIDE_FIELDS
    ).sort("display_name", 1)
    places, guides = await places_cursor.to_list(length=100), await guides_cursor.to_list(length=100)
    return CityCatalog(
        city=CityPublic.model_validate(_with_public_id(city)),
        places=[PlacePublic.model_validate(_with_public_id(item)) for item in places],
        guides=[GuidePublic.model_validate(_with_public_id(item)) for item in guides],
    )
