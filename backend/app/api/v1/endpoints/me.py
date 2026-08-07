from fastapi import APIRouter, Depends

from app.dependencies.identity import get_current_user
from app.dependencies.services import get_repository
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.schemas.user import ProfileUpdateRequest, User, UserMenuOrderResponse, UserMenuOrderUpdateRequest

router = APIRouter()


@router.get("/me", response_model=User)
async def read_current_user(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=User)
async def update_current_user(
    payload: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> User:
    return await repository.update_current_user_profile(user, payload)


@router.get("/me/preferences/menu-order", response_model=UserMenuOrderResponse)
async def read_current_user_menu_order(
    user: User = Depends(get_current_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> UserMenuOrderResponse:
    return UserMenuOrderResponse(itemIds=await repository.get_current_user_menu_order(user))


@router.put("/me/preferences/menu-order", response_model=UserMenuOrderResponse)
async def update_current_user_menu_order(
    payload: UserMenuOrderUpdateRequest,
    user: User = Depends(get_current_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> UserMenuOrderResponse:
    saved = await repository.update_current_user_menu_order(user, payload.item_ids)
    return UserMenuOrderResponse(itemIds=saved)
