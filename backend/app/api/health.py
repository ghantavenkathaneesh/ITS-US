"""Service health endpoint."""

from fastapi import APIRouter, Request

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
