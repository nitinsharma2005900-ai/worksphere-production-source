from fastapi import APIRouter, Depends, status
from schemas.analytics_models import CycleTimeRequest, CycleTimeResponse
from processors.metrics_calculator import calculate_cycle_time
from app.auth import verify_internal_auth

router = APIRouter(prefix="/api/v1/analytics", tags=["Cycle Time Analytics"])

@router.post("/cycle-time", response_model=CycleTimeResponse, status_code=status.HTTP_200_OK)
async def get_cycle_time(
    payload: CycleTimeRequest,
    _authenticated: bool = Depends(verify_internal_auth)
):
    """
    Computes average, median, min, max lead/cycle time and breakdown by task priority.
    """
    return calculate_cycle_time(payload.organization_id, payload.tasks)
