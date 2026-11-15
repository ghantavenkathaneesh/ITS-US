"""Optional first-run administrator bootstrap."""

import logging
from datetime import UTC, datetime
from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import Settings
from app.core.security import hash_password

logger = logging.getLogger(__name__)


async def bootstrap_admin(database: AsyncDatabase[Any], settings: Settings) -> None:
    """Insert an initial admin only when credentials are explicitly configured."""

    if settings.admin_email is None or settings.admin_password is None:
        return
    now = datetime.now(UTC)
    document = {
        "display_name": "ITS US administrator",
        "email": str(settings.admin_email),
        "password_hash": hash_password(settings.admin_password.get_secret_value()),
        "role": "admin",
        "created_at": now,
        "updated_at": now,
    }
    result = await database.users.update_one(
        {"email": document["email"]},
        {"$setOnInsert": document},
        upsert=True,
    )
    if result.upserted_id is not None:
        logger.info("Bootstrapped the initial admin account")
    else:
        logger.info("Admin bootstrap identity already exists; its existing role was left unchanged")
