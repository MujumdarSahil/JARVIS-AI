from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ModelProvider(str, Enum):
    GROQ = "groq"
    GEMINI = "gemini"
    OPENROUTER = "openrouter"


class ErrorCategory(str, Enum):
    AUTHENTICATION_ERROR = "authentication_error"
    RATE_LIMIT_OR_QUOTA = "rate_limit_or_quota"
    TIMEOUT = "timeout"
    SERVER_ERROR = "server_error"
    INVALID_RESPONSE = "invalid_response"
    ROUTE_DISALLOWED = "route_disallowed"
    NO_ROUTES_AVAILABLE = "no_routes_available"


class ModelRoute(BaseModel):
    provider: ModelProvider
    model_id: str
    display_name: str
    max_tokens: int = 4096
    is_free: bool = True
    description: str


class ProviderResult(BaseModel):
    success: bool
    content: Optional[str] = None
    provider: ModelProvider
    model_id: str
    attempts: int = 1
    latency_ms: float = 0.0
    error_category: Optional[ErrorCategory] = None
    error_message: Optional[str] = None
    raw_metadata: Optional[Dict[str, Any]] = None
