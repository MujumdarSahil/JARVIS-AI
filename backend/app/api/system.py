from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.database.connection import check_database_health
from backend.app.schemas.system import SystemStatusResponse

router = APIRouter(prefix="/system", tags=["System Status"])


@router.get("/status", response_model=SystemStatusResponse)
async def get_system_status():
    """
    Returns live diagnostic information regarding the API, database connectivity,
    and target hardware constraints.
    """
    db_health = await check_database_health()

    return SystemStatusResponse(
        version=settings.app_version,
        environment=settings.app_env,
        api={
            "status": "online",
            "host": settings.api_host,
            "port": settings.api_port,
            "cors_origins": settings.cors_origins,
            "log_level": settings.api_log_level,
        },
        database=db_health,
        hardware_target={
            "cpu": "Intel i5",
            "ram": "8 GB",
            "free_disk": "~90 GB",
            "local_first": True,
        },
    )
