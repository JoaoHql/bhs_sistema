from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import ApiError, api_error_handler
from app.core.middleware import LoggingAndCorrelationMiddleware, SecurityHeadersMiddleware
from app.services.redis_service import RedisService
from app.services.operational_metrics import OperationalMetrics


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    redis_service = RedisService()
    if settings.redis_url:
        client = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_keepalive=True,
            health_check_interval=30,
        )
        redis_service = RedisService(client)
        try:
            await client.ping()
        except RedisError:
            await client.aclose()
            redis_service = RedisService()
    app.state.redis_service = redis_service
    app.state.operational_metrics = OperationalMetrics()
    try:
        yield
    finally:
        await redis_service.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(LoggingAndCorrelationMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.api_cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "OPTIONS"],
        allow_headers=["*"],
    )

    app.add_exception_handler(ApiError, api_error_handler)
    app.include_router(api_router)
    return app


app = create_app()
