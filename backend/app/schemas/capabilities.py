from typing import List, Optional
from pydantic import BaseModel, Field


class Capability(BaseModel):
    id: str
    name: str
    category: str
    description: str
    status: str = Field(description="'implemented', 'planned', 'in_progress'")
    phase: str
    icon: Optional[str] = None
    details: Optional[str] = None


class CapabilityListResponse(BaseModel):
    capabilities: List[Capability]
    total: int
