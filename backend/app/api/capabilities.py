from fastapi import APIRouter
from backend.app.schemas.capabilities import CapabilityListResponse
from backend.app.capabilities.registry import get_all_capabilities

router = APIRouter(prefix="/capabilities", tags=["Capabilities"])


@router.get("", response_model=CapabilityListResponse)
async def list_capabilities():
    """
    Returns the catalog of all capabilities, clearly distinguishing
    Phase 1 implemented capabilities from planned capabilities in future phases.
    """
    caps = get_all_capabilities()
    return CapabilityListResponse(
        capabilities=caps,
        total=len(caps),
    )
