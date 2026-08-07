from datetime import datetime, time
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


WhatsAppPeriod = Literal["daily", "monthly", "yearly"]


class WhatsAppVariable(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    field_name: str
    display_name: str
    value_type: str
    semantic_role: str
    description: str


class WhatsAppVariableGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")

    period: WhatsAppPeriod
    label: str
    source_key: str
    grain: str
    variables: list[WhatsAppVariable]


class WhatsAppRecipient(BaseModel):
    model_config = ConfigDict(extra="forbid")

    membership_id: str
    user_id: str
    name: str
    email: EmailStr
    phone_e164: str | None
    is_master: bool


class WhatsAppBootstrapResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timezone: str
    variable_groups: list[WhatsAppVariableGroup]
    recipients: list[WhatsAppRecipient]


WhatsAppAutomationStatus = Literal["draft", "active", "paused"]


class WhatsAppAutomationWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=160)
    message_template: str = Field(min_length=1, max_length=10000)
    status: WhatsAppAutomationStatus = "draft"
    local_times: list[time] = Field(min_length=1, max_length=24)
    recipient_membership_ids: list[UUID] = Field(min_length=1, max_length=500)

    @field_validator("name", "message_template")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("O valor nao pode ser vazio.")
        return value

    @field_validator("local_times")
    @classmethod
    def validate_local_times(cls, value: list[time]) -> list[time]:
        if len(value) != len(set(value)):
            raise ValueError("Valores duplicados nao sao permitidos.")
        if any(item.tzinfo is not None for item in value):
            raise ValueError("Os horarios devem ser locais, sem fuso embutido.")
        return value

    @field_validator("recipient_membership_ids")
    @classmethod
    def reject_duplicate_recipients(cls, value: list[UUID]) -> list[UUID]:
        if len(value) != len(set(value)):
            raise ValueError("Destinatarios duplicados nao sao permitidos.")
        return value


class WhatsAppAutomation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    message_template: str
    status: WhatsAppAutomationStatus
    local_times: list[time]
    recipient_membership_ids: list[str]
    created_at: datetime
    updated_at: datetime


class WhatsAppExecutionLog(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    execution_id: str
    dispatch_id: str
    recipient: str
    sent_at: datetime
    status: Literal["sent", "failed", "pending", "test"]
    summary: str
    message: str | None = None
    error: str | None = None


class WhatsAppTestSendRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=10000)

    @field_validator("message")
    @classmethod
    def reject_blank_message(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("A mensagem não pode ser vazia.")
        return value


class WhatsAppTestDelivery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    execution_id: str
    delivery_id: str
    recipient: str
    phone_e164: str
    message: str
    status: Literal["pending", "sent", "failed"] = "pending"
    provider_message_id: str | None = None
    error: str | None = None
    should_send: bool = True


class WhatsAppTestSendResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    execution_id: str
    status: Literal["pending", "sent", "failed"]
    provider_message_id: str | None = None
    error: str | None = None
