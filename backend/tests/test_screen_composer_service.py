import pytest

from app.schemas.client import Client
from app.schemas.config_version import PublishedConfigSnapshot
from app.schemas.template_contract import ScreenInstance, TenantTemplateBinding, VisualTemplate
from app.services.screen_composer_service import ScreenComposerService


def make_template() -> VisualTemplate:
    return VisualTemplate.model_validate(
        {
            "id": "tpl_sales_channel",
            "key": "receita_por_canal",
            "name": "Receita por canal",
            "template_type": "chart",
            "visual_type": "bar",
            "semantic_requirements": {
                "dimensions": [{"key": "channel", "label": "Canal", "types": ["text", "category"]}],
                "metrics": [{"key": "revenue", "label": "Receita", "types": ["currency"], "aggregations": ["sum"], "format": "currency"}],
                "filters": [],
            },
            "default_options": {"showLegend": False},
            "status": "active",
        }
    )


def make_binding(binding_id: str, client_id: str, source: str, channel: str, revenue: str) -> TenantTemplateBinding:
    return TenantTemplateBinding.model_validate(
        {
            "id": binding_id,
            "client_id": client_id,
            "template_id": "tpl_sales_channel",
            "data_source_id": source,
            "field_mapping": {"fields": {"channel": channel, "revenue": revenue}, "filters": {}},
            "default_title": "Receita por canal",
            "status": "active",
        }
    )


def make_screen(client_id: str, screen_key: str = "vendas-geral", binding_id: str = "bind_a") -> ScreenInstance:
    return ScreenInstance.model_validate(
        {
            "id": f"scr_{client_id}",
            "client_id": client_id,
            "module_key": "mod-vendas",
            "screen_key": screen_key,
            "label": "Vendas",
            "layout": {"type": "dashboard"},
            "status": "published",
            "widgets": [
                {
                    "id": "wid-receita-canal",
                    "screen_instance_id": f"scr_{client_id}",
                    "binding_id": binding_id,
                    "widget_key": "receita-canal",
                    "grid_span": 2,
                    "sort_order": 1,
                }
            ],
        }
    )


def test_team_creates_screen_for_tenant_a_and_snapshot_v2() -> None:
    client_a = Client(id="cli_a", slug="tenant-a", name="Tenant A", status="active")
    template = make_template()
    binding = make_binding("bind_a", client_a.id, "vendas", "canal", "receita")
    service = ScreenComposerService()

    snapshot = service.compose_v2(client_a, [make_screen(client_a.id)], {template.id: template}, {binding.id: binding})

    assert snapshot.client_id == client_a.id
    assert snapshot.client_slug == client_a.slug
    assert len(snapshot.screens) == 1
    assert snapshot.screens[0]["components"][0]["bindingId"] == "bind_a"
    assert snapshot.screens[0]["components"][0]["dataSourceId"] == "vendas"


def test_tenant_b_remains_without_screen() -> None:
    client_b = Client(id="cli_b", slug="tenant-b", name="Tenant B", status="active")
    service = ScreenComposerService()

    snapshot = service.compose_v2(client_b, [], {}, {})

    assert snapshot.client_id == client_b.id
    assert snapshot.modules == []
    assert snapshot.screens == []


def test_tenant_a_cannot_compose_widget_from_tenant_b_binding() -> None:
    client_a = Client(id="cli_a", slug="tenant-a", name="Tenant A", status="active")
    template = make_template()
    foreign_binding = make_binding("bind_b", "cli_b", "vendas", "canal", "receita")
    service = ScreenComposerService()

    with pytest.raises(ValueError, match="binding de outro cliente"):
        service.compose_v2(client_a, [make_screen(client_a.id, binding_id="bind_b")], {template.id: template}, {foreign_binding.id: foreign_binding})


def test_frontend_snapshot_preserves_current_contract_for_rollback_flow() -> None:
    client_a = Client(id="cli_a", slug="tenant-a", name="Tenant A", status="active")
    template = make_template()
    binding = make_binding("bind_a", client_a.id, "vendas", "canal", "receita")
    service = ScreenComposerService()

    snapshot = service.compose_frontend_snapshot(
        client=client_a,
        version=2,
        screen_instances=[make_screen(client_a.id)],
        templates_by_id={template.id: template},
        bindings_by_id={binding.id: binding},
        published_by="usr_admin",
    )

    parsed = PublishedConfigSnapshot.model_validate(snapshot)
    assert parsed.schema_version == 1
    assert parsed.client.id == client_a.id
    assert parsed.screens[0].components[0].binding_id == "bind_a"
