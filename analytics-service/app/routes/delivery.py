from fastapi import APIRouter, Depends, status
from schemas.analytics_models import DeliveryPerformanceRequest, DeliveryPerformanceResponse
from processors.metrics_calculator import calculate_delivery_performance
from app.auth import verify_internal_auth

router = APIRouter(prefix="/api/v1/analytics", tags=["Delivery Performance"])

@router.post("/delivery", response_model=DeliveryPerformanceResponse, status_code=status.HTTP_200_OK)
async def get_delivery_performance(
    payload: DeliveryPerformanceRequest,
    _authenticated: bool = Depends(verify_internal_auth)
):
    """
    Computes on-time delivery percentages, overdue trends, and average delay days.
    """
    return calculate_delivery_performance(payload.organization_id, payload.tasks)
