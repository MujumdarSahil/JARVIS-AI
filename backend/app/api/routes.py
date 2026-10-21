from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.tasks import router as tasks_router
from backend.app.api.capabilities import router as capabilities_router
from backend.app.api.system import router as system_router

api_router = APIRouter(prefix="/api")

api_router.include_router(health_router)
api_router.include_router(tasks_router)
api_router.include_router(capabilities_router)
api_router.include_router(system_router)
