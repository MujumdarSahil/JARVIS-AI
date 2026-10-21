import asyncio
import time
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError
from backend.app.core.config import settings
from backend.app.core.logging import logger

_client: Optional[AsyncIOMotorClient] = None
_client_loop: Optional[asyncio.AbstractEventLoop] = None


def get_client() -> AsyncIOMotorClient:
    """
    Returns the shared AsyncIOMotorClient instance.
    Re-creates client if the asyncio event loop has changed (e.g. across test runs).
    """
    global _client, _client_loop
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if (
        _client is None
        or _client_loop is None
        or _client_loop != current_loop
        or (current_loop and current_loop.is_closed())
    ):
        logger.info(f"Connecting to MongoDB at {settings.mongodb_uri}")
        _client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=settings.mongodb_timeout_ms,
            connectTimeoutMS=settings.mongodb_timeout_ms,
        )
        _client_loop = current_loop

    return _client


def get_database() -> AsyncIOMotorDatabase:
    """Returns the primary JARVIS database handle."""
    client = get_client()
    return client[settings.mongodb_database]


async def close_client() -> None:
    """Closes the MongoDB client connection cleanly."""
    global _client, _client_loop
    if _client is not None:
        logger.info("Closing MongoDB connection")
        _client.close()
        _client = None
        _client_loop = None


async def check_database_health() -> Dict[str, Any]:
    """
    Pings MongoDB to determine whether the database is online and reachable.
    Does not crash if MongoDB is down; accurately returns status.
    """
    start_time = time.perf_counter()
    try:
        client = get_client()
        await client.admin.command("ping")
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "connected",
            "database": settings.mongodb_database,
            "latency_ms": latency_ms,
            "error": None,
        }
    except (ServerSelectionTimeoutError, PyMongoError) as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.warning(f"MongoDB health check failed: {e}")
        return {
            "status": "disconnected",
            "database": settings.mongodb_database,
            "latency_ms": latency_ms,
            "error": "MongoDB unavailable or timed out",
        }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(f"Unexpected error during MongoDB check: {e}")
        return {
            "status": "error",
            "database": settings.mongodb_database,
            "latency_ms": latency_ms,
            "error": str(e),
        }
