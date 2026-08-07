from typing import Any

import pytest

from app.core.errors import ForbiddenError
from app.schemas.client import Client
from app.schemas.published_version import PublishedVersion
from app.schemas.screen import Screen
from app.schemas.template_contract import TenantTemplateBinding, VisualTemplate
from app.schemas.user import User
from app.services.binding_service import BindingService
from app.services.config_validation_service import ConfigValidationService
from app.services.version_service import VersionService


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


def make_config(client: Client, binding_id: str, metric: str = "receita", source_id: str = "vendas") -> dict[str, Any]:
    screen = {
        "id": "demo-vendas",
        "moduleId": "mod-demo-vendas",
        "label": "Vendas",
        "layout": "dashboard",
        "filters": [],
        "components": [
            {
                "id": "wid-receita-canal",
                "type": "chart",
                "title": "Receita por canal",
                "gridSpan": 2,
                "dataSourceId": source_id,
                "templateKey": "receita_por_canal",
                "bindingId": binding_id,
                "chartConfig": {
                    "id": "chart-receita-canal",
                    "workspaceId": source_id,
                    "type": "bar",
                    "title": "Receita por canal",
                    "description": "",
                    "dimensions": [{"field": "canal", "label": "Canal"}],
                    "metrics": [{"field": metric, "label": "Receita", "aggregation": "sum", "format": "currency"}],
                    "options": {"showLegend": False},
                },
            }
        ],
    }
    return {
        "schemaVersion": 1,
        "client": client.model_dump(),
        "version": 2,
        "modules": [{"id": "mod-demo-vendas", "label": "Vendas", "icon": "BarChart3", "sortOrder": 1, "screens": [screen]}],
        "screens": [screen],
        "permissions": {"requiredRoles": ["viewer"]},
    }


class BindingValidationRepository:
    def __init__(self) -> None:
        self.client = Client(id="cli_bhs", slug="bhs-demo", name="BHS Demo", status="active")
        self.versions = [
            PublishedVersion(id="ver_1", client_id=self.client.id, version=1, status="published", config=make_config(self.client, "bind_ok"))
        ]
        self.binding_status = "active"

    async def get_current_user(self, email: str | None = None, client_slug: str | None = None) -> User:
        return User(id="usr_admin", email=email or "admin@bhs.demo", name="Admin", client_id=self.client.id, roles=["admin"], allowed_screen_ids=["*"])

    async def get_client_by_slug(self, client_slug: str) -> Client | None:
        return self.client if client_slug == self.client.slug else None

    async def get_version(self, client_slug: str, version: int) -> PublishedVersion | None:
        return next((item for item in self.versions if item.version == version), None)

    async def create_draft(self, client_slug: str, config: dict[str, Any]) -> PublishedVersion:
        item = PublishedVersion(id="ver_2", client_id=self.client.id, version=2, status="draft", config=config)
        self.versions.append(item)
        return item

    async def mark_validated(self, client_slug: str, version: int, user_id: str, errors: list[str]) -> PublishedVersion:
        return self._replace(version, status="validated", validation_errors=errors, validated_by=user_id)

    async def mark_validation_failed(self, client_slug: str, version: int, errors: list[str]) -> PublishedVersion:
        return self._replace(version, status="draft", validation_errors=errors)

    async def publish_version(self, client_slug: str, version: int, user_id: str) -> PublishedVersion:
        return self._replace(version, status="published", published_by=user_id)

    async def get_validation_catalog(self, client_slug: str) -> dict[str, Any]:
        return {
            "modules": {"mod-demo-vendas"},
            "screens": {"demo-vendas": "mod-demo-vendas"},
            "data_sources": {
                "vendas": {"allowed_fields": {"canal", "receita"}, "allowed_filters": {"canal"}},
                "ds_vendas_uuid": {"allowed_fields": {"canal", "receita"}, "allowed_filters": {"canal"}},
            },
            "template_bindings": {
                "bind_ok": {
                    "client_id": self.client.id,
                    "status": self.binding_status,
                    "data_source_id": "ds_vendas_uuid",
                    "data_source_key": "vendas",
                    "template_key": "receita_por_canal",
                }
            },
        }

    async def list_modules(self, client_id: str) -> list[Any]:
        return []

    async def get_screen(self, client_id: str, screen_id: str) -> Screen | None:
        return None

    async def list_versions(self, client_slug: str) -> list[PublishedVersion]:
        return self.versions

    async def rollback_version(self, client_slug: str, version: int, user_id: str) -> PublishedVersion:
        return self._replace(version, status="published")

    async def archive_version(self, client_slug: str, version: int) -> PublishedVersion:
        return self._replace(version, status="archived")

    def _replace(self, version: int, **updates: Any) -> PublishedVersion:
        for index, item in enumerate(self.versions):
            if item.version == version:
                updated = item.model_copy(update=updates)
                self.versions[index] = updated
                return updated
        raise AssertionError("version not found")


def test_same_template_generates_different_widgets_by_client() -> None:
    service = BindingService()
    template = make_template()
    bhs = make_binding("bind_bhs", "cli_bhs", "vendas", "canal", "receita")
    acme = make_binding("bind_acme", "cli_acme", "sales", "channel", "net_revenue")

    bhs_widget = service.to_widget(template, bhs)
    acme_widget = service.to_widget(template, acme)

    assert bhs_widget.chart_config is not None
    assert acme_widget.chart_config is not None
    assert bhs_widget.chart_config.metrics[0].field == "receita"
    assert acme_widget.chart_config.metrics[0].field == "net_revenue"
    assert bhs_widget.data_source_id == "vendas"
    assert acme_widget.data_source_id == "sales"


def test_binding_field_outside_allowlist_is_invalid() -> None:
    service = BindingService()
    template = make_template()
    binding = make_binding("bind_bad", "cli_bhs", "vendas", "canal", "valor_secreto")

    errors = service.validate_binding(
        template,
        binding,
        {"data_sources": {"vendas": {"allowed_fields": {"canal", "receita"}, "allowed_filters": {"canal"}}}},
    )

    assert "Binding bind_bad usa campo nao permitido: valor_secreto." in errors


@pytest.mark.anyio
async def test_inactive_binding_does_not_publish() -> None:
    repository = BindingValidationRepository()
    repository.binding_status = "disabled"
    service = VersionService(repository, ConfigValidationService(repository))
    user = await repository.get_current_user(client_slug="bhs-demo")

    draft = await service.create_draft("bhs-demo", make_config(repository.client, "bind_ok"), user)
    version, validation = await service.validate_version("bhs-demo", draft.version, user)

    assert validation.valid is False
    assert version.status == "draft"
    assert "Widget wid-receita-canal usa binding nao ativo: bind_ok." in validation.errors
    with pytest.raises(ForbiddenError):
        await service.publish_version("bhs-demo", draft.version, user)


@pytest.mark.anyio
async def test_binding_validation_accepts_data_source_uuid() -> None:
    repository = BindingValidationRepository()
    service = VersionService(repository, ConfigValidationService(repository))
    user = await repository.get_current_user(client_slug="bhs-demo")

    draft = await service.create_draft("bhs-demo", make_config(repository.client, "bind_ok", source_id="ds_vendas_uuid"), user)
    version, validation = await service.validate_version("bhs-demo", draft.version, user)

    assert validation.valid is True
    assert version.status == "validated"
