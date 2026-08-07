from typing import Any

from pydantic import ValidationError

from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.schemas.config_version import PublishedConfigSnapshot


class ConfigValidationService:
    def __init__(self, repository: ConfigRepositoryProtocol) -> None:
        self.repository = repository

    async def validate(self, client_slug: str, config: dict[str, Any]) -> list[str]:
        errors: list[str] = []

        try:
            snapshot = PublishedConfigSnapshot.model_validate(config)
        except ValidationError as exc:
            return [f"Contrato invalido: {error['loc']} - {error['msg']}" for error in exc.errors()]

        client = await self.repository.get_client_by_slug(client_slug)
        if client is None or client.status != "active":
            errors.append("Cliente inexistente ou inativo.")
            return errors
        if snapshot.client.slug != client_slug or snapshot.client.id != client.id:
            errors.append("Snapshot aponta para cliente diferente.")

        if not snapshot.modules:
            errors.append("Configuracao precisa ter ao menos um modulo.")
        if not snapshot.screens:
            errors.append("Configuracao precisa ter ao menos uma tela.")

        catalog = await self.repository.get_validation_catalog(client_slug)
        module_ids = {module.id for module in snapshot.modules}
        screen_ids = {screen.id for screen in snapshot.screens}

        for module in snapshot.modules:
            if module.id not in catalog["modules"]:
                errors.append(f"Modulo inexistente: {module.id}.")
            for screen in module.screens:
                if screen.id not in screen_ids:
                    errors.append(f"Modulo {module.id} referencia tela fora do snapshot: {screen.id}.")

        for screen in snapshot.screens:
            expected_module = catalog["screens"].get(screen.id)
            if expected_module is None:
                errors.append(f"Tela inexistente: {screen.id}.")
            elif expected_module != screen.module_id:
                errors.append(f"Tela {screen.id} nao pertence ao modulo {screen.module_id}.")
            if screen.module_id not in module_ids:
                errors.append(f"Tela {screen.id} referencia modulo ausente: {screen.module_id}.")

            for filter_config in screen.filters:
                source_errors = self._validate_field(
                    catalog=catalog,
                    source_key=None,
                    field=filter_config.field,
                    allowed_kind="allowed_filters",
                    context=f"Filtro {filter_config.id}",
                )
                errors.extend(source_errors)

            for widget in screen.components:
                if widget.binding_id:
                    binding_errors = self._validate_binding(catalog, client.id, widget)
                    errors.extend(binding_errors)
                source_key = widget.data_source_id
                if not source_key:
                    errors.append(f"Widget {widget.id} sem dataSourceId.")
                    continue
                if source_key not in catalog["data_sources"]:
                    errors.append(f"Widget {widget.id} usa fonte inexistente: {source_key}.")
                    continue
                if widget.chart_config:
                    if widget.chart_config.workspace_id != source_key:
                        errors.append(f"Widget {widget.id} usa workspaceId diferente da fonte.")
                    for dimension in widget.chart_config.dimensions:
                        errors.extend(self._validate_field(catalog, source_key, dimension.field, "allowed_fields", f"Dimensao {dimension.field}"))
                    for metric in widget.chart_config.metrics:
                        errors.extend(self._validate_field(catalog, source_key, metric.field, "allowed_fields", f"Metrica {metric.field}"))
                if widget.kpi_config:
                    if widget.kpi_config.workspace_id != source_key:
                        errors.append(f"Widget {widget.id} usa workspaceId diferente da fonte.")
                    errors.extend(self._validate_field(catalog, source_key, widget.kpi_config.field, "allowed_fields", f"KPI {widget.id}"))

        return errors

    def _validate_binding(self, catalog: dict[str, Any], client_id: str, widget: Any) -> list[str]:
        bindings = catalog.get("template_bindings", {})
        binding = bindings.get(widget.binding_id)
        if binding is None:
            return [f"Widget {widget.id} usa binding inexistente: {widget.binding_id}."]
        if binding.get("client_id") != client_id:
            return [f"Widget {widget.id} usa binding de outro cliente."]
        if binding.get("status") != "active":
            return [f"Widget {widget.id} usa binding nao ativo: {widget.binding_id}."]
        if widget.template_key and binding.get("template_key") != widget.template_key:
            return [f"Widget {widget.id} usa templateKey diferente do binding."]
        binding_sources = {binding.get("data_source_key"), binding.get("data_source_id")}
        if widget.data_source_id and widget.data_source_id not in binding_sources:
            return [f"Widget {widget.id} usa dataSourceId diferente do binding."]
        return []

    def _validate_field(
        self,
        catalog: dict[str, Any],
        source_key: str | None,
        field: str,
        allowed_kind: str,
        context: str,
    ) -> list[str]:
        if source_key is None:
            for source in catalog["data_sources"].values():
                if field in source[allowed_kind]:
                    return []
            return [f"{context} usa campo nao permitido: {field}."]
        source = catalog["data_sources"].get(source_key)
        if source is None:
            return [f"{context} usa fonte inexistente: {source_key}."]
        if field not in source[allowed_kind]:
            return [f"{context} usa campo nao permitido: {field}."]
        return []
