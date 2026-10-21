from typing import Any, Dict
from pydantic import BaseModel, Field


class SystemStatusResponse(BaseModel):
    version: str = Field(..., description="JARVIS system version")
    environment: str = Field(..., description="Runtime environment")
    api: Dict[str, Any] = Field(..., description="API runtime status")
    database: Dict[str, Any] = Field(..., description="Database connectivity status")
    hardware_target: Dict[str, Any] = Field(
        default_factory=lambda: {
            "cpu": "Intel i5",
            "ram": "8 GB",
            "free_disk": "~90 GB",
            "local_first": True,
        },
        description="Target hardware execution constraints",
    )
