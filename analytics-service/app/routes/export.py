from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import StreamingResponse
from schemas.analytics_models import ExportStreamRequest, ExportFormat
from processors.stream_processor import StreamProcessor
from app.auth import verify_internal_auth

router = APIRouter(prefix="/api/v1/analytics", tags=["Export Streaming"])

@router.post("/export/stream", status_code=status.HTTP_200_OK)
async def export_streaming_dataset(
    payload: ExportStreamRequest,
    _authenticated: bool = Depends(verify_internal_auth)
):
    """
    Assessment 05: Streams large datasets as CSV or JSON chunks with bounded memory consumption.
    """
    if not payload.records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot export empty dataset"
        )

    if payload.format == ExportFormat.CSV:
        # Determine CSV field names from the first record
        fieldnames = list(payload.records[0].keys())
        generator = StreamProcessor.stream_csv_chunks(payload.records, fieldnames, chunk_size=200)
        return StreamingResponse(
            generator,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=worksphere_export_{payload.organization_id}.csv"}
        )
    else:
        generator = StreamProcessor.stream_json_chunks(payload.records, chunk_size=200)
        return StreamingResponse(
            generator,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=worksphere_export_{payload.organization_id}.json"}
        )
