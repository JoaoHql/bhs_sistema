from uuid import UUID

from fastapi import APIRouter, Depends, Header, Response, status

from app.dependencies.identity import get_tenant_master
from app.dependencies.services import get_whatsapp_service, get_query_repository
from app.dependencies.redis import rate_limit_whatsapp
from app.repositories.query_repository import QueryRepositoryProtocol
from app.schemas.user import User
from app.schemas.whatsapp import WhatsAppAutomation, WhatsAppAutomationWrite, WhatsAppBootstrapResponse, WhatsAppExecutionLog, WhatsAppTestSendRequest, WhatsAppTestSendResponse
from app.services.whatsapp_service import WhatsAppService


router = APIRouter(prefix="/tenant/whatsapp", tags=["tenant-whatsapp"], dependencies=[Depends(rate_limit_whatsapp)])


async def _resolve_whatsapp_schema(actor: User, query_repo: QueryRepositoryProtocol) -> str:
    return await query_repo.get_validated_tenant_schema(actor.client_slug)


@router.get("/bootstrap", response_model=WhatsAppBootstrapResponse)
async def get_whatsapp_bootstrap(
    actor: User = Depends(get_tenant_master),
    service: WhatsAppService = Depends(get_whatsapp_service),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
) -> WhatsAppBootstrapResponse:
    return await service.get_bootstrap(actor, await _resolve_whatsapp_schema(actor, query_repo))


@router.get("/automations", response_model=list[WhatsAppAutomation])
async def list_whatsapp_automations(
    actor: User = Depends(get_tenant_master),
    service: WhatsAppService = Depends(get_whatsapp_service),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
) -> list[WhatsAppAutomation]:
    return await service.list_automations(actor, await _resolve_whatsapp_schema(actor, query_repo))


@router.get("/automations/{automation_id}", response_model=WhatsAppAutomation)
async def get_whatsapp_automation(
    automation_id: UUID,
    actor: User = Depends(get_tenant_master),
    service: WhatsAppService = Depends(get_whatsapp_service),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
) -> WhatsAppAutomation:
    return await service.get_automation(actor, automation_id, await _resolve_whatsapp_schema(actor, query_repo))


@router.get("/automations/{automation_id}/executions", response_model=list[WhatsAppExecutionLog])
async def list_whatsapp_execution_logs(
    automation_id: UUID,
    actor: User = Depends(get_tenant_master),
    service: WhatsAppService = Depends(get_whatsapp_service),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
) -> list[WhatsAppExecutionLog]:
    return await service.list_execution_logs(actor, automation_id, await _resolve_whatsapp_schema(actor, query_repo))


@router.delete("/automations/{automation_id}/executions/{delivery_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_whatsapp_execution_log(
    automation_id: UUID,
    delivery_id: UUID,
    actor: User = Depends(get_tenant_master),
    service: WhatsAppService = Depends(get_whatsapp_service),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
) -> Response:
    await service.delete_execution_log(actor, automation_id, delivery_id, await _resolve_whatsapp_schema(actor, query_repo))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/automations/{automation_id}/send-test", response_model=WhatsAppTestSendResponse)
async def send_whatsapp_test(
    automation_id: UUID,
    data: WhatsAppTestSendRequest,
    idempotency_key: str = Header(min_length=16, max_length=128),
    actor: User = Depends(get_tenant_master),
    service: WhatsAppService = Depends(get_whatsapp_service),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
) -> WhatsAppTestSendResponse:
    return await service.send_test(actor, automation_id, data, idempotency_key=idempotency_key, tenant_schema=await _resolve_whatsapp_schema(actor, query_repo))


@router.post("/automations", response_model=WhatsAppAutomation, status_code=status.HTTP_201_CREATED)
async def create_whatsapp_automation(
    data: WhatsAppAutomationWrite,
    actor: User = Depends(get_tenant_master),
    service: WhatsAppService = Depends(get_whatsapp_service),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
) -> WhatsAppAutomation:
    return await service.create_automation(actor, data, await _resolve_whatsapp_schema(actor, query_repo))


@router.put("/automations/{automation_id}", response_model=WhatsAppAutomation)
async def replace_whatsapp_automation(
    automation_id: UUID,
    data: WhatsAppAutomationWrite,
    actor: User = Depends(get_tenant_master),
    service: WhatsAppService = Depends(get_whatsapp_service),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
) -> WhatsAppAutomation:
    return await service.replace_automation(actor, automation_id, data, await _resolve_whatsapp_schema(actor, query_repo))


@router.delete("/automations/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_whatsapp_automation(
    automation_id: UUID,
    actor: User = Depends(get_tenant_master),
    service: WhatsAppService = Depends(get_whatsapp_service),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
) -> Response:
    await service.delete_automation(actor, automation_id, await _resolve_whatsapp_schema(actor, query_repo))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
