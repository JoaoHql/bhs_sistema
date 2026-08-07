from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AreaUpdateStatus(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    area: str
    label: str
    last_updated_at: datetime | None = Field(default=None, alias="lastUpdatedAt")
    rows_count: int | None = Field(default=None, alias="rowsCount")
    status: Literal["ok", "stale", "error"]


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    area: str | None = None


class UpdateRun(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    area: str
    status: str
    trigger: str
    rows_affected: int | None = Field(default=None, alias="rowsAffected")
    error_message: str | None = Field(default=None, alias="errorMessage")
    started_at: datetime = Field(alias="startedAt")
    finished_at: datetime | None = Field(default=None, alias="finishedAt")


class RefreshResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run: UpdateRun
    areas: list[AreaUpdateStatus]
