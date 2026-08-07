from fastapi.testclient import TestClient


def staff_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "staff@bhs.com.br", "password": "bhs123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_internal_templates_are_available(client: TestClient) -> None:
    response = client.get("/api/v1/internal/templates", headers=staff_headers(client))

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["key"] == "receita_por_canal"


def test_internal_binding_can_be_created_and_validated(client: TestClient) -> None:
    headers = staff_headers(client)
    templates = client.get("/api/v1/internal/templates", headers=headers).json()

    response = client.post(
        "/api/v1/internal/clients/bhs-demo/template-bindings",
        headers=headers,
        json={
            "template_id": templates[0]["id"],
            "data_source_id": "ds_vendas",
            "field_mapping": {"fields": {"channel": "channel", "revenue": "revenue"}, "filters": {}},
            "default_title": "Receita por canal",
            "default_description": "Binding API.",
            "status": "draft",
            "validation_errors": [],
        },
    )

    assert response.status_code == 201
    binding = response.json()

    validation = client.post(
        f"/api/v1/internal/clients/bhs-demo/template-bindings/{binding['id']}/validate",
        headers=headers,
    )

    assert validation.status_code == 200
    assert validation.json()["status"] == "active"
    assert validation.json()["validation_errors"] == []


def test_internal_binding_validation_blocks_unknown_field(client: TestClient) -> None:
    headers = staff_headers(client)
    templates = client.get("/api/v1/internal/templates", headers=headers).json()
    response = client.post(
        "/api/v1/internal/clients/bhs-demo/template-bindings",
        headers=headers,
        json={
            "template_id": templates[0]["id"],
            "data_source_id": "ds_vendas",
            "field_mapping": {"fields": {"channel": "field_x", "revenue": "revenue"}, "filters": {}},
            "default_title": "Binding invalido",
            "default_description": "",
            "status": "draft",
            "validation_errors": [],
        },
    )
    binding = response.json()

    validation = client.post(
        f"/api/v1/internal/clients/bhs-demo/template-bindings/{binding['id']}/validate",
        headers=headers,
    )

    assert validation.status_code == 200
    assert validation.json()["status"] == "draft"
    assert any("campo nao permitido" in error for error in validation.json()["validation_errors"])


def test_internal_compose_draft_from_persisted_config(client: TestClient) -> None:
    response = client.post("/api/v1/internal/clients/bhs-demo/compose-draft", headers=staff_headers(client))

    assert response.status_code == 201
    payload = response.json()
    assert payload["status"] == "draft"
    assert payload["config"]["modules"]
    assert payload["config"]["screens"]
