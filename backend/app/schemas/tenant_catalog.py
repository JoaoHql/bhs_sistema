from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.client import Client
from app.schemas.data_source_field import DataSourceField


class TenantCatalogColumn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    data_type: str
    is_nullable: bool


class TenantCatalogObject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    object_type: Literal["table", "view"]
    columns: list[TenantCatalogColumn]
    registered: bool = False
    data_source_key: str | None = None


class TenantCatalogDataSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    key: str
    kind: Literal["tenant_table", "tenant_view", "internal_metric"]
    entity: str
    allowed_fields: list[str]
    allowed_filters: list[str]
    active: bool
    fields: list[DataSourceField] = Field(default_factory=list)


class TenantCatalog(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client: Client
    tenant_schema: str
    objects: list[TenantCatalogObject]
    data_sources: list[TenantCatalogDataSource]


class DataSourceCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    entity: str
    kind: Literal["tenant_table", "tenant_view"]
    allowed_fields: list[str]
    allowed_filters: list[str] = []
    active: bool = True
