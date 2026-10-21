import os
from typing import List, Optional
import dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Automatically load .env into os.environ for backend execution
dotenv.load_dotenv(override=False)


class Settings(BaseSettings):
    """JARVIS Backend Configuration Settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "JARVIS"
    app_version: str = "0.2.0-phase2"
    app_env: str = Field(default="development", description="Environment: development, test, production")

    api_host: str = Field(default="127.0.0.1", description="Host to bind FastAPI API server")
    api_port: int = Field(default=8000, description="Port to bind FastAPI API server")
    api_log_level: str = Field(default="info", description="Logging level")

    frontend_origin: str = Field(
        default="http://localhost:3000",
        description="Allowed frontend origin for CORS",
    )

    mongodb_uri: str = Field(
        default="mongodb://127.0.0.1:27017",
        description="MongoDB connection string (local-first)",
    )
    mongodb_database: str = Field(
        default="jarvis",
        description="MongoDB database name",
    )
    mongodb_timeout_ms: int = Field(
        default=3000,
        description="MongoDB server selection timeout in milliseconds",
    )

    # Provider API keys (loaded from .env, never exposed to client)
    groq_api_key: Optional[str] = Field(default=None, alias="GROQ_API_KEY")
    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    open_router_api_key: Optional[str] = Field(default=None, alias="OPEN_ROUTER_API_KEY")
    openrouter_api_key: Optional[str] = Field(default=None, alias="OPENROUTER_API_KEY")

    @property
    def cors_origins(self) -> List[str]:
        origins = [self.frontend_origin]
        # Always allow standard local Next.js origins in development
        for fallback in ["http://localhost:3000", "http://127.0.0.1:3000"]:
            if fallback not in origins:
                origins.append(fallback)
        return origins


settings = Settings()
