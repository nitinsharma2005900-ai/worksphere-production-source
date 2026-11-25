from fastapi import APIRouter, Depends, status
from schemas.analytics_models import WorkloadRequest, WorkloadResponse
from processors.metrics_calculator import calculate_workload
from app.auth import verify_internal_auth

router = APIRouter(prefix="/api/v1/analytics", tags=["Workload Analytics"])

@router.post("/workload", response_model=WorkloadResponse, status_code=status.HTTP_200_OK)
async def get_team_workload(
    payload: WorkloadRequest,
    _authenticated: bool = Depends(verify_internal_auth)
):
    """
    Computes team member utilization, task distribution, and capacity analysis.
    """
    return calculate_workload(payload.organization_id, payload.tasks)
