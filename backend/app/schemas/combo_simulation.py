from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ComboSimulationProduct(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(min_length=1, max_length=180)
    name: str = Field(min_length=1, max_length=500)
    qty: float = Field(ge=0, le=1_000_000)
    cost: float = Field(ge=0, le=1_000_000_000)
    price: float = Field(ge=0, le=1_000_000_000)
    markup: float = Field(ge=-100, le=1_000_000)
    simulated_cost: float | None = Field(default=None, alias="simulatedCost", ge=0, le=1_000_000_000)
    simulated_price: float | None = Field(default=None, alias="simulatedPrice", ge=0, le=1_000_000_000)


class ComboSimulationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    screen_id: str = Field(alias="screenId", min_length=1, max_length=120)
    company: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=160)
    products: list[ComboSimulationProduct] = Field(min_length=1, max_length=3)


class ComboSimulation(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    name: str
    created_at: datetime = Field(alias="createdAt")
    products: list[ComboSimulationProduct]
