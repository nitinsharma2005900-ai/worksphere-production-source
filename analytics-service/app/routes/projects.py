from fastapi import APIRouter, Depends, status
from schemas.analytics_models import ProjectHealthRequest, ProjectHealthResponse
from processors.metrics_calculator import calculate_project_health
from app.auth import verify_internal_auth

router = APIRouter(prefix="/api/v1/analytics", tags=["Project Analytics"])

@router.post("/project-health", response_model=ProjectHealthResponse, status_code=status.HTTP_200_OK)
async def get_project_health(
    payload: ProjectHealthRequest,
    _authenticated: bool = Depends(verify_internal_auth)
):
    """
    Computes real-time project health, completion rate, overdue risks, and hour variance.
    """
    return calculate_project_health(payload.project_id, payload.organization_id, payload.tasks)
