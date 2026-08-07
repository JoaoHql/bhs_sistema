from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.repositories.config_repository_protocol import ConfigRepositoryProtocol


def recommend_widget_presentation(widget: dict[str, Any]) -> dict[str, str]:
    """Deriva somente a apresentação; não persiste nem altera o widget recebido."""
    widget_type = widget.get("type")
    if widget_type == "kpi_card":
        preset = "kpi.compact"
    elif widget_type == "table":
        preset = "table.wide" if (widget.get("gridSpan") or 0) >= 3 else "table.compact"
    else:
        metrics = (widget.get("chartConfig") or {}).get("metrics") or []
        if len(metrics) > 1:
            preset = "chart.comparison"
        elif (widget.get("gridSpan") or 0) >= 3:
            preset = "chart.detailed"
        else:
            preset = "chart.simple"

    metric_format = _widget_metric_format(widget)
    value_format = {"currency": "currency.compact", "percent": "percent"}.get(metric_format, "number.compact")
    return {"layoutPreset": preset, "labelPolicy": "adaptive", "valueFormat": value_format}


def normalize_snapshot_presentation(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Retorna cópia idempotente; só acrescenta presentation ausente."""
    normalized = deepcopy(snapshot)
    for screen in _all_screens(normalized):
        for widget in screen.get("components") or []:
            if "presentation" not in widget:
                widget["presentation"] = recommend_widget_presentation(widget)
    return normalized


async def inventory_published_widget_presentations(repository: ConfigRepositoryProtocol, client_slug: str) -> list[dict[str, Any]]:
    """Inventário somente-leitura de versões publicadas; não chama create/update."""
    inventory: list[dict[str, Any]] = []
    for version in await repository.list_versions(client_slug):
        if version.status != "published" or not version.config:
            continue
        for screen in version.config.get("screens") or []:
            for widget in screen.get("components") or []:
                inventory.append({
                    "version": version.version,
                    "screenId": screen.get("id"),
                    "widgetId": widget.get("id"),
                    "hasPresentation": "presentation" in widget,
                    "recommendedPresentation": recommend_widget_presentation(widget),
                })
    return inventory


def _all_screens(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    screens = list(snapshot.get("screens") or [])
    for module in snapshot.get("modules") or []:
        screens.extend(module.get("screens") or [])
    return screens


def _widget_metric_format(widget: dict[str, Any]) -> str | None:
    chart_metrics = (widget.get("chartConfig") or {}).get("metrics") or []
    if chart_metrics:
        return chart_metrics[0].get("format")
    return (widget.get("kpiConfig") or {}).get("format")
