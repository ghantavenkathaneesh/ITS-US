"""PyMongo async client lifecycle and database indexes."""

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pydantic import TypeAdapter

from app.core.config import Settings
from app.database.bootstrap import bootstrap_admin
from app.models.city import CityDocument
from app.schemas.city import CitySeed, DemoPlaceSeed

logger = logging.getLogger(__name__)


async def seed_initial_cities(database: AsyncDatabase[Any]) -> None:
    """Insert seed destinations once without overwriting later city edits."""

    seed_file = Path(__file__).resolve().parents[2] / "data" / "cities.json"
    cities = TypeAdapter(list[CitySeed]).validate_python(
        json.loads(seed_file.read_text(encoding="utf-8"))
    )
    collection = database["cities"]
    now = datetime.now(UTC)
    for city in cities:
        document: CityDocument = {
            **city.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        result = await collection.update_one(
            {"slug": document["slug"]},
            {"$setOnInsert": document},
            upsert=True,
        )
        if result.upserted_id is not None:
            logger.info("Added initial city record: %s", document["slug"])


async def seed_demo_places(database: AsyncDatabase[Any]) -> None:
    """Insert visible demo-only catalog examples once, without overwriting edits."""

    seed_file = Path(__file__).resolve().parents[2] / "data" / "demo_places.json"
    places = TypeAdapter(list[DemoPlaceSeed]).validate_python(
        json.loads(seed_file.read_text(encoding="utf-8"))
    )
    now = datetime.now(UTC)
    for place in places:
        city = await database.cities.find_one(
            {"slug": place.city_slug, "active": True}, {"_id": 1}
        )
        if city is None:
            logger.warning("Skipping demo place for inactive city: %s", place.city_slug)
            continue
        document = {
            **place.model_dump(exclude={"seed_key", "city_slug"}),
            "city_id": str(city["_id"]),
            "city_slug": place.city_slug,
            "demo_key": place.seed_key,
            "status": "published",
            "created_at": now,
            "updated_at": now,
        }
        result = await database.places.update_one(
            {"demo_key": place.seed_key},
            {"$setOnInsert": document},
            upsert=True,
        )
        if result.upserted_id is not None:
            logger.info("Added demo catalog record: %s", place.seed_key)


async def open_mongo(settings: Settings) -> AsyncMongoClient:
    """Open MongoDB and create required indexes."""

    client = AsyncMongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=3000,
        tz_aware=True,
    )
    await client.admin.command("ping")
    database = client[settings.mongodb_database]
    await database.users.create_index("email", unique=True)
    await database.cities.create_index("slug", unique=True)
    await database.guides.create_index("owner_id", unique=True)
    await database.guides.create_index([("city_id", 1), ("status", 1)])
    await database.places.create_index([("city_id", 1), ("category", 1)])
    await database.places.create_index("demo_key", unique=True, sparse=True)
    await database.trips.create_index([("user_id", 1), ("updated_at", -1)])
    await database.bookings.create_index([("user_id", 1), ("created_at", -1)])
    await database.bookings.create_index([("guide_owner_id", 1), ("created_at", -1)])
    await database.reviews.create_index([("guide_id", 1), ("created_at", -1)])
    await database.messages.create_index([("conversation_id", 1), ("created_at", 1)])
    await database.messages.create_index([("participant_ids", 1), ("created_at", -1)])
    await seed_initial_cities(database)
    await seed_demo_places(database)
    await bootstrap_admin(database, settings)
    return client
