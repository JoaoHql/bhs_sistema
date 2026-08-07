import re
from dataclasses import dataclass
from typing import Any, Literal

from app.core.errors import BadRequestError

IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
TENANT_SCHEMA_RE = re.compile(r"^tenant_[a-z0-9_]+$")


@dataclass(frozen=True)
class QuerySpec:
    sql: str
    params: tuple[Any, ...]
    applied_filters: list[str]


def quote_identifier(value: str, *, tenant_schema: bool = False) -> str:
    pattern = TENANT_SCHEMA_RE if tenant_schema else IDENTIFIER_RE
    if not pattern.match(value):
        raise BadRequestError(f"Identificador invalido: {value}.")
    return f'"{value}"'


def build_query_spec(
    *,
    schema_name: str,
    entity: str,
    dimensions: list[str],
    metrics: list[tuple[str, str, Literal["sum", "count", "avg"]]],
    filters: dict[str, Any],
    allowed_fields: set[str],
    allowed_filters: set[str],
    limit: int,
    table_fields: list[str] | None = None,
) -> QuerySpec:
    if limit < 1 or limit > 500:
        raise BadRequestError("Limit invalido.")
    if not dimensions and not metrics and not table_fields:
        raise BadRequestError("Consulta sem campos.")

    quoted_schema = quote_identifier(schema_name, tenant_schema=True)
    quoted_entity = quote_identifier(entity)
    params: list[Any] = []

    select_parts: list[str] = []
    group_parts: list[str] = []

    if table_fields is not None:
        for field in table_fields:
            _ensure_allowed(field, allowed_fields)
            select_parts.append(quote_identifier(field))
    else:
        for field in dimensions:
            _ensure_allowed(field, allowed_fields)
            quoted = quote_identifier(field)
            select_parts.append(quoted)
            group_parts.append(quoted)
        for field, label, aggregation in metrics:
            _ensure_allowed(field, allowed_fields)
            quoted = quote_identifier(field)
            alias = quote_identifier(label)
            if aggregation == "count":
                select_parts.append(f"count(*) as {alias}")
            elif aggregation == "sum":
                select_parts.append(f"coalesce(sum({quoted}), 0) as {alias}")
            elif aggregation == "avg":
                select_parts.append(f"coalesce(avg({quoted}), 0) as {alias}")
            else:
                raise BadRequestError(f"Agregacao invalida: {aggregation}.")

    where_parts: list[str] = []
    applied_filters: list[str] = []
    for field, value in filters.items():
        _ensure_allowed(field, allowed_filters, kind="filtro")
        quoted = quote_identifier(field)
        applied_filters.append(field)
        if isinstance(value, list):
            if not value:
                raise BadRequestError(f"Filtro vazio: {field}.")
            where_parts.append(f"{quoted} = any(%s)")
            params.append(value)
        else:
            where_parts.append(f"{quoted} = %s")
            params.append(value)

    sql = f"select {', '.join(select_parts)} from {quoted_schema}.{quoted_entity}"
    if where_parts:
        sql += " where " + " and ".join(where_parts)
    if group_parts:
        sql += " group by " + ", ".join(group_parts)
    sql += " limit %s"
    params.append(limit)
    return QuerySpec(sql=sql, params=tuple(params), applied_filters=applied_filters)


def _ensure_allowed(field: str, allowed: set[str], kind: str = "campo") -> None:
    if field not in allowed:
        raise BadRequestError(f"{kind.capitalize()} nao permitido: {field}.")

