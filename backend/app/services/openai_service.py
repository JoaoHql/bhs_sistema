import json
from typing import Any

import httpx

from app.core.config import Settings
from app.core.errors import BadRequestError, UpstreamServiceError


SYSTEM_PROMPT = """You are the AI Layout Assistant for BHS BI. Return only one valid JSON object for an AppModule.
Every component must include presentation with layoutPreset, labelPolicy and valueFormat. Do not include CSS,
coordinates or markdown. Reuse calculated-field IDs when applicable. Supported component types are kpi_card,
chart and table; layouts are dashboard or canvas."""


class OpenAIService:
    def __init__(self, settings: Settings) -> None:
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.timeout = settings.openai_request_timeout_seconds

    async def generate_module(self, *, prompt: str, calculated_fields: list[dict[str, Any]]) -> dict[str, Any]:
        if not self.api_key:
            raise BadRequestError("IA nao configurada neste ambiente.")

        request_prompt = f"{prompt}\n\nCatalogo de formulas atual:\n{calculated_fields}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": request_prompt},
                        ],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"},
                    },
                )
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPError as exc:
            raise UpstreamServiceError("Servico de IA indisponivel.") from exc
        except ValueError as exc:
            raise UpstreamServiceError("Servico de IA retornou resposta invalida.") from exc

        content = payload.get("choices", [{}])[0].get("message", {}).get("content")
        if not isinstance(content, str):
            raise UpstreamServiceError("Servico de IA retornou resposta incompleta.")
        try:
            module = json.loads(content)
        except ValueError as exc:
            raise UpstreamServiceError("Servico de IA retornou JSON invalido.") from exc
        if not isinstance(module, dict):
            raise UpstreamServiceError("Servico de IA retornou modulo invalido.")
        return module
