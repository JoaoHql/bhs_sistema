from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.schemas.published_version import PublishedVersion
from app.schemas.widget import Widget

AUTH_HEADERS = {"Authorization": "Bearer admin@bhs.demo:bhs-demo"}


def test_healthcheck(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "bhs-modelo-backend"}


def test_me_returns_fake_user(client: TestClient) -> None:
    response = client.get("/api/v1/me", headers=AUTH_HEADERS)

    assert response.status_code == 200
    payload = response.json()
    assert payload["client_id"] == "cli_bhs_demo"
    assert "admin" in payload["roles"]


def test_modules_return_frontend_compatible_contract(client: TestClient) -> None:
    response = client.get("/api/v1/modules", headers=AUTH_HEADERS)

    assert response.status_code == 200
    modules = response.json()
    assert modules[0]["screens"][0]["components"] == []
    assert modules[1]["screens"][0]["components"][0]["chartConfig"]["workspaceId"]


def test_screen_found(client: TestClient) -> None:
    response = client.get("/api/v1/screens/demo-vendas", headers=AUTH_HEADERS)

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "demo-vendas"
    assert payload["components"][0]["gridSpan"] == 2


def test_screen_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/screens/tela-inexistente", headers=AUTH_HEADERS)

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_legacy_tenant_menu_order_routes_are_not_exposed(client: TestClient) -> None:
    get_response = client.get("/api/v1/tenant/menu-order")
    put_response = client.put(
        "/api/v1/tenant/menu-order",
        json={"itemIds": ["configuracoes"]},
    )

    assert get_response.status_code == 404
    assert put_response.status_code == 404


def test_user_menu_preference_routes_are_registered(client: TestClient) -> None:
    get_response = client.get("/api/v1/me/preferences/menu-order")
    put_response = client.put(
        "/api/v1/me/preferences/menu-order",
        json={"itemIds": ["configuracoes"]},
    )

    assert get_response.status_code == 401
    assert put_response.status_code == 401


def test_widget_schema_rejects_invalid_payload() -> None:
    try:
        Widget.model_validate({"id": "wid-invalid", "type": "sql"})
    except ValidationError as exc:
        assert "type" in str(exc)
    else:
        raise AssertionError("Invalid widget payload should fail validation.")


def test_widget_schema_preserves_legacy_layout_contract() -> None:
    widget = Widget.model_validate(
        {"id": "wid-legacy", "type": "chart", "gridSpan": 2}
    )

    payload = widget.model_dump(by_alias=True, exclude_none=True)
    assert payload["gridSpan"] == 2
    assert "presentation" not in payload


def test_widget_schema_accepts_semantic_presentation_contract() -> None:
    widget = Widget.model_validate(
        {
            "id": "wid-presentation",
            "type": "chart",
            "presentation": {
                "layoutPreset": "chart.comparison",
                "labelPolicy": "adaptive",
                "valueFormat": "currency.compact",
            },
        }
    )

    assert widget.model_dump(by_alias=True)["presentation"] == {
        "layoutPreset": "chart.comparison",
        "labelPolicy": "adaptive",
        "valueFormat": "currency.compact",
    }


@pytest.mark.parametrize(
    "presentation",
    [
        {"layoutPreset": "chart.free"},
        {"layoutPreset": "chart.comparison", "labelPolicy": "sometimes"},
        {"layoutPreset": "chart.comparison", "valueFormat": "currency.raw"},
        {"layoutPreset": "chart.comparison", "contentHeight": 480},
        {"layoutPreset": "chart.comparison", "tailwindClass": "col-span-6"},
        {"layoutPreset": "chart.comparison", "x": 4},
    ],
)
def test_widget_schema_rejects_invalid_presentation_contract(presentation: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        Widget.model_validate(
            {"id": "wid-invalid-presentation", "type": "chart", "presentation": presentation}
        )


def test_published_version_contract() -> None:
    version = PublishedVersion.model_validate(
        {
            "id": "pub_demo_1",
            "client_id": "cli_bhs_demo",
            "version": 1,
            "status": "draft",
        }
    )

    assert version.status == "draft"
