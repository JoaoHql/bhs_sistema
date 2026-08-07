from pathlib import Path
from typing import Any

import yaml

from app.schemas.config_as_code import ConfigAsCodeSnapshot, ConfigAsCodeTemplateFile, ConfigAsCodeTenantFile
from app.schemas.template_contract import TenantTemplateBinding, VisualTemplate
from app.services.binding_service import BindingService
from app.services.screen_composer_service import ScreenComposerService


class ConfigAsCodeService:
    def __init__(
        self,
        binding_service: BindingService | None = None,
        composer: ScreenComposerService | None = None,
    ) -> None:
        self.binding_service = binding_service or BindingService()
        self.composer = composer or ScreenComposerService(binding_service=self.binding_service)

    def load_yaml(self, path: Path) -> dict[str, Any]:
        with path.open("r", encoding="utf-8") as file:
            data = yaml.safe_load(file) or {}
        if not isinstance(data, dict):
            raise ValueError(f"YAML invalido: {path}")
        return data

    def load_templates_dir(self, templates_dir: Path) -> list[VisualTemplate]:
        templates: list[VisualTemplate] = []
        for path in sorted(templates_dir.glob("*.yaml")):
            parsed = ConfigAsCodeTemplateFile.model_validate(self.load_yaml(path))
            templates.extend(parsed.templates)
        return templates

    def load_tenant_file(self, tenant_file: Path) -> ConfigAsCodeTenantFile:
        return ConfigAsCodeTenantFile.model_validate(self.load_yaml(tenant_file))

    def build_snapshot(
        self,
        tenant: ConfigAsCodeTenantFile,
        templates: list[VisualTemplate],
        version: int = 1,
        published_by: str | None = "config-as-code",
    ) -> ConfigAsCodeSnapshot:
        templates_by_id = {template.id: template for template in templates}
        bindings_by_id = {binding.id: binding for binding in tenant.bindings}
        errors = self.validate_against_catalog(tenant, templates_by_id)

        if errors:
            return ConfigAsCodeSnapshot(
                tenant=tenant,
                templates=templates,
                snapshot_v2={},
                frontend_snapshot={},
                errors=errors,
            )

        snapshot_v2 = self.composer.compose_v2(
            tenant.client,
            tenant.screens,
            templates_by_id,
            bindings_by_id,
        )
        frontend_snapshot = self.composer.compose_frontend_snapshot(
            tenant.client,
            version,
            tenant.screens,
            templates_by_id,
            bindings_by_id,
            published_by=published_by,
        )
        return ConfigAsCodeSnapshot(
            tenant=tenant,
            templates=templates,
            snapshot_v2=snapshot_v2.model_dump(by_alias=True),
            frontend_snapshot=frontend_snapshot,
            errors=[],
        )

    def validate_against_catalog(
        self,
        tenant: ConfigAsCodeTenantFile,
        templates_by_id: dict[str, VisualTemplate],
    ) -> list[str]:
        catalog = {
            "data_sources": {
                source.id: {
                    "allowed_fields": source.allowed_fields,
                    "allowed_filters": source.allowed_filters,
                }
                for source in tenant.data_sources
            }
        }

        errors: list[str] = []
        for binding in tenant.bindings:
            errors.extend(self._validate_binding_tenant(tenant.client.id, binding))
            template = templates_by_id.get(binding.template_id)
            if template is None:
                errors.append(f"Binding {binding.id} usa template inexistente: {binding.template_id}.")
                continue
            errors.extend(self.binding_service.validate_binding(template, binding, catalog))
        return errors

    def _validate_binding_tenant(self, client_id: str, binding: TenantTemplateBinding) -> list[str]:
        if binding.client_id != client_id:
            return [f"Binding {binding.id} pertence a outro cliente."]
        return []
