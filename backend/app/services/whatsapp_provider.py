from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import Settings
from app.core.errors import BadRequestError


@dataclass(frozen=True, slots=True)
class WhatsAppSendResult:
    success: bool
    http_status: int | None = None
    provider_message_id: str | None = None
    error_message: str | None = None


def _provider_message_id(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None
    for key in ("messageId", "message_id", "id", "key"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, dict) and isinstance(value.get("id"), str):
            return value["id"].strip() or None
    return None


class WhatsAppProvider:
    """Adaptador do contrato Evolution já usado pelo worker disparos.py."""

    def __init__(self, settings: Settings) -> None:
        self.url = settings.whatsapp_api_url
        self.token = settings.whatsapp_api_token
        self.instance = settings.whatsapp_api_instance
        self.timeout = settings.whatsapp_request_timeout_seconds
        self.connect_retries = settings.whatsapp_connect_retries

    async def send_text(self, phone_e164: str, message: str, *, idempotency_key: str) -> WhatsAppSendResult:
        self.ensure_configured()

        try:
            transport = httpx.AsyncHTTPTransport(retries=self.connect_retries)
            async with httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(self.timeout)) as client:
                response = await client.post(
                    f"{self.url.rstrip('/')}/send/text",
                    headers={
                        "apikey": self.token,
                        "instance": self.instance,
                        "Content-Type": "application/json",
                        "Idempotency-Key": idempotency_key,
                    },
                    json={"number": phone_e164.removeprefix("+"), "text": message},
                )
        except httpx.HTTPError as exc:
            return WhatsAppSendResult(success=False, error_message=str(exc))

        if response.status_code not in {200, 201}:
            return WhatsAppSendResult(success=False, http_status=response.status_code, error_message=f"Provider respondeu status {response.status_code}.")
        try:
            payload = response.json()
        except ValueError:
            payload = None
        return WhatsAppSendResult(success=True, http_status=response.status_code, provider_message_id=_provider_message_id(payload))

    def ensure_configured(self) -> None:
        if not self.url or not self.token or not self.instance:
            raise BadRequestError("Canal WhatsApp não configurado. Defina BHS_WHATSAPP_API_URL, BHS_WHATSAPP_API_TOKEN e BHS_WHATSAPP_API_INSTANCE.")
