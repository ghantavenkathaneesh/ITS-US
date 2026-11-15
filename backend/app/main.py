"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError

from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.cities import router as cities_router
from app.api.guides import router as guides_router
from app.api.admin import router as admin_router
from app.api.ai import router as ai_router
from app.api.trips import router as trips_router
from app.api.bookings import router as bookings_router
from app.api.messages import router as messages_router
from app.core.config import get_settings
from app.database.mongo import open_mongo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Connect to MongoDB when available and clean up on shutdown."""

    app.state.mongo = None
    client = None
    try:
        client = await open_mongo(settings)
        app.state.mongo = client
    except PyMongoError as error:
        logger.error("MongoDB initialization failed (%s)", type(error).__name__)
        if not settings.allow_degraded_startup:
            raise RuntimeError("MongoDB is required but unavailable") from None
        logger.warning("Starting API in degraded mode because ALLOW_DEGRADED_STARTUP is enabled")
        if client is not None:
            await client.close()
    yield
    if app.state.mongo is not None:
        await app.state.mongo.close()


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(cities_router, prefix=settings.api_prefix)
app.include_router(guides_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(ai_router, prefix=settings.api_prefix)
app.include_router(trips_router, prefix=settings.api_prefix)
app.include_router(bookings_router, prefix=settings.api_prefix)
app.include_router(messages_router, prefix=settings.api_prefix)
