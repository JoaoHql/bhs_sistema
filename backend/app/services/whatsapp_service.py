from uuid import UUID

from app.repositories.whatsapp_repository import WhatsAppRepositoryProtocol
from app.schemas.user import User
from app.schemas.whatsapp import WhatsAppAutomation, WhatsAppAutomationWrite, WhatsAppBootstrapResponse, WhatsAppExecutionLog
from app.schemas.whatsapp import WhatsAppTestSendRequest, WhatsAppTestSendResponse
from app.services.whatsapp_provider import WhatsAppProvider


class WhatsAppService:
    def __init__(self, repository: WhatsAppRepositoryProtocol, provider: WhatsAppProvider) -> None:
        self.repository = repository
        self.provider = provider

    async def get_bootstrap(self, actor: User, tenant_schema: str) -> WhatsAppBootstrapResponse:
        return await self.repository.get_bootstrap(actor_id=actor.id, client_id=actor.client_id, tenant_schema=tenant_schema)

    async def list_automations(self, actor: User, tenant_schema: str) -> list[WhatsAppAutomation]:
        return await self.repository.list_automations(actor_id=actor.id, client_id=actor.client_id, tenant_schema=tenant_schema)

    async def get_automation(self, actor: User, automation_id: UUID, tenant_schema: str) -> WhatsAppAutomation:
        return await self.repository.get_automation(actor_id=actor.id, client_id=actor.client_id, tenant_schema=tenant_schema, automation_id=str(automation_id))

    async def create_automation(self, actor: User, data: WhatsAppAutomationWrite, tenant_schema: str) -> WhatsAppAutomation:
        return await self.repository.create_automation(actor_id=actor.id, client_id=actor.client_id, tenant_schema=tenant_schema, data=data)

    async def replace_automation(self, actor: User, automation_id: UUID, data: WhatsAppAutomationWrite, tenant_schema: str) -> WhatsAppAutomation:
        return await self.repository.replace_automation(actor_id=actor.id, client_id=actor.client_id, tenant_schema=tenant_schema, automation_id=str(automation_id), data=data)

    async def delete_automation(self, actor: User, automation_id: UUID, tenant_schema: str) -> None:
        await self.repository.delete_automation(actor_id=actor.id, client_id=actor.client_id, tenant_schema=tenant_schema, automation_id=str(automation_id))

    async def delete_execution_log(self, actor: User, automation_id: UUID, delivery_id: UUID, tenant_schema: str) -> None:
        await self.repository.delete_execution_log(
            actor_id=actor.id,
            client_id=actor.client_id,
            tenant_schema=tenant_schema,
            automation_id=str(automation_id),
            delivery_id=str(delivery_id),
        )

    async def list_execution_logs(self, actor: User, automation_id: UUID, tenant_schema: str) -> list[WhatsAppExecutionLog]:
        return await self.repository.list_execution_logs(actor_id=actor.id, client_id=actor.client_id, tenant_schema=tenant_schema, automation_id=str(automation_id))

    async def send_test(self, actor: User, automation_id: UUID, data: WhatsAppTestSendRequest, *, idempotency_key: str, tenant_schema: str) -> WhatsAppTestSendResponse:
        client_id = actor.client_id
        self.provider.ensure_configured()
        delivery = await self.repository.create_test_delivery(
            actor_id=actor.id,
            client_id=client_id,
            tenant_schema=tenant_schema,
            automation_id=str(automation_id),
            message_template=data.message,
            idempotency_key=idempotency_key,
        )
        if not delivery.should_send:
            return WhatsAppTestSendResponse(
                execution_id=delivery.execution_id,
                status=delivery.status,
                provider_message_id=delivery.provider_message_id,
                error=delivery.error,
            )
        result = await self.provider.send_text(delivery.phone_e164, delivery.message, idempotency_key=idempotency_key)
        await self.repository.finalize_test_delivery(
            client_id=client_id,
            tenant_schema=tenant_schema,
            execution_id=delivery.execution_id,
            delivery_id=delivery.delivery_id,
            succeeded=result.success,
            provider_message_id=result.provider_message_id,
            error=result.error_message,
        )
        return WhatsAppTestSendResponse(
            execution_id=delivery.execution_id,
            status="sent" if result.success else "failed",
            provider_message_id=result.provider_message_id,
            error=result.error_message,
        )
