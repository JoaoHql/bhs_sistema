from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.dependencies.identity import get_current_user
from app.dependencies.services import get_whatsapp_repository, get_query_repository
from app.main import app
from app.repositories.mock_query_repository import MockQueryRepository
from app.schemas.user import User
from app.schemas.whatsapp import (
    WhatsAppAutomation,
    WhatsAppAutomationWrite,
    WhatsAppBootstrapResponse,
    WhatsAppExecutionLog,
    WhatsAppRecipient,
    WhatsAppVariable,
    WhatsAppVariableGroup,
)


class FakeWhatsAppRepository:
    calls: list[tuple[str, str]] = []
    automations: dict[str, WhatsAppAutomation]

    def __init__(self) -> None:
        self.calls = []
        self.automations = {}

    async def get_bootstrap(self, *, actor_id: str, client_id: str, tenant_schema: str) -> WhatsAppBootstrapResponse:
        self.calls.append((actor_id, client_id))
        return WhatsAppBootstrapResponse(
            timezone="America/Bahia",
            variable_groups=[WhatsAppVariableGroup(
                period="daily",
                label="Dados diarios",
                source_key="whatsapp_metricas_diarias",
                grain="Uma linha por dia.",
                variables=[WhatsAppVariable(
                    key="daily.faturamento_atual",
                    field_name="faturamento_atual",
                    display_name="Faturamento do dia",
                    value_type="currency",
                    semantic_role="metric",
                    description="Valor consolidado de faturamento do dia.",
                )],
            )],
            recipients=[WhatsAppRecipient(
                membership_id="membership-gelobel-master",
                user_id="usr_gelobel_admin",
                name="Admin Gelobel",
                email="admin@gelobel.com.br",
                phone_e164=None,
                is_master=True,
            )],
        )

    async def list_automations(self, *, actor_id: str, client_id: str, tenant_schema: str) -> list[WhatsAppAutomation]:
        self.calls.append((actor_id, client_id))
        return list(self.automations.values())

    async def get_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> WhatsAppAutomation:
        self.calls.append((actor_id, client_id))
        return self.automations[automation_id]

    async def create_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, data: WhatsAppAutomationWrite) -> WhatsAppAutomation:
        self.calls.append((actor_id, client_id))
        now = datetime.now(timezone.utc)
        saved = WhatsAppAutomation(
            id="11111111-1111-4111-8111-111111111111", name=data.name, message_template=data.message_template,
            status=data.status, local_times=data.local_times,
            recipient_membership_ids=[str(value) for value in data.recipient_membership_ids],
            created_at=now, updated_at=now,
        )
        self.automations[saved.id] = saved
        return saved

    async def replace_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str, data: WhatsAppAutomationWrite) -> WhatsAppAutomation:
        saved = await self.create_automation(actor_id=actor_id, client_id=client_id, tenant_schema=tenant_schema, data=data)
        updated = saved.model_copy(update={"id": automation_id})
        self.automations.pop(saved.id)
        self.automations[automation_id] = updated
        return updated

    async def delete_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> None:
        self.calls.append((actor_id, client_id))
        self.automations.pop(automation_id, None)

    async def list_execution_logs(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> list[WhatsAppExecutionLog]:
        self.calls.append((actor_id, client_id))
        return [WhatsAppExecutionLog(
            id="33333333-3333-4333-8333-333333333333",
            execution_id="44444444-4444-4444-8444-444444444444",
            dispatch_id=automation_id,
            recipient="Admin Gelobel",
            sent_at=datetime.now(timezone.utc),
            status="test",
            summary="Resumo comercial",
            message="Faturamento: R$ 2.200.000,00",
        )]


def identity(*, role: str = "admin", slug: str = "gelobel") -> User:
    return User(
        id="usr_gelobel_admin" if slug == "gelobel" else "usr_demo_admin",
        email="admin@gelobel.com.br" if slug == "gelobel" else "admin@bhs.demo",
        name="Tenant User",
        client_id="cli_gelobel" if slug == "gelobel" else "cli_bhs_demo",
        client_slug=slug,
        roles=[role],
        allowed_screen_ids=["*"],
    )


def test_gelobel_master_reads_whatsapp_bootstrap(client: TestClient) -> None:
    repository = FakeWhatsAppRepository()
    repository.calls = []
    app.dependency_overrides[get_whatsapp_repository] = lambda: repository
    app.dependency_overrides[get_query_repository] = lambda: MockQueryRepository()
    app.dependency_overrides[get_current_user] = lambda: identity()
    try:
        response = client.get("/api/v1/tenant/whatsapp/bootstrap")
    finally:
        app.dependency_overrides.pop(get_whatsapp_repository, None)
        app.dependency_overrides.pop(get_query_repository, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    body = response.json()
    assert body["timezone"] == "America/Bahia"
    assert body["variable_groups"][0]["variables"][0]["key"] == "daily.faturamento_atual"
    assert body["recipients"][0]["is_master"] is True
    assert body["recipients"][0]["phone_e164"] is None
    assert repository.calls == [("usr_gelobel_admin", "cli_gelobel")]


def test_whatsapp_bootstrap_rejects_non_master(client: TestClient) -> None:
    repository = FakeWhatsAppRepository()
    repository.calls = []
    app.dependency_overrides[get_whatsapp_repository] = lambda: repository
    app.dependency_overrides[get_query_repository] = lambda: MockQueryRepository()
    try:
        app.dependency_overrides[get_current_user] = lambda: identity(role="viewer")
        common = client.get("/api/v1/tenant/whatsapp/bootstrap")
    finally:
        app.dependency_overrides.pop(get_whatsapp_repository, None)
        app.dependency_overrides.pop(get_query_repository, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert common.status_code == 403
    assert repository.calls == []


def test_whatsapp_bootstrap_allows_any_tenant_master(client: TestClient) -> None:
    repository = FakeWhatsAppRepository()
    repository.calls = []
    app.dependency_overrides[get_whatsapp_repository] = lambda: repository
    app.dependency_overrides[get_query_repository] = lambda: MockQueryRepository()
    try:
        app.dependency_overrides[get_current_user] = lambda: identity(slug="bhs-demo")
        other_master = client.get("/api/v1/tenant/whatsapp/bootstrap")
    finally:
        app.dependency_overrides.pop(get_whatsapp_repository, None)
        app.dependency_overrides.pop(get_query_repository, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert other_master.status_code == 200
    assert len(repository.calls) == 1


def automation_payload() -> dict:
    return {
        "name": "Resumo comercial",
        "message_template": "Faturamento: {{daily.faturamento_atual}}",
        "status": "active",
        "local_times": ["08:00:00", "17:30:00"],
        "recipient_membership_ids": ["22222222-2222-4222-8222-222222222222"],
    }


def test_master_crud_whatsapp_automation(client: TestClient) -> None:
    repository = FakeWhatsAppRepository()
    app.dependency_overrides[get_whatsapp_repository] = lambda: repository
    app.dependency_overrides[get_query_repository] = lambda: MockQueryRepository()
    app.dependency_overrides[get_current_user] = lambda: identity()
    try:
        created = client.post("/api/v1/tenant/whatsapp/automations", json=automation_payload())
        listed = client.get("/api/v1/tenant/whatsapp/automations")
        detail = client.get("/api/v1/tenant/whatsapp/automations/11111111-1111-4111-8111-111111111111")
        updated_payload = automation_payload() | {"name": "Resumo atualizado", "local_times": ["09:00:00"]}
        updated = client.put("/api/v1/tenant/whatsapp/automations/11111111-1111-4111-8111-111111111111", json=updated_payload)
        deleted = client.delete("/api/v1/tenant/whatsapp/automations/11111111-1111-4111-8111-111111111111")
    finally:
        app.dependency_overrides.pop(get_whatsapp_repository, None)
        app.dependency_overrides.pop(get_query_repository, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert created.status_code == 201
    assert listed.json()[0]["id"] == "11111111-1111-4111-8111-111111111111"
    assert detail.json()["message_template"].startswith("Faturamento")
    assert updated.json()["name"] == "Resumo atualizado"
    assert deleted.status_code == 204 and deleted.content == b""


def test_master_reads_whatsapp_execution_history(client: TestClient) -> None:
    repository = FakeWhatsAppRepository()
    app.dependency_overrides[get_whatsapp_repository] = lambda: repository
    app.dependency_overrides[get_query_repository] = lambda: MockQueryRepository()
    app.dependency_overrides[get_current_user] = lambda: identity()
    try:
        response = client.get("/api/v1/tenant/whatsapp/automations/11111111-1111-4111-8111-111111111111/executions")
    finally:
        app.dependency_overrides.pop(get_whatsapp_repository, None)
        app.dependency_overrides.pop(get_query_repository, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    assert response.json()[0]["status"] == "test"
    assert response.json()[0]["message"] == "Faturamento: R$ 2.200.000,00"


def test_automation_contract_rejects_blank_duplicate_and_empty_selection(client: TestClient) -> None:
    repository = FakeWhatsAppRepository()
    app.dependency_overrides[get_whatsapp_repository] = lambda: repository
    app.dependency_overrides[get_query_repository] = lambda: MockQueryRepository()
    app.dependency_overrides[get_current_user] = lambda: identity()
    try:
        invalid = automation_payload() | {
            "name": "   ",
            "local_times": ["08:00:00", "08:00:00"],
            "recipient_membership_ids": [],
        }
        response = client.post("/api/v1/tenant/whatsapp/automations", json=invalid)
    finally:
        app.dependency_overrides.pop(get_whatsapp_repository, None)
        app.dependency_overrides.pop(get_query_repository, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 422
    assert repository.calls == []


def test_automation_endpoints_reject_non_master(client: TestClient) -> None:
    repository = FakeWhatsAppRepository()
    repository.calls = []
    app.dependency_overrides[get_whatsapp_repository] = lambda: repository
    app.dependency_overrides[get_query_repository] = lambda: MockQueryRepository()
    try:
        app.dependency_overrides[get_current_user] = lambda: identity(role="viewer")
        common = client.get("/api/v1/tenant/whatsapp/automations")
    finally:
        app.dependency_overrides.pop(get_whatsapp_repository, None)
        app.dependency_overrides.pop(get_query_repository, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert common.status_code == 403
    assert repository.calls == []
