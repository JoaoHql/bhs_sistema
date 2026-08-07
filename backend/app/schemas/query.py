from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


FilterValue = str | int | float | bool | list[str | int | float | bool]


class QueryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    screen_id: str = Field(alias="screenId")
    widget_id: str = Field(alias="widgetId")
    filters: dict[str, FilterValue] = Field(default_factory=dict)
    limit: int = Field(default=100, ge=1, le=500)


class QueryMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    client_slug: str = Field(alias="clientSlug")
    row_count: int = Field(alias="rowCount")
    applied_filters: list[str] = Field(alias="appliedFilters")


class QueryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    screen_id: str = Field(alias="screenId")
    widget_id: str = Field(alias="widgetId")
    data_source_id: str = Field(alias="dataSourceId")
    kind: Literal["chart", "kpi_card", "table"]
    rows: list[dict[str, Any]]
    metadata: QueryMetadata

