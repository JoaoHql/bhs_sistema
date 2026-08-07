from fastapi import Depends, Request, Response

from app.core.errors import RateLimitError
from app.dependencies.identity import get_current_user
from app.schemas.user import User
from app.services.redis_service import RedisService, rate_key


def get_redis_service(request: Request) -> RedisService:
    return request.app.state.redis_service


async def enforce_rate_limit(
    request: Request,
    response: Response,
    *,
    scope: str,
    identity: str,
    limit: int,
) -> None:
    service = get_redis_service(request)
    allowed, remaining, retry_after = await service.allow(
        key=rate_key(scope, identity), limit=limit, window_seconds=60
    )
    response.headers["X-RateLimit-Limit"] = str(limit)
    if remaining is not None:
        response.headers["X-RateLimit-Remaining"] = str(remaining)
    else:
        response.headers["X-RateLimit-Mode"] = "degraded"
    if retry_after is not None:
        response.headers["X-RateLimit-Reset"] = str(retry_after)
    if not allowed:
        raise RateLimitError(limit=limit, retry_after=retry_after or 60)


async def rate_limit_query(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
) -> None:
    tenant = request.headers.get("X-Tenant-Slug") or user.client_slug or "staff"
    await enforce_rate_limit(request, response, scope="query", identity=f"{tenant}:{user.id}", limit=60)


async def rate_limit_ai(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
) -> None:
    await enforce_rate_limit(request, response, scope="ai", identity=f"{user.client_slug or 'staff'}:{user.id}", limit=10)


async def rate_limit_whatsapp(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
) -> None:
    await enforce_rate_limit(request, response, scope="whatsapp", identity=f"{user.client_slug or 'staff'}:{user.id}", limit=10)


async def rate_limit_admin(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
) -> None:
    await enforce_rate_limit(request, response, scope="admin", identity=user.id, limit=30)


async def rate_limit_updates(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
) -> None:
    await enforce_rate_limit(request, response, scope="updates", identity=f"{user.client_slug or 'staff'}:{user.id}", limit=10)
