from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class GenerateModuleRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    prompt: str = Field(min_length=1, max_length=4_000)
    calculated_fields: list[dict[str, Any]] = Field(default_factory=list, alias="calculatedFields", max_length=200)


class GenerateModuleResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    module: dict[str, Any]
