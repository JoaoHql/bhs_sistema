from fastapi import APIRouter, Depends

from app.dependencies.identity import get_current_user, get_tenant_master
from app.dependencies.services import get_audit_service, get_menu_order_service
from app.schemas.config_version import MenuOrderResponse, MenuOrderUpdateRequest
from app.schemas.published_version import PublishedVersion
from app.schemas.user import User
from app.services.audit_service import AuditService
from app.services.menu_order_service import MenuOrderService

router = APIRouter(prefix="/tenant/menu-order", tags=["tenant-menu"])


@router.get("", response_model=MenuOrderResponse)
async def get_menu_order(actor: User = Depends(get_current_user), service: MenuOrderService = Depends(get_menu_order_service)) -> MenuOrderResponse:
    return await service.get_for_user(actor)


@router.put("", response_model=PublishedVersion)
async def publish_menu_order(
    payload: MenuOrderUpdateRequest,
    actor: User = Depends(get_tenant_master),
    service: MenuOrderService = Depends(get_menu_order_service),
    audit: AuditService = Depends(get_audit_service),
) -> PublishedVersion:
    published = await service.publish_for_tenant(actor, payload.item_ids)
    await audit.log_action(
        actor_id=actor.id, client_id=actor.client_id, action="tenant.menu_order.published",
        resource_type="version", resource_id=published.id, status="success",
        metadata={"client_slug": actor.client_slug, "version_num": published.version, "item_ids": payload.item_ids},
    )
    return published
