from typing import Any

from app.schemas.template_contract import ScreenWidgetInstance, TenantTemplateBinding, VisualTemplate
from app.schemas.widget import ChartConfig, ChartDimension, ChartMetric, KpiConfig, TableConfig, Widget
from app.services.template_service import TemplateService


class BindingService:
    def __init__(self, template_service: TemplateService | None = None) -> None:
        self.template_service = template_service or TemplateService()

    def validate_binding(
        self,
        template: VisualTemplate,
        binding: TenantTemplateBinding,
        catalog: dict[str, Any],
        enforce_status: bool = True,
    ) -> list[str]:
        errors = self.template_service.validate_template(template)
        if enforce_status and binding.status not in {"validated", "active"}:
            errors.append(f"Binding {binding.id} nao esta validado.")
        if binding.template_id != template.id:
            errors.append(f"Binding {binding.id} aponta para template diferente.")

        source = catalog.get("data_sources", {}).get(binding.data_source_id)
        if source is None:
            errors.append(f"Binding {binding.id} usa fonte inexistente: {binding.data_source_id}.")
            return errors

        allowed_fields = set(source.get("allowed_fields", set()))
        allowed_filters = set(source.get("allowed_filters", set()))

        for key in self.template_service.required_field_keys(template):
            mapped = binding.field_mapping.fields.get(key)
            if not mapped:
                errors.append(f"Binding {binding.id} sem campo obrigatorio: {key}.")
            elif mapped not in allowed_fields:
                errors.append(f"Binding {binding.id} usa campo nao permitido: {mapped}.")

        for key in self.template_service.required_filter_keys(template):
            mapped = binding.field_mapping.filters.get(key)
            if not mapped:
                errors.append(f"Binding {binding.id} sem filtro obrigatorio: {key}.")
            elif mapped not in allowed_filters:
                errors.append(f"Binding {binding.id} usa filtro nao permitido: {mapped}.")

        return errors

    def to_widget(
        self,
        template: VisualTemplate,
        binding: TenantTemplateBinding,
        instance: ScreenWidgetInstance | None = None,
    ) -> Widget:
        widget_id = instance.id if instance else f"wid-{binding.id}"
        title = (instance.title_override if instance else None) or binding.default_title or template.name
        description = (instance.description_override if instance else None) or binding.default_description or template.description
        grid_span = instance.grid_span if instance else 1
        options = dict(template.default_options)
        if instance:
            options.update(instance.options_override)

        if template.template_type == "kpi_card":
            metric = template.semantic_requirements.metrics[0]
            field = binding.field_mapping.fields[metric.key]
            return Widget(
                id=widget_id,
                type="kpi_card",
                title=title,
                description=description,
                grid_span=grid_span,
                data_source_id=binding.data_source_id,
                template_key=template.key,
                binding_id=binding.id,
                kpi_config=KpiConfig(
                    workspace_id=binding.data_source_id,
                    field=field,
                    aggregation=(metric.aggregations or ["sum"])[0],
                    label=metric.label,
                    format=metric.format if metric.format in {"currency", "number"} else None,
                ),
            )

        if template.template_type == "table":
            return Widget(
                id=widget_id,
                type="table",
                title=title,
                description=description,
                grid_span=grid_span,
                data_source_id=binding.data_source_id,
                template_key=template.key,
                binding_id=binding.id,
                table_config=TableConfig(workspace_id=binding.data_source_id, title=title),
            )

        chart_type = template.visual_type if template.visual_type in {"bar", "line", "pie"} else "bar"
        dimensions = [
            ChartDimension(field=binding.field_mapping.fields[item.key], label=item.label)
            for item in template.semantic_requirements.dimensions
            if item.key in binding.field_mapping.fields
        ]
        metrics = [
            ChartMetric(
                field=binding.field_mapping.fields[item.key],
                label=item.label,
                aggregation=(item.aggregations or ["sum"])[0],
                format=item.format if item.format in {"currency", "number", "percent"} else None,
            )
            for item in template.semantic_requirements.metrics
            if item.key in binding.field_mapping.fields
        ]
        return Widget(
            id=widget_id,
            type="chart",
            title=title,
            description=description,
            grid_span=grid_span,
            data_source_id=binding.data_source_id,
            template_key=template.key,
            binding_id=binding.id,
            chart_config=ChartConfig(
                id=f"chart-{widget_id}",
                workspace_id=binding.data_source_id,
                type=chart_type,
                title=title,
                description=description,
                dimensions=dimensions,
                metrics=metrics,
                options=options,
            ),
        )
