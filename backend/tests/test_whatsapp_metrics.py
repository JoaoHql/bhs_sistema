from datetime import date

import pytest

from app.core.errors import BadRequestError
from app.services.whatsapp_metrics import render_whatsapp_template


def test_render_whatsapp_template_resolves_json_metrics_and_reference() -> None:
    message = render_whatsapp_template(
        "Data: {{monthly.periodo_inicio}}\nFaturamento: {{monthly.faturamento_atual}}\nVariacao: {{monthly.faturamento_variacao_ano_pct}}",
        {"monthly": {"periodo_inicio": date(2026, 7, 1), "metricas": {"faturamento_atual": 2200000, "faturamento_variacao_ano_pct": 22.22}}},
    )
    assert message == "Data: 07/2026\nFaturamento: R$ 2.200.000,00\nVariacao: 22,22%"


def test_render_whatsapp_template_rejects_missing_json_metric() -> None:
    with pytest.raises(BadRequestError, match="daily.custo_atual"):
        render_whatsapp_template("{{daily.custo_atual}}", {"daily": {"periodo_inicio": date(2026, 7, 16), "metricas": {}}})
