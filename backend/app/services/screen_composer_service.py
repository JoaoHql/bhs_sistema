from datetime import datetime, timezone
from typing import Any

from app.schemas.client import Client
from app.schemas.module import Module
from app.schemas.screen import Screen
from app.schemas.template_contract import (
    PublishedConfigSnapshotV2,
    ScreenInstance,
    TenantTemplateBinding,
    VisualTemplate,
)
from app.services.binding_service import BindingService


class ScreenComposerService:
    def __init__(self, binding_service: BindingService | None = None) -> None:
        self.binding_service = binding_service or BindingService()

    def compose_v2(
        self,
        client: Client,
        screen_instances: list[ScreenInstance],
        templates_by_id: dict[str, VisualTemplate],
        bindings_by_id: dict[str, TenantTemplateBinding],
    ) -> PublishedConfigSnapshotV2:
        published_screens = [screen for screen in screen_instances if screen.status == "published"]
        screens = [
            self._compose_screen_instance(screen, client, templates_by_id, bindings_by_id)
            for screen in sorted(published_screens, key=lambda item: item.screen_key)
        ]
        modules = self._compose_modules(screens)
        return PublishedConfigSnapshotV2(
            version=2,
            client_id=client.id,
            client_slug=client.slug,
            modules=modules,
            screens=screens,
        )

    def compose_frontend_snapshot(
        self,
        client: Client,
        version: int,
        screen_instances: list[ScreenInstance],
        templates_by_id: dict[str, VisualTemplate],
        bindings_by_id: dict[str, TenantTemplateBinding],
        published_by: str | None = None,
    ) -> dict[str, Any]:
        snapshot_v2 = self.compose_v2(client, screen_instances, templates_by_id, bindings_by_id)
        modules = [Module.model_validate(module).model_dump(by_alias=True) for module in snapshot_v2.modules]
        screens = [Screen.model_validate(screen).model_dump(by_alias=True) for screen in snapshot_v2.screens]
        return {
            "schemaVersion": 1,
            "client": client.model_dump(),
            "version": version,
            "modules": modules,
            "screens": screens,
            "permissions": {"requiredRoles": ["viewer"]},
            "publishedAt": datetime.now(timezone.utc).isoformat(),
            "publishedBy": published_by,
        }

    def _compose_screen_instance(
        self,
        screen: ScreenInstance,
        client: Client,
        templates_by_id: dict[str, VisualTemplate],
        bindings_by_id: dict[str, TenantTemplateBinding],
    ) -> dict[str, Any]:
        if screen.client_id != client.id:
            raise ValueError(f"Tela {screen.id} pertence a outro cliente.")

        widgets = []
        for instance in sorted(screen.widgets, key=lambda item: item.sort_order):
            binding = bindings_by_id.get(instance.binding_id)
            if binding is None:
                raise ValueError(f"Widget {instance.id} usa binding inexistente: {instance.binding_id}.")
            if binding.client_id != client.id:
                raise ValueError(f"Widget {instance.id} usa binding de outro cliente.")
            if binding.status != "active":
                raise ValueError(f"Widget {instance.id} usa binding nao ativo: {binding.id}.")
            template = templates_by_id.get(binding.template_id)
            if template is None:
                raise ValueError(f"Binding {binding.id} usa template inexistente: {binding.template_id}.")
            widgets.append(self.binding_service.to_widget(template, binding, instance).model_dump(by_alias=True))

        return {
            "id": screen.screen_key,
            "moduleId": screen.module_key,
            "label": screen.label,
            "layout": screen.layout.get("type", "dashboard"),
            "filters": screen.layout.get("filters", []),
            "components": widgets,
        }

    def _compose_modules(self, screens: list[dict[str, Any]]) -> list[dict[str, Any]]:
        modules: dict[str, dict[str, Any]] = {}
        for index, screen in enumerate(screens, start=1):
            module_key = screen["moduleId"]
            module = modules.setdefault(
                module_key,
                {
                    "id": module_key,
                    "label": self._label_from_key(module_key),
                    "icon": "LayoutDashboard",
                    "sortOrder": index,
                    "screens": [],
                },
            )
            module["screens"].append(screen)
        return list(modules.values())

    def _label_from_key(self, key: str) -> str:
        return " ".join(part.capitalize() for part in key.replace("_", "-").split("-") if part)
