from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.schemas.user import User


class LoginRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    email: EmailStr
    password: str
    client_slug: str | None = Field(default=None, alias="clientSlug")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    password_change_required: bool = False
    user: User
