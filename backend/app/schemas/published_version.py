from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class PublishedVersion(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    client_id: str
    version: int
    status: Literal["draft", "validated", "published", "archived"]
    config: dict[str, Any] | None = None
    validation_errors: list[str] = Field(default_factory=list, alias="validationErrors")
    validated_by: str | None = Field(default=None, alias="validatedBy")
    validated_at: datetime | None = Field(default=None, alias="validatedAt")
    published_by: str | None = None
    published_at: datetime | None = None
    archived_at: datetime | None = Field(default=None, alias="archivedAt")
