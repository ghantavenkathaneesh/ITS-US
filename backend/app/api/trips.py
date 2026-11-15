"""Traveler-owned trip endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.dependencies import get_database, require_roles
from app.schemas.trips import TripPublic, TripWrite
from app.services.trips import create_trip, delete_owned_trip, get_owned_trip, list_owned_trips, update_owned_trip

router = APIRouter(prefix="/trips", tags=["trips"])
CurrentTraveler = Annotated[dict[str, Any], Depends(require_roles("traveler"))]
Database = Annotated[AsyncDatabase[Any], Depends(get_database)]


@router.post("", response_model=TripPublic, status_code=status.HTTP_201_CREATED)
async def save_trip(
    payload: TripWrite,
    user: CurrentTraveler,
    database: Database,
) -> TripPublic:
    """Save a plan with place references verified against the published city catalog."""

    trip = await create_trip(database, user["id"], payload)
    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Choose an active city and only published places from that city.",
        )
    return trip


@router.get("", response_model=list[TripPublic])
async def list_my_trips(user: CurrentTraveler, database: Database) -> list[TripPublic]:
    """List only the authenticated traveler's saved trips."""

    return await list_owned_trips(database, user["id"])


@router.get("/{trip_id}", response_model=TripPublic)
async def read_trip(trip_id: str, user: CurrentTraveler, database: Database) -> TripPublic:
    """Read one saved trip only when the traveler owns it."""

    trip = await get_owned_trip(database, user["id"], trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


@router.put("/{trip_id}", response_model=TripPublic)
async def replace_trip(
    trip_id: str,
    payload: TripWrite,
    user: CurrentTraveler,
    database: Database,
) -> TripPublic:
    """Replace one saved trip only when the traveler owns it."""

    trip = await update_owned_trip(database, user["id"], trip_id, payload)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found or invalid city places")
    return trip


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_trip(
    trip_id: str,
    user: CurrentTraveler,
    database: Database,
) -> Response:
    """Delete one saved trip only when the traveler owns it."""

    if not await delete_owned_trip(database, user["id"], trip_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
