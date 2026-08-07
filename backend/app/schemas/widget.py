from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ChartMetric(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    field: str
    label: str
    aggregation: Literal["sum", "count", "avg"]
    format: Literal["currency", "number", "percent"] | None = None


class ChartDimension(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    field: str
    label: str


class ChartConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    workspace_id: str = Field(alias="workspaceId")
    type: Literal["bar", "line", "pie", "kpi"]
    title: str
    description: str
    dimensions: list[ChartDimension]
    metrics: list[ChartMetric]
    options: dict[str, Any] | None = None


class KpiConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    workspace_id: str = Field(alias="workspaceId")
    field: str
    aggregation: Literal["sum", "count", "avg"]
    label: str
    format: Literal["currency", "number"] | None = None


class TableConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    workspace_id: str = Field(alias="workspaceId")
    title: str


class WidgetPresentation(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    layout_preset: Literal[
        "kpi.compact",
        "chart.simple",
        "chart.comparison",
        "chart.detailed",
        "table.compact",
        "table.wide",
    ] = Field(alias="layoutPreset")
    label_policy: Literal["adaptive", "all", "hidden"] | None = Field(default=None, alias="labelPolicy")
    value_format: Literal[
        "auto",
        "number.compact",
        "number.full",
        "currency.compact",
        "currency.full",
        "percent",
    ] | None = Field(default=None, alias="valueFormat")


class Widget(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    type: Literal["chart", "kpi_card", "table"]
    title: str | None = None
    description: str | None = None
    grid_span: Literal[1, 2, 3, 4] | None = Field(default=None, alias="gridSpan")
    presentation: WidgetPresentation | None = None
    data_source_id: str | None = Field(default=None, alias="dataSourceId")
    template_key: str | None = Field(default=None, alias="templateKey")
    binding_id: str | None = Field(default=None, alias="bindingId")
    chart_config: ChartConfig | None = Field(default=None, alias="chartConfig")
    kpi_config: KpiConfig | None = Field(default=None, alias="kpiConfig")
    table_config: TableConfig | None = Field(default=None, alias="tableConfig")
