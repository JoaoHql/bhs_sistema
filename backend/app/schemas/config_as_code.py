from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.client import Client
from app.schemas.template_contract import ScreenInstance, TenantTemplateBinding, VisualTemplate


class ConfigAsCodeDataSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    key: str
    label: str
    allowed_fields: list[str] = Field(default_factory=list)
    allowed_filters: list[str] = Field(default_factory=list)


class ConfigAsCodeTemplateFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    templates: list[VisualTemplate] = Field(default_factory=list)


class ConfigAsCodeTenantFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client: Client
    data_sources: list[ConfigAsCodeDataSource] = Field(default_factory=list)
    bindings: list[TenantTemplateBinding] = Field(default_factory=list)
    screens: list[ScreenInstance] = Field(default_factory=list)


class ConfigAsCodeSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tenant: ConfigAsCodeTenantFile
    templates: list[VisualTemplate]
    snapshot_v2: dict[str, Any]
    frontend_snapshot: dict[str, Any]
    errors: list[str] = Field(default_factory=list)
