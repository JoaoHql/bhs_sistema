from app.schemas.template_contract import TemplateRequirement, VisualTemplate


class TemplateService:
    def validate_template(self, template: VisualTemplate) -> list[str]:
        errors: list[str] = []
        if template.status != "active":
            errors.append(f"Template {template.key} nao esta ativo.")
        if template.template_type == "chart" and not template.semantic_requirements.metrics:
            errors.append(f"Template {template.key} precisa de ao menos uma metrica.")
        if template.template_type == "kpi_card" and len(template.semantic_requirements.metrics) != 1:
            errors.append(f"Template {template.key} KPI precisa de exatamente uma metrica.")
        errors.extend(self._duplicate_keys(template))
        return errors

    def required_field_keys(self, template: VisualTemplate) -> set[str]:
        requirements = template.semantic_requirements.dimensions + template.semantic_requirements.metrics
        return {item.key for item in requirements if item.required}

    def required_filter_keys(self, template: VisualTemplate) -> set[str]:
        return {item.key for item in template.semantic_requirements.filters if item.required}

    def _duplicate_keys(self, template: VisualTemplate) -> list[str]:
        seen: set[str] = set()
        duplicates: set[str] = set()
        requirements: list[TemplateRequirement] = (
            template.semantic_requirements.dimensions
            + template.semantic_requirements.metrics
            + template.semantic_requirements.filters
        )
        for requirement in requirements:
            if requirement.key in seen:
                duplicates.add(requirement.key)
            seen.add(requirement.key)
        return [f"Template {template.key} tem requisito duplicado: {key}." for key in sorted(duplicates)]
