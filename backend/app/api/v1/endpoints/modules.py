from fastapi import APIRouter, Depends

from app.dependencies.identity import get_current_user
from app.dependencies.services import get_module_service
from app.dependencies.redis import get_redis_service
from app.schemas.module import Module
from app.schemas.user import User
from app.services.module_service import ModuleService
from app.services.redis_service import RedisService, cache_key

router = APIRouter()


@router.get("/modules", response_model=list[Module])
async def list_modules(
    user: User = Depends(get_current_user),
    service: ModuleService = Depends(get_module_service),
    redis: RedisService = Depends(get_redis_service),
) -> list[Module]:
    key = cache_key("tenant", user.client_slug or "staff", "user", user.id, "modules")
    cached = await redis.get_json(key)
    if cached is not None:
        return [Module.model_validate(item) for item in cached]
    modules = await service.list_for_user(user)
    await redis.set_json(key, [item.model_dump(mode="json") for item in modules], ttl_seconds=60)
    return modules
