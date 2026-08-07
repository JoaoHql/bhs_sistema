from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict


class ApiError(Exception):
    status_code = 400
    code = "api_error"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class NotFoundError(ApiError):
    status_code = 404
    code = "not_found"


class ForbiddenError(ApiError):
    status_code = 403
    code = "forbidden"


class UnauthorizedError(ApiError):
    status_code = 401
    code = "unauthorized"


class BadRequestError(ApiError):
    status_code = 400
    code = "bad_request"


class ConflictError(ApiError):
    status_code = 409
    code = "conflict"


class UpstreamServiceError(ApiError):
    status_code = 502
    code = "upstream_service_error"


class ServiceUnavailableError(ApiError):
    status_code = 503
    code = "service_unavailable"


class RateLimitError(ApiError):
    status_code = 429
    code = "rate_limit_exceeded"

    def __init__(self, *, limit: int, retry_after: int) -> None:
        self.limit = limit
        self.retry_after = retry_after
        super().__init__("Limite temporario de requisicoes excedido.")


class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str


async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
    request = _
    if request.url.path.startswith(("/api/v1/internal/masters", "/api/v1/tenant/users", "/api/v1/auth/change-password")):
        from app.core.config import get_settings
        from app.services.audit_service import AuditService

        actor = getattr(request.state, "audit_user", None)
        target_id = request.url.path.rstrip("/").split("/")[-1]
        await AuditService(get_settings().database_url or "postgresql://dummy@localhost:5432/dummy").log_action(
            actor_id=actor.id if actor else None,
            client_id=actor.client_id if actor else None,
            action="user_management.denied",
            resource_type="user",
            resource_id=target_id if target_id not in {"masters", "users", "change-password"} else None,
            status="failed",
            metadata={
                "method": request.method,
                "endpoint": request.url.path.split("?")[0],
                "error_code": exc.code,
                "correlation_id": getattr(request.state, "correlation_id", None),
            },
        )
    headers = (
        {
            "Retry-After": str(exc.retry_after),
            "X-RateLimit-Limit": str(exc.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": str(exc.retry_after),
        }
        if isinstance(exc, RateLimitError)
        else None
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(code=exc.code, message=exc.message).model_dump(),
        headers=headers,
    )
