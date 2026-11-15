"""Authenticated AI trip planning endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.dependencies import get_database, require_roles
from app.core.config import get_settings
from app.schemas.trip_planner import TripPlanRequest, TripPlanResponse
from app.services.trip_planner import (
    CityCatalogUnavailable,
    CityNotFound,
    PlannerUnavailable,
    PlannerRateLimited,
    create_trip_plan,
)

router = APIRouter(prefix="/ai", tags=["AI trip planning"])
CurrentTraveler = Annotated[dict[str, Any], Depends(require_roles("traveler"))]
Database = Annotated[AsyncDatabase[Any], Depends(get_database)]


@router.post("/plan", response_model=TripPlanResponse)
async def plan_trip(
    payload: TripPlanRequest,
    _traveler: CurrentTraveler,
    database: Database,
) -> TripPlanResponse:
    """Create a non-persistent itinerary from published city places."""

    try:
        return await create_trip_plan(database, get_settings(), payload, _traveler["id"])
    except PlannerRateLimited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another trip plan.",
        ) from None
    except CityNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active city not found",
        ) from None
    except CityCatalogUnavailable:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This city has no published places available for trip planning yet.",
        ) from None
    except PlannerUnavailable:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trip planning is unavailable right now. Please try again later.",
        ) from None
