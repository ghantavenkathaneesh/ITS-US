"""Shared database and authentication dependencies."""

from collections.abc import Awaitable, Callable
from typing import Annotated, Any

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import get_settings
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_database(request: Request) -> AsyncDatabase[Any]:
    """Return the configured database or a service-unavailable response."""

    client = getattr(request.app.state, "mongo", None)
    if client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
    return client[get_settings().mongodb_database]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    database: Annotated[AsyncDatabase[Any], Depends(get_database)],
) -> dict[str, Any]:
    """Validate the bearer token and load the current user from MongoDB."""

    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        claims = decode_access_token(credentials.credentials, get_settings())
        user_id = ObjectId(claims["sub"])
    except (jwt.InvalidTokenError, InvalidId, KeyError, TypeError, ValueError):
        raise unauthorized from None

    user = await database.users.find_one(
        {"_id": user_id},
        {"display_name": 1, "email": 1, "role": 1, "created_at": 1},
    )
    if user is None:
        raise unauthorized
    user["id"] = str(user.pop("_id"))
    return user


def require_roles(*roles: str) -> Callable[..., Awaitable[dict[str, Any]]]:
    """Build a dependency limiting access to one or more current account roles."""

    async def role_dependency(
        user: Annotated[dict[str, Any], Depends(get_current_user)],
    ) -> dict[str, Any]:
        if user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return role_dependency
