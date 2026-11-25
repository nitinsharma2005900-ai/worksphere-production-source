from fastapi import APIRouter, status
from datetime import datetime, timezone
import os

router = APIRouter(tags=["Health & Diagnostics"])

START_TIME = datetime.now(timezone.utc)

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    now = datetime.now(timezone.utc)
    uptime_seconds = (now - START_TIME).total_seconds()
    return {
        "status": "healthy",
        "service": "worksphere-analytics",
        "timestamp": now.isoformat(),
        "uptime_seconds": round(uptime_seconds, 2),
        "version": "1.0.0"
    }

@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    # Verify process health
    return {
        "status": "ready",
        "service": "worksphere-analytics",
        "pid": os.getpid(),
        "ready": True
    }
