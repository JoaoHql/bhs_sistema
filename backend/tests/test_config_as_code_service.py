from pathlib import Path

from app.services.config_as_code_service import ConfigAsCodeService


ROOT = Path(__file__).resolve().parents[2]


def test_config_as_code_builds_snapshot_v2_from_yaml() -> None:
    service = ConfigAsCodeService()

    templates = service.load_templates_dir(ROOT / "configs" / "templates")
    tenant = service.load_tenant_file(ROOT / "configs" / "tenants" / "bhs-demo.yaml")
    result = service.build_snapshot(tenant, templates)

    assert result.errors == []
    assert result.snapshot_v2["client_slug"] == "bhs-demo"
    assert result.snapshot_v2["screens"][0]["components"][0]["bindingId"] == "bind_bhs_receita_canal"
    assert result.frontend_snapshot["screens"][0]["components"][0]["chartConfig"]["metrics"][0]["field"] == "receita"


def test_config_as_code_reuses_template_with_different_tenant_fields() -> None:
    service = ConfigAsCodeService()
    templates = service.load_templates_dir(ROOT / "configs" / "templates")

    bhs = service.build_snapshot(service.load_tenant_file(ROOT / "configs" / "tenants" / "bhs-demo.yaml"), templates)
    acme = service.build_snapshot(service.load_tenant_file(ROOT / "configs" / "tenants" / "acme-demo.yaml"), templates)

    assert bhs.frontend_snapshot["screens"][0]["components"][0]["templateKey"] == "receita_por_canal"
    assert acme.frontend_snapshot["screens"][0]["components"][0]["templateKey"] == "receita_por_canal"
    assert bhs.frontend_snapshot["screens"][0]["components"][0]["chartConfig"]["metrics"][0]["field"] == "receita"
    assert acme.frontend_snapshot["screens"][0]["components"][0]["chartConfig"]["metrics"][0]["field"] == "net_revenue"


def test_config_as_code_blocks_missing_field() -> None:
    service = ConfigAsCodeService()
    templates = service.load_templates_dir(ROOT / "configs" / "templates")
    tenant = service.load_tenant_file(ROOT / "configs" / "tenants" / "bhs-demo.yaml")
    tenant.bindings[0].field_mapping.fields["revenue"] = "campo_inexistente"

    result = service.build_snapshot(tenant, templates)

    assert result.snapshot_v2 == {}
    assert "Binding bind_bhs_receita_canal usa campo nao permitido: campo_inexistente." in result.errors
