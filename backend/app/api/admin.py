"""Admin-only guide moderation and place curation endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.dependencies import get_database, require_roles
from app.schemas.city import (
    GuideModerationStatus,
    GuideProfilePrivate,
    GuideStatusUpdate,
    PlaceModerationStatus,
    PlacePrivate,
    PlaceStatusUpdate,
    PlaceWrite,
)
from app.services.guides import list_profiles_for_review, set_guide_status
from app.services.places import create_place, list_places_for_review, set_place_status, update_place

router = APIRouter(prefix="/admin", tags=["admin"])
CurrentAdmin = Annotated[dict[str, Any], Depends(require_roles("admin"))]
Database = Annotated[AsyncDatabase[Any], Depends(get_database)]


@router.get("/guides", response_model=list[GuideProfilePrivate])
async def list_guides(
    _admin: CurrentAdmin,
    database: Database,
    status_filter: GuideModerationStatus = Query(default=GuideModerationStatus.PENDING, alias="status"),
) -> list[GuideProfilePrivate]:
    """List guide submissions by review status for an admin."""

    return await list_profiles_for_review(database, status_filter)


@router.patch("/guides/{guide_id}/status", response_model=GuideProfilePrivate)
async def moderate_guide(
    guide_id: str,
    payload: GuideStatusUpdate,
    admin: CurrentAdmin,
    database: Database,
) -> GuideProfilePrivate:
    """Publish, reject, or return a guide profile to pending review."""

    profile = await set_guide_status(database, guide_id, payload.status, admin["id"])
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide profile not found")
    return profile


@router.post("/cities/{city_slug}/places", response_model=PlacePrivate, status_code=201)
async def add_place(
    city_slug: Annotated[str, Path(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)],
    payload: PlaceWrite,
    _admin: CurrentAdmin,
    database: Database,
) -> PlacePrivate:
    """Add a draft place record; it stays private until separately published."""

    place = await create_place(database, city_slug, payload)
    if place is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active city not found")
    return place


@router.get("/places", response_model=list[PlacePrivate])
async def list_places(
    _admin: CurrentAdmin,
    database: Database,
    status_filter: PlaceModerationStatus = Query(default=PlaceModerationStatus.DRAFT, alias="status"),
) -> list[PlacePrivate]:
    """List place records by publication status for an admin."""

    return await list_places_for_review(database, status_filter)


@router.put("/places/{place_id}", response_model=PlacePrivate)
async def edit_place(
    place_id: str,
    payload: PlaceWrite,
    admin: CurrentAdmin,
    database: Database,
) -> PlacePrivate:
    """Edit place details; any change puts the record back into draft."""

    place = await update_place(database, place_id, payload, admin["id"])
    if place is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    return place


@router.patch("/places/{place_id}/status", response_model=PlacePrivate)
async def moderate_place(
    place_id: str,
    payload: PlaceStatusUpdate,
    admin: CurrentAdmin,
    database: Database,
) -> PlacePrivate:
    """Publish or hide a curated place record."""

    place = await set_place_status(database, place_id, payload.status, admin["id"])
    if place is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    return place
