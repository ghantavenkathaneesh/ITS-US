"""User account persistence operations."""

from datetime import UTC, datetime
from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from app.core.security import hash_password, verify_password
from app.schemas.user import UserCreate, UserLogin


def to_public_user(document: dict[str, Any]) -> dict[str, Any]:
    """Copy a user record into the public response shape without its hash."""

    return {
        "id": str(document["_id"]),
        "display_name": document["display_name"],
        "email": document["email"],
        "role": document["role"],
        "created_at": document["created_at"],
    }


async def register_user(database: AsyncDatabase[Any], payload: UserCreate) -> dict[str, Any]:
    """Insert a user with a one-way password hash and UTC timestamps."""

    now = datetime.now(UTC)
    document = {
        "display_name": payload.display_name,
        "email": str(payload.email),
        "password_hash": hash_password(payload.password),
        "role": payload.role.value,
        "created_at": now,
        "updated_at": now,
    }
    result = await database.users.insert_one(document)
    document["_id"] = result.inserted_id
    return document


async def authenticate_user(database: AsyncDatabase[Any], payload: UserLogin) -> dict[str, Any] | None:
    """Return the stored record for valid credentials, or None otherwise."""

    user = await database.users.find_one({"email": str(payload.email)})
    if user is None or not verify_password(payload.password, user.get("password_hash", "")):
        return None
    return user
