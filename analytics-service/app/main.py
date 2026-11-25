from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import uuid
from app.config import settings
from app.routes import (
    health_router,
    projects_router,
    workload_router,
    cycle_time_router,
    delivery_router,
    export_router
)

app = FastAPI(
    title=settings.APP_NAME,
    description="WorkSphere Dedicated Analytics, Workload, Cycle-Time, and Streaming Microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID & Latency Logging Middleware
@app.middleware("http")
async def add_process_time_and_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    start_time = time.perf_counter()

    response = await call_next(request)

    process_time = time.perf_counter() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Sec"] = f"{process_time:.4f}"
    return response

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred in the analytics engine",
            "details": str(exc) if settings.ENVIRONMENT == "development" else None
        }
    )

# Include Routers
app.include_router(health_router)
app.include_router(projects_router)
app.include_router(workload_router)
app.include_router(cycle_time_router)
app.include_router(delivery_router)
app.include_router(export_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
