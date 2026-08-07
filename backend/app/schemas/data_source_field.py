from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


TechnicalType = Literal["text", "number", "currency", "percent", "date", "datetime", "boolean", "category", "id"]
SemanticRole = Literal["dimension", "metric", "date", "filter", "identifier", "description"]
FieldStatus = Literal["active", "hidden", "deprecated"]


class DataSourceField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    data_source_id: str
    field_name: str
    display_name: str
    technical_type: TechnicalType
    semantic_role: SemanticRole
    business_meaning: str = ""
    synonyms: list[str] = Field(default_factory=list)
    example_values: list[Any] = Field(default_factory=list)
    allowed_aggregations: list[str] = Field(default_factory=list)
    is_filterable: bool = False
    is_groupable: bool = False
    is_sensitive: bool = False
    quality_notes: str = ""
    status: FieldStatus = "active"


class DataSourceFieldUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field_name: str
    display_name: str
    technical_type: TechnicalType
    semantic_role: SemanticRole
    business_meaning: str = ""
    synonyms: list[str] = Field(default_factory=list)
    example_values: list[Any] = Field(default_factory=list)
    allowed_aggregations: list[str] = Field(default_factory=list)
    is_filterable: bool = False
    is_groupable: bool = False
    is_sensitive: bool = False
    quality_notes: str = ""
    status: FieldStatus = "active"
