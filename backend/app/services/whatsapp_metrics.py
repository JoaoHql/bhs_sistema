import json
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from app.core.errors import BadRequestError


TOKEN_PATTERN = re.compile(r"{{\s*(daily|monthly|yearly)\.([a-zA-Z][a-zA-Z0-9_]*)\s*}}")
REFERENCE_FIELD = "periodo_inicio"


def render_whatsapp_template(template: str, snapshots: dict[str, dict[str, Any]]) -> str:
    """Resolve variaveis de metricas usando os snapshots mais recentes do tenant."""
    missing: list[str] = []

    def replace(match: re.Match[str]) -> str:
        period, field = match.groups()
        snapshot = snapshots.get(period)
        if snapshot is None:
            missing.append(match.group(0))
            return match.group(0)
        value = snapshot.get(REFERENCE_FIELD) if field == REFERENCE_FIELD else snapshot.get("metricas", {}).get(field)
        if value is None:
            missing.append(match.group(0))
            return match.group(0)
        return _format_value(field, value, period)

    rendered = TOKEN_PATTERN.sub(replace, template)
    if missing:
        raise BadRequestError(f"Metricas sem valor para: {', '.join(dict.fromkeys(missing))}.")
    return rendered


def normalize_metricas(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        parsed = json.loads(value)
        if isinstance(parsed, dict):
            return parsed
    raise BadRequestError("O campo metricas mais recente nao contem um objeto JSON valido.")


def _format_value(field: str, value: Any, period: str) -> str:
    if field == REFERENCE_FIELD:
        return _format_reference(value, period)
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return str(value)
    if field.endswith("_pct"):
        return f"{_format_number(number)}%"
    if field.startswith(("faturamento_", "devolucao_", "custo_", "preco_total_")):
        return f"R$ {_format_number(number, decimals=2)}"
    return _format_number(number)


def _format_number(value: Decimal, decimals: int | None = None) -> str:
    if decimals is not None:
        value = value.quantize(Decimal("1." + "0" * decimals))
        text = f"{value:,.{decimals}f}"
    else:
        text = f"{value:,.2f}".rstrip("0").rstrip(".")
    return text.replace(",", "X").replace(".", ",").replace("X", ".")


def _format_reference(value: Any, period: str) -> str:
    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, str):
        value = date.fromisoformat(value[:10])
    if not isinstance(value, date):
        return str(value)
    if period == "daily":
        return value.strftime("%d/%m/%Y")
    if period == "monthly":
        return value.strftime("%m/%Y")
    return value.strftime("%Y")
