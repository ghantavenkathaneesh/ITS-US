"""Guide self-service profile endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.dependencies import get_database, require_roles
from app.schemas.city import GuideProfilePrivate, GuideProfileWrite
from app.services.guides import get_owned_profile, save_owned_profile

router = APIRouter(prefix="/guides", tags=["guides"])
CurrentGuide = Annotated[dict[str, Any], Depends(require_roles("guide"))]
Database = Annotated[AsyncDatabase[Any], Depends(get_database)]


@router.get("/me/profile", response_model=GuideProfilePrivate)
async def read_my_guide_profile(user: CurrentGuide, database: Database) -> GuideProfilePrivate:
    """Read only the signed-in guide's profile."""

    profile = await get_owned_profile(database, user["id"])
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide profile not found")
    return profile


@router.put("/me/profile", response_model=GuideProfilePrivate)
async def write_my_guide_profile(
    payload: GuideProfileWrite,
    user: CurrentGuide,
    database: Database,
) -> GuideProfilePrivate:
    """Create or update the signed-in guide's profile for an active city."""

    profile = await save_owned_profile(database, user["id"], payload)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active city not found")
    return profile
