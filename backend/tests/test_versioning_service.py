from typing import Any

import pytest

from app.core.errors import ForbiddenError, NotFoundError
from app.schemas.client import Client
from app.schemas.module import Module
from app.schemas.published_version import PublishedVersion
from app.schemas.screen import Screen
from app.schemas.user import User
from app.services.config_validation_service import ConfigValidationService
from app.services.module_service import ModuleService
from app.services.screen_service import ScreenService
from app.services.permission_service import PermissionService
from app.services.version_service import VersionService
from app.services.menu_order_service import MenuOrderService


def make_config(client: Client, version: int, label: str, screen_id: str = "demo-vendas", metric: str = "revenue") -> dict[str, Any]:
    screen = {
        "id": screen_id,
        "moduleId": "demo-vendas",
        "label": label,
        "layout": "dashboard",
        "filters": [],
        "components": [
            {
                "id": f"wid-{client.slug}-{version}",
                "type": "chart",
                "title": label,
                "gridSpan": 2,
                "dataSourceId": "vendas",
                "chartConfig": {
                    "id": f"chart-{client.slug}-{version}",
                    "workspaceId": "vendas",
                    "type": "bar",
                    "title": label,
                    "description": "Teste",
                    "dimensions": [{"field": "channel", "label": "Canal"}],
                    "metrics": [{"field": metric, "label": "Valor", "aggregation": "sum", "format": "currency"}],
                    "options": {"showLegend": False},
                },
            }
        ],
    }
    return {
        "schemaVersion": 1,
        "client": client.model_dump(),
        "version": version,
        "modules": [{"id": "demo-vendas", "label": label, "icon": "BarChart3", "sortOrder": 1, "screens": [screen]}],
        "screens": [screen],
        "permissions": {"requiredRoles": ["viewer"]},
    }


class InMemoryConfigRepository:
    def __init__(self) -> None:
        self.clients = {
            "bhs-demo": Client(id="cli_bhs", slug="bhs-demo", name="BHS Demo", status="active"),
            "acme-demo": Client(id="cli_acme", slug="acme-demo", name="ACME Demo", status="active"),
        }
        self.versions: dict[str, list[PublishedVersion]] = {
            "bhs-demo": [
                PublishedVersion(
                    id="ver_bhs_1",
                    client_id="cli_bhs",
                    version=1,
                    status="published",
                    config=make_config(self.clients["bhs-demo"], 1, "Painel BHS"),
                )
            ],
            "acme-demo": [
                PublishedVersion(
                    id="ver_acme_1",
                    client_id="cli_acme",
                    version=1,
                    status="published",
                    config=make_config(self.clients["acme-demo"], 1, "Painel ACME", "acme-vendas", "orders_count"),
                )
            ],
        }

    async def get_current_user(self, email: str | None = None, client_slug: str | None = None) -> User:
        client = self.clients[client_slug or "bhs-demo"]
        return User(id="usr_admin", email=email or "admin@bhs.demo", name="Admin", client_id=client.id, roles=["admin"], allowed_screen_ids=["*"])

    async def list_modules(self, client_id: str) -> list[Module]:
        version = self._published_by_client_id(client_id)
        return [] if version is None else [Module.model_validate(module) for module in (version.config or {}).get("modules", [])]

    async def get_screen(self, client_id: str, screen_id: str) -> Screen | None:
        version = self._published_by_client_id(client_id)
        if version is None:
            return None
        for screen in (version.config or {}).get("screens", []):
            if screen["id"] == screen_id:
                return Screen.model_validate(screen)
        return None

    async def get_client_by_slug(self, client_slug: str) -> Client | None:
        return self.clients.get(client_slug)

    async def list_versions(self, client_slug: str) -> list[PublishedVersion]:
        return self.versions[client_slug]

    async def get_version(self, client_slug: str, version: int) -> PublishedVersion | None:
        return next((item for item in self.versions[client_slug] if item.version == version), None)

    async def create_draft(self, client_slug: str, config: dict[str, Any]) -> PublishedVersion:
        next_version = max(item.version for item in self.versions[client_slug]) + 1
        item = PublishedVersion(id=f"ver_{client_slug}_{next_version}", client_id=self.clients[client_slug].id, version=next_version, status="draft", config=config)
        self.versions[client_slug].append(item)
        return item

    async def mark_validated(self, client_slug: str, version: int, user_id: str, errors: list[str]) -> PublishedVersion:
        return self._replace(client_slug, version, status="validated", validation_errors=errors, validated_by=user_id)

    async def mark_validation_failed(self, client_slug: str, version: int, errors: list[str]) -> PublishedVersion:
        return self._replace(client_slug, version, status="draft", validation_errors=errors)

    async def publish_version(self, client_slug: str, version: int, user_id: str) -> PublishedVersion:
        for item in self.versions[client_slug]:
            if item.status == "published":
                self._replace(client_slug, item.version, status="archived")
        return self._replace(client_slug, version, status="published", published_by=user_id)

    async def rollback_version(self, client_slug: str, version: int, user_id: str) -> PublishedVersion:
        return await self.publish_version(client_slug, version, user_id)

    async def archive_version(self, client_slug: str, version: int) -> PublishedVersion:
        return self._replace(client_slug, version, status="archived")

    async def get_validation_catalog(self, client_slug: str) -> dict[str, Any]:
        return {
            "modules": {"demo-vendas"},
            "screens": {"demo-vendas": "demo-vendas", "acme-vendas": "demo-vendas"},
            "data_sources": {"vendas": {"allowed_fields": {"channel", "revenue", "orders_count"}, "allowed_filters": {"channel"}}},
        }

    async def list_clients(self) -> list[Client]:
        return list(self.clients.values())

    def _published_by_client_id(self, client_id: str) -> PublishedVersion | None:

        for versions in self.versions.values():
            for item in versions:
                if item.client_id == client_id and item.status == "published":
                    return item
        return None

    def _replace(self, client_slug: str, version: int, **updates: Any) -> PublishedVersion:
        versions = self.versions[client_slug]
        for index, item in enumerate(versions):
            if item.version == version:
                updated = item.model_copy(update=updates)
                versions[index] = updated
                return updated
        raise NotFoundError("Versao nao encontrada.")


