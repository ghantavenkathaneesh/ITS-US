"""Service health endpoint."""

from fastapi import APIRouter, HTTPException, Request, status
from pymongo.errors import PyMongoError

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(request: Request) -> dict[str, str]:
    """Report API and optional database connectivity."""

    client = getattr(request.app.state, "mongo", None)
    if client is None:
        return {"status": "ok", "database": "not_configured"}
    try:
        await client.admin.command("ping")
    except Exception:
        return {"status": "degraded", "database": "unavailable"}
    return {"status": "ok", "database": "connected"}


@router.get("/health/live")
async def liveness() -> dict[str, str]:
    """Report that the API process is alive, regardless of database state."""

    return {"status": "ok"}


@router.get("/health/ready")
async def readiness(request: Request) -> dict[str, str]:
    """Report readiness only when MongoDB can answer a ping."""

    client = getattr(request.app.state, "mongo", None)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )
    try:
        await client.admin.command("ping")
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from None
    return {"status": "ready", "database": "connected"}
