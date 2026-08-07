import pytest
from pydantic import ValidationError

from app.schemas.data_source_field import DataSourceField, DataSourceFieldUpsertRequest
from app.schemas.template_contract import PublishedConfigSnapshotV2, TenantTemplateBinding, VisualTemplate


def test_data_source_field_contract_blocks_extra_and_supports_sensitive_hidden() -> None:
    field = DataSourceField.model_validate(
        {
            "id": "field_1",
            "data_source_id": "ds_1",
            "field_name": "cpf",
            "display_name": "CPF",
            "technical_type": "id",
            "semantic_role": "identifier",
            "is_sensitive": True,
            "status": "hidden",
        }
    )

    assert field.is_sensitive is True
    assert field.status == "hidden"

    with pytest.raises(ValidationError):
        DataSourceFieldUpsertRequest.model_validate(
            {
                "field_name": "revenue",
                "display_name": "Receita",
                "technical_type": "currency",
                "semantic_role": "metric",
                "sql": "sum(revenue)",
            }
        )


def test_visual_template_global_contract_has_no_client_or_physical_table() -> None:
    template = VisualTemplate.model_validate(
        {
            "id": "tpl_1",
            "key": "revenue_by_channel",
            "name": "Receita por canal",
            "template_type": "chart",
            "visual_type": "bar",
            "semantic_requirements": {
                "dimensions": [{"key": "channel", "label": "Canal", "types": ["text", "category"]}],
                "metrics": [{"key": "revenue", "label": "Receita", "types": ["currency"], "aggregations": ["sum"]}],
                "filters": [],
            },
            "status": "active",
        }
    )

    assert template.key == "revenue_by_channel"

    with pytest.raises(ValidationError):
        VisualTemplate.model_validate(
            {
                "id": "tpl_1",
                "key": "bad",
                "name": "Bad",
                "template_type": "chart",
                "visual_type": "bar",
                "client_id": "cli_1",
                "semantic_requirements": {"dimensions": [], "metrics": [], "filters": []},
            }
        )


def test_binding_and_empty_snapshot_v2_contracts() -> None:
    binding = TenantTemplateBinding.model_validate(
        {
            "id": "bind_1",
            "client_id": "cli_1",
            "template_id": "tpl_1",
            "data_source_id": "ds_1",
            "field_mapping": {"fields": {"channel": "channel", "revenue": "revenue"}, "filters": {}},
            "status": "draft",
        }
    )
    snapshot = PublishedConfigSnapshotV2.model_validate({"version": 2})

    assert binding.field_mapping.fields["revenue"] == "revenue"
    assert snapshot.modules == []
    assert snapshot.screens == []