@pytest.mark.anyio
async def test_clients_receive_different_published_configs() -> None:
    repository = InMemoryConfigRepository()
    service = ModuleService(repository)

    bhs_modules = await service.list_for_user(await repository.get_current_user(client_slug="bhs-demo"))
    acme_modules = await service.list_for_user(await repository.get_current_user(email="admin@acme.demo", client_slug="acme-demo"))

    assert bhs_modules[0].label == "Painel BHS"
    assert acme_modules[0].label == "Painel ACME"


@pytest.mark.anyio
async def test_cross_client_screen_is_not_exposed() -> None:
    repository = InMemoryConfigRepository()
    service = ScreenService(repository=repository, permission_service=PermissionService())
    user = await repository.get_current_user(client_slug="bhs-demo")

    with pytest.raises(NotFoundError):
        await service.get_for_user(screen_id="acme-vendas", user=user)


@pytest.mark.anyio
async def test_invalid_draft_does_not_publish() -> None:
    repository = InMemoryConfigRepository()
    service = VersionService(repository, ConfigValidationService(repository))
    user = await repository.get_current_user(client_slug="bhs-demo")
    invalid = make_config(repository.clients["bhs-demo"], 2, "Invalido", metric="campo_inexistente")

    draft = await service.create_draft("bhs-demo", invalid, user)
    version, validation = await service.validate_version("bhs-demo", draft.version, user)

    assert validation.valid is False
    assert version.status == "draft"
    with pytest.raises(ForbiddenError):
        await service.publish_version("bhs-demo", draft.version, user)


@pytest.mark.anyio
async def test_publish_archives_previous_and_rollback_restores() -> None:
    repository = InMemoryConfigRepository()
    service = VersionService(repository, ConfigValidationService(repository))
    user = await repository.get_current_user(client_slug="bhs-demo")
    valid = make_config(repository.clients["bhs-demo"], 2, "Painel BHS v2")

    draft = await service.create_draft("bhs-demo", valid, user)
    validated, validation = await service.validate_version("bhs-demo", draft.version, user)
    published = await service.publish_version("bhs-demo", validated.version, user)

    assert validation.valid is True
    assert published.version == 2
    assert (await repository.get_version("bhs-demo", 1)).status == "archived"

    rollback = await service.rollback_version("bhs-demo", 1, user)

    assert rollback.version == 1
    assert rollback.status == "published"
    assert (await repository.get_version("bhs-demo", 2)).status == "archived"


@pytest.mark.anyio
async def test_tenant_menu_order_is_published_and_rollback_remains_available() -> None:
    repository = InMemoryConfigRepository()
    user = (await repository.get_current_user(client_slug="bhs-demo")).model_copy(update={"client_slug": "bhs-demo"})
    service = MenuOrderService(repository, ConfigValidationService(repository))

    published = await service.publish_for_tenant(user, ["configuracoes", "demo-vendas"])

    assert published.status == "published"
    assert published.config["menuOrder"] == ["configuracoes", "demo-vendas"]
    assert published.config["modules"][0]["sortOrder"] == 2
    rollback = await repository.rollback_version("bhs-demo", 1, user.id)
    assert rollback.version == 1
    assert rollback.status == "published"
    acme_version = await repository.get_version("acme-demo", 1)
    assert acme_version is not None
    assert "menuOrder" not in (acme_version.config or {})


@pytest.mark.anyio
async def test_common_user_cannot_publish_tenant_menu_order() -> None:
    repository = InMemoryConfigRepository()
    user = User(
        id="usr_viewer", email="viewer@bhs.demo", name="Viewer", client_id="cli_bhs", client_slug="bhs-demo",
        roles=["viewer"], allowed_screen_ids=["demo-vendas"],
    )
    service = MenuOrderService(repository, ConfigValidationService(repository))

    with pytest.raises(ForbiddenError):
        await service.publish_for_tenant(user, ["demo-vendas", "configuracoes"])
