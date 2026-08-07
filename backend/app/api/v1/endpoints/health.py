from fastapi import APIRouter, Request

from app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def healthcheck() -> HealthResponse:
    return HealthResponse(status="ok", service="bhs-modelo-backend")


@router.get("/health/live", response_model=HealthResponse)
async def liveness() -> HealthResponse:
    return HealthResponse(status="ok", service="bhs-modelo-backend")


@router.get("/health/ready", response_model=ReadinessResponse)
async def readiness(request: Request) -> ReadinessResponse:
    redis = request.app.state.redis_service
    is_ready = await redis.ping()
    metrics = request.app.state.operational_metrics.snapshot() | redis.snapshot()
    return ReadinessResponse(
        status="ok" if is_ready else "degraded",
        service="bhs-modelo-backend",
        redis="ok" if is_ready else "degraded",
        metrics=metrics,
    )
