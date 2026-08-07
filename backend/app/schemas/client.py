from typing import Literal

from pydantic import BaseModel, ConfigDict


class Client(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    slug: str
    status: Literal["active", "inactive", "suspended"]

