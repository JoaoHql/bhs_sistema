import asyncio

from app.schemas.user import User
from app.schemas.whatsapp import WhatsAppTestDelivery, WhatsAppTestSendRequest
from app.services.whatsapp_provider import WhatsAppSendResult
from app.services.whatsapp_service import WhatsAppService


class FakeProvider:
    def __init__(self) -> None:
        self.calls: list[str] = []

    def ensure_configured(self) -> None:
        return None

    async def send_text(self, phone_e164: str, message: str, *, idempotency_key: str) -> WhatsAppSendResult:
        self.calls.append(idempotency_key)
        return WhatsAppSendResult(success=True, provider_message_id="provider-message")


class FakeRepository:
    def __init__(self) -> None:
        self.delivery = WhatsAppTestDelivery(
            execution_id="11111111-1111-4111-8111-111111111111",
            delivery_id="22222222-2222-4222-8222-222222222222",
            recipient="Admin Gelobel",
            phone_e164="+5573999999999",
            message="Teste",
        )
        self.claimed = False

    async def create_test_delivery(self, **_: str) -> WhatsAppTestDelivery:
        if self.claimed:
            return self.delivery.model_copy(update={"should_send": False, "status": "sent", "provider_message_id": "provider-message"})
        self.claimed = True
        return self.delivery

    async def finalize_test_delivery(self, **_: object) -> None:
        return None


def actor() -> User:
    return User(
        id="usr_gelobel_admin",
        email="admin@gelobel.com.br",
        name="Admin Gelobel",
        client_id="cli_gelobel",
        client_slug="gelobel",
        roles=["admin"],
        allowed_screen_ids=["*"],
    )


def test_duplicate_whatsapp_test_does_not_call_provider_twice() -> None:
    repository = FakeRepository()
    provider = FakeProvider()
    service = WhatsAppService(repository, provider)  # type: ignore[arg-type]
    data = WhatsAppTestSendRequest(message="Teste")

    first = asyncio.run(service.send_test(actor(), "11111111-1111-4111-8111-111111111111", data, idempotency_key="request-idempotency-001", tenant_schema="tenant_gelobel"))
    repeated = asyncio.run(service.send_test(actor(), "11111111-1111-4111-8111-111111111111", data, idempotency_key="request-idempotency-001", tenant_schema="tenant_gelobel"))

    assert first.status == "sent"
    assert repeated.status == "sent"
    assert provider.calls == ["request-idempotency-001"]
