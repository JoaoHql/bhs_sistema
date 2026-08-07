from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, model_validator

from app.core.authorization import ScreenAccess, UserLevel


PasswordMode = Literal["generated", "defined"]
UserStatus = Literal["active", "inactive"]


class TemporaryPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: PasswordMode
    password: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def validate_password_mode(self) -> "TemporaryPasswordRequest":
        if self.mode == "defined" and not self.password:
            raise ValueError("password e obrigatoria quando mode=defined")
        if self.mode == "generated" and self.password is not None:
            raise ValueError("password nao deve ser enviada quando mode=generated")
        return self


class ResetPasswordRequest(TemporaryPasswordRequest):
    pass


class ScreenPermissionInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    screen_id: str = Field(min_length=1, alias="screenId")
    access: ScreenAccess


class ReplaceScreenPermissionsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    permissions: list[ScreenPermissionInput]


class TenantMasterCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    email: EmailStr
    name: str = Field(min_length=2, max_length=160)
    client_slug: str = Field(min_length=1, alias="clientSlug")
    temporary_password: TemporaryPasswordRequest = Field(alias="temporaryPassword")


class TenantMasterUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=160)
    status: UserStatus | None = None


class TenantUserCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    email: EmailStr
    name: str = Field(min_length=2, max_length=160)
    temporary_password: TemporaryPasswordRequest = Field(alias="temporaryPassword")
    permissions: list[ScreenPermissionInput] = Field(default_factory=list)


class TenantUserUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=160)
    status: UserStatus | None = None


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    current_password: str | None = Field(default=None, alias="currentPassword", max_length=200)
    new_password: str = Field(alias="newPassword", max_length=200)


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=160)
    whatsapp_phone_e164: str | None = Field(
        default=None,
        pattern=r"^\+[1-9][0-9]{7,14}$",
    )


class UserMenuOrderUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    item_ids: list[str] = Field(alias="itemIds", max_length=100)

    @model_validator(mode="after")
    def validate_unique_item_ids(self) -> "UserMenuOrderUpdateRequest":
        if any(not item.strip() for item in self.item_ids):
            raise ValueError("itemIds nao pode conter valores vazios")
        if len(self.item_ids) != len(set(self.item_ids)):
            raise ValueError("itemIds nao pode conter valores duplicados")
        return self


class UserMenuOrderResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    item_ids: list[str] = Field(alias="itemIds")


class OneTimePasswordResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    temporary_password: str = Field(alias="temporaryPassword")
    expires_at: datetime = Field(alias="expiresAt")


class ProvisionedUserResponse(OneTimePasswordResponse):
    user: "ManagedUser"


class User(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    email: EmailStr
    name: str
    client_id: str | None = None
    roles: list[str]
    allowed_screen_ids: list[str]
    is_staff: bool = False
    staff_role: Literal["master"] | None = None
    client_slug: str | None = None
    must_change_password: bool = False
    credentials_version: int = Field(default=1, ge=1)
    whatsapp_phone_e164: str | None = None

    @computed_field
    @property
    def level(self) -> UserLevel:
        if self.is_staff:
            return UserLevel.TEAM
        if "admin" in self.roles:
            return UserLevel.TENANT_MASTER
        return UserLevel.COMMON_USER


class ManagedUser(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    email: EmailStr
    name: str
    status: UserStatus
    is_staff: bool
    staff_role: Literal["master"] | None = None
    client_id: str | None = None
    client_slug: str | None = None
    roles: list[str]
    allowed_screen_ids: list[str]
    permissions: list[ScreenPermissionInput] = Field(default_factory=list)
    must_change_password: bool = False
    credentials_version: int = Field(default=1, ge=1)

    @computed_field
    @property
    def level(self) -> UserLevel:
        if self.is_staff:
            return UserLevel.TEAM
        if "admin" in self.roles:
            return UserLevel.TENANT_MASTER
        return UserLevel.COMMON_USER


ProvisionedUserResponse.model_rebuild()


class CreateManagedUserRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    email: EmailStr
    name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=10, max_length=200)
    is_staff: bool = False
    staff_role: Literal["master"] | None = None
    client_slug: str | None = Field(default=None, alias="clientSlug")
    roles: list[Literal["admin", "operator", "viewer"]] = Field(default_factory=list)
    allowed_screen_ids: list[str] = Field(default_factory=list, alias="allowedScreenIds")


class UpdateManagedUserRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=160)
    password: str | None = Field(default=None, min_length=10, max_length=200)
    status: Literal["active", "inactive"] | None = None
    staff_role: Literal["master"] | None = None
    roles: list[Literal["admin", "operator", "viewer"]] | None = None
    allowed_screen_ids: list[str] | None = Field(default=None, alias="allowedScreenIds")
