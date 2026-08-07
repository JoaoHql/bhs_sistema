import pytest

from ops.tenant_ops import TenantSpec, build_initial_config, normalize_tenant_schema


def test_normalize_tenant_schema_from_slug() -> None:
    assert normalize_tenant_schema("cliente-demo-01") == "tenant_cliente_demo_01"


@pytest.mark.parametrize("slug", ["Cliente", "cliente_demo", "cliente--demo", "cliente demo"])
def test_normalize_tenant_schema_rejects_invalid_slug(slug: str) -> None:
    with pytest.raises(ValueError):
        normalize_tenant_schema(slug)


def test_initial_config_starts_without_screens() -> None:
    spec = TenantSpec(
        slug="cliente-demo",
        name="Cliente Demo",
        admin_email="admin@cliente.demo",
        admin_name="Administrador Cliente",
        tenant_schema="tenant_cliente_demo",
    )
    config = build_initial_config("00000000-0000-0000-0000-000000000001", spec)

    assert config["client"]["slug"] == "cliente-demo"
    assert config["modules"] == []
    assert config["screens"] == []
