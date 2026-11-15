"""Registration, login, and authenticated account endpoints."""

from typing import Annotated, Any

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.api.dependencies import get_current_user, get_database
from app.core.config import get_settings
from app.core.security import create_access_token
from app.schemas.auth import AccessTokenResponse
from app.schemas.user import UserCreate, UserLogin, UserPublic
from app.services.users import authenticate_user, register_user, to_public_user

router = APIRouter(prefix="/auth", tags=["authentication"])


async def issue_token(user: dict[str, Any]) -> AccessTokenResponse:
    """Create the response token for a persisted user record."""

    token, expires_in = create_access_token(
        str(user["_id"]), user["role"], get_settings()
    )
    return AccessTokenResponse(access_token=token, expires_in=expires_in, user=to_public_user(user))


@router.post("/register", response_model=AccessTokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    database: Annotated[AsyncDatabase[Any], Depends(get_database)],
) -> AccessTokenResponse:
    """Create a traveler or guide account; public registration cannot create admins."""

    try:
        user = await register_user(database, payload)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered") from None
    return await issue_token(user)


@router.post("/login", response_model=AccessTokenResponse)
async def login(
    payload: UserLogin,
    database: Annotated[AsyncDatabase[Any], Depends(get_database)],
) -> AccessTokenResponse:
    """Authenticate an account without revealing whether an email exists."""

    user = await authenticate_user(database, payload)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await issue_token(user)


@router.get("/me", response_model=UserPublic)
async def read_current_user(
    user: Annotated[dict[str, Any], Depends(get_current_user)],
) -> UserPublic:
    """Return the authenticated user's public profile."""

    return UserPublic.model_validate(user)
