from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import utc_now


class DatabaseHealth(BaseModel):
    status: str = Field(description="'connected', 'disconnected', or 'error'")
    database: str
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = Field(description="'ok', 'degraded', or 'unhealthy'")
    app: str
    version: str
    environment: str
    timestamp: datetime = Field(default_factory=utc_now)
    services: Dict[str, Any]


class ReadinessResponse(BaseModel):
    ready: bool
    status: str
    timestamp: datetime = Field(default_factory=utc_now)
    details: Dict[str, Any]
