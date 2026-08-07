from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.filters import FilterConfig
from app.schemas.widget import Widget


class Screen(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    module_id: str = Field(alias="moduleId")
    label: str
    layout: Literal["dashboard", "canvas"]
    filters: list[FilterConfig]
    components: list[Widget]
