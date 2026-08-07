from fastapi import APIRouter, Depends

from app.dependencies.identity import get_current_user
from app.dependencies.services import get_screen_service
from app.dependencies.redis import get_redis_service
from app.schemas.screen import Screen
from app.schemas.user import User
from app.services.screen_service import ScreenService
from app.services.redis_service import RedisService, cache_key

router = APIRouter()


@router.get("/screens/{screen_id}", response_model=Screen)
async def get_screen(
    screen_id: str,
    user: User = Depends(get_current_user),
    service: ScreenService = Depends(get_screen_service),
    redis: RedisService = Depends(get_redis_service),
) -> Screen:
    key = cache_key("tenant", user.client_slug or "staff", "user", user.id, "screen", screen_id)
    cached = await redis.get_json(key)
    if cached is not None:
        return Screen.model_validate(cached)
    screen = await service.get_for_user(screen_id=screen_id, user=user)
    await redis.set_json(key, screen.model_dump(mode="json"), ttl_seconds=60)
    return screen
