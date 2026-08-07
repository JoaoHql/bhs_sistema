from pydantic import BaseModel, ConfigDict, Field

from app.schemas.screen import Screen


class Module(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    label: str
    icon: str
    order: int = Field(alias="sortOrder")
    screens: list[Screen]
