"""Traveler-owned guide booking request endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.dependencies import get_database, require_roles
from app.schemas.bookings import BookingPublic, BookingRequest
from app.services.bookings import cancel_owned_booking, create_booking_request, get_owned_booking, list_guide_bookings, list_owned_bookings

router = APIRouter(prefix="/bookings", tags=["booking requests"])
CurrentTraveler = Annotated[dict[str, Any], Depends(require_roles("traveler"))]
CurrentGuide = Annotated[dict[str, Any], Depends(require_roles("guide"))]
Database = Annotated[AsyncDatabase[Any], Depends(get_database)]


@router.post("", response_model=BookingPublic, status_code=status.HTTP_201_CREATED)
async def request_booking(
    payload: BookingRequest,
    user: CurrentTraveler,
    database: Database,
) -> BookingPublic:
    """Send a request to a published guide; this is not a booking confirmation."""

    booking = await create_booking_request(database, user["id"], payload)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published guide not found",
        )
    return booking


@router.get("", response_model=list[BookingPublic])
async def list_my_bookings(user: CurrentTraveler, database: Database) -> list[BookingPublic]:
    """List only the authenticated traveler's booking requests."""

    return await list_owned_bookings(database, user["id"])


@router.get("/guide", response_model=list[BookingPublic])
async def list_requests_for_my_guide_profile(
    user: CurrentGuide, database: Database
) -> list[BookingPublic]:
    """List requests addressed to the signed-in guide's own profile."""

    return await list_guide_bookings(database, user["id"])


@router.get("/{booking_id}", response_model=BookingPublic)
async def read_booking(
    booking_id: str,
    user: CurrentTraveler,
    database: Database,
) -> BookingPublic:
    """Read one booking request only when the traveler owns it."""

    booking = await get_owned_booking(database, user["id"], booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking request not found")
    return booking


@router.post("/{booking_id}/cancel", response_model=BookingPublic)
async def cancel_booking(
    booking_id: str,
    user: CurrentTraveler,
    database: Database,
) -> BookingPublic:
    """Cancel the traveler's request; repeated cancellation is safe and idempotent."""

    booking = await cancel_owned_booking(database, user["id"], booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking request not found")
    return booking
