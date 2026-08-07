from typing import Literal

from pydantic import BaseModel, ConfigDict


class DataSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    kind: Literal["tenant_table", "tenant_view", "internal_metric"]
    entity: str
    allowed_fields: list[str]
    allowed_filters: list[str]

