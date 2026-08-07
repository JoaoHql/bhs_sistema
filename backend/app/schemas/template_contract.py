from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


TemplateType = Literal["chart", "kpi_card", "table"]
VisualType = Literal["bar", "line", "pie", "area", "composed", "number", "table"]
TemplateStatus = Literal["draft", "active", "deprecated"]
BindingStatus = Literal["draft", "validated", "active", "disabled"]
ScreenInstanceStatus = Literal["draft", "published", "archived"]


class TemplateRequirement(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    label: str
    types: list[str] = Field(default_factory=list)
    required: bool = True
    aggregations: list[str] = Field(default_factory=list)
    format: str | None = None


class TemplateSemanticRequirements(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dimensions: list[TemplateRequirement] = Field(default_factory=list)
    metrics: list[TemplateRequirement] = Field(default_factory=list)
    filters: list[TemplateRequirement] = Field(default_factory=list)


class VisualTemplate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    key: str
    name: str
    description: str = ""
    template_type: TemplateType
    visual_type: VisualType
    semantic_requirements: TemplateSemanticRequirements
    default_options: dict[str, Any] = Field(default_factory=dict)
    status: TemplateStatus = "draft"


class FieldMapping(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fields: dict[str, str] = Field(default_factory=dict)
    filters: dict[str, str] = Field(default_factory=dict)


class TenantTemplateBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    client_id: str
    template_id: str
    data_source_id: str
    field_mapping: FieldMapping
    default_title: str = ""
    default_description: str = ""
    status: BindingStatus = "draft"
    validation_errors: list[str] = Field(default_factory=list)


class ScreenWidgetInstance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    screen_instance_id: str
    binding_id: str
    widget_key: str
    title_override: str | None = None
    description_override: str | None = None
    grid_span: int = Field(default=1, ge=1, le=4)
    sort_order: int = 0
    options_override: dict[str, Any] = Field(default_factory=dict)


class ScreenInstance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    client_id: str
    module_key: str
    screen_key: str
    label: str
    layout: dict[str, Any] = Field(default_factory=dict)
    status: ScreenInstanceStatus = "draft"
    widgets: list[ScreenWidgetInstance] = Field(default_factory=list)


class PublishedConfigSnapshotV2(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[2] = 2
    client_id: str | None = None
    client_slug: str | None = None
    modules: list[dict[str, Any]] = Field(default_factory=list)
    screens: list[dict[str, Any]] = Field(default_factory=list)


class VisualTemplateUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    name: str
    description: str = ""
    template_type: TemplateType
    visual_type: VisualType
    semantic_requirements: TemplateSemanticRequirements
    default_options: dict[str, Any] = Field(default_factory=dict)
    status: TemplateStatus = "draft"


class TenantTemplateBindingUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template_id: str
    data_source_id: str
    field_mapping: FieldMapping
    default_title: str = ""
    default_description: str = ""
    status: BindingStatus = "draft"
    validation_errors: list[str] = Field(default_factory=list)


class ScreenInstanceUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    module_key: str
    screen_key: str
    label: str
    layout: dict[str, Any] = Field(default_factory=dict)
    status: ScreenInstanceStatus = "draft"
    widgets: list[ScreenWidgetInstance] = Field(default_factory=list)
