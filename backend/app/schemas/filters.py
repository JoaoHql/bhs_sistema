from typing import Literal

from pydantic import BaseModel, ConfigDict


class FilterConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    field: str
    label: str
    type: Literal["text", "number", "date", "select", "multi_select"]
    required: bool = False
    allowed_values: list[str] = []

