from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.database.connection import get_client, close_client, check_database_health
from backend.app.api.routes import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager to handle setup and cleanup."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version} ({settings.app_env})")
    
    # Perform initial connectivity check to MongoDB without blocking startup
    try:
        db_status = await check_database_health()
        logger.info(f"Initial MongoDB status: {db_status['status']}")
    except Exception as e:
        logger.warning(f"Could not verify initial MongoDB status: {e}")
        
    yield
    
    # Clean shutdown
    logger.info("Shutting down JARVIS backend application...")
    await close_client()
    logger.info("JARVIS backend stopped cleanly.")


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title=f"{settings.app_name} API",
        version=settings.app_version,
        description="Local-first personal AI assistant - Phase 1 Foundation API",
        lifespan=lifespan,
    )

    # CORS configuration restricted to local origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Global Validation Exception Handler
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            content={
                "error": "Validation Error",
                "detail": exc.errors()[0]["msg"] if exc.errors() else "Invalid request payload",
                "code": "VALIDATION_FAILED",
            },
        )

    # Root diagnostic info
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "app": settings.app_name,
            "version": settings.app_version,
            "status": "online",
            "phase": "Phase 2 - Core Assistant (LangGraph + Free Models)",
            "docs_url": "/docs",
        }

    # Include all API endpoints
    app.include_router(api_router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        log_level=settings.api_log_level,
        reload=False,
    )
