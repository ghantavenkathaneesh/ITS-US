"""Public destination and discovery endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.dependencies import get_database
from app.schemas.city import CityCatalog, CityPublic
from app.services.cities import get_city_catalog, list_active_cities

router = APIRouter(prefix="/cities", tags=["cities"])


@router.get("", response_model=list[CityPublic])
async def list_cities(
    database: Annotated[AsyncDatabase[Any], Depends(get_database)],
) -> list[CityPublic]:
    """List active destinations from city data in MongoDB."""

    return await list_active_cities(database)


@router.get("/{slug}/catalog", response_model=CityCatalog)
async def read_city_catalog(
    slug: Annotated[str, Path(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)],
    database: Annotated[AsyncDatabase[Any], Depends(get_database)],
) -> CityCatalog:
    """Return a city's active details and explicitly published catalog entries."""

    catalog = await get_city_catalog(database, slug)
    if catalog is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    return catalog
