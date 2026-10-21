from fastapi import APIRouter, status, Response
from backend.app.core.config import settings
from backend.app.database.connection import check_database_health
from backend.app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter(tags=["Health & Readiness"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Liveness probe.
    Reports operational status of the FastAPI backend and connected dependencies.
    """
    db_health = await check_database_health()
    overall_status = "ok" if db_health.get("status") == "connected" else "degraded"

    return HealthResponse(
        status=overall_status,
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        services={
            "api": {"status": "ok", "host": settings.api_host, "port": settings.api_port},
            "mongodb": db_health,
        },
    )


@router.get("/ready", response_model=ReadinessResponse)
async def readiness_check(response: Response):
    """
    Readiness probe.
    Returns HTTP 200 if MongoDB is connected and ready to persist tasks.
    Returns HTTP 503 if MongoDB is unavailable.
    """
    db_health = await check_database_health()
    is_ready = db_health.get("status") == "connected"

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadinessResponse(
            ready=False,
            status="unready",
            details={
                "message": "Database is not connected or timed out",
                "mongodb": db_health,
            },
        )

    return ReadinessResponse(
        ready=True,
        status="ready",
        details={
            "message": "All backend services operational",
            "mongodb": db_health,
        },
    )
