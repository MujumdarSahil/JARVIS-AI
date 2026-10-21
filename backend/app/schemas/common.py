from datetime import datetime, timezone
from typing import Optional, Any, Dict
from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class APIErrorResponse(BaseModel):
    """Standardized API Error Response schema."""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = "ERROR"
    timestamp: datetime = Field(default_factory=utc_now)
