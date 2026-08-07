from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.client import Client
from app.schemas.module import Module
from app.schemas.published_version import PublishedVersion
from app.schemas.screen import Screen


class PublishedConfigSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    schema_version: int = Field(alias="schemaVersion")
    client: Client
    version: int
    modules: list[Module]
    screens: list[Screen]
    permissions: dict[str, Any] = Field(default_factory=dict)
    menu_order: list[str] = Field(default_factory=list, alias="menuOrder")
    published_at: datetime | None = Field(default=None, alias="publishedAt")
    published_by: str | None = Field(default=None, alias="publishedBy")


class ConfigDraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    config: dict[str, Any]


class ConfigValidationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    valid: bool
    errors: list[str] = Field(default_factory=list)


class ConfigVersionListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    versions: list[PublishedVersion]


class ConfigVersionActionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    version: PublishedVersion
    validation: ConfigValidationResponse | None = None


class MenuOrderUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    item_ids: list[str] = Field(alias="itemIds", min_length=1)


class MenuOrderResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    item_ids: list[str] = Field(alias="itemIds")


VersionStatus = Literal["draft", "validated", "published", "archived"]
