from pydantic import BaseModel, ConfigDict, Field


class VisibleScreen(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    label: str
    visible: bool


class VisibleModule(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    label: str
    visible: bool
    screens: list[VisibleScreen]


class ClientVisibilityResponse(BaseModel):
    client_slug: str = Field(alias="clientSlug")
    modules: list[VisibleModule]


class VisibilityUpdateRequest(BaseModel):
    visible: bool
