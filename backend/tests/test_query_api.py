from fastapi.testclient import TestClient

AUTH_HEADERS = {"Authorization": "Bearer admin@bhs.demo:bhs-demo"}


def test_gelobel_modules_include_messages_and_combo_simulator(client: TestClient) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@gelobel.com.br",
            "password": "Gelo#X7v!Q2mL9pR4",
            "clientSlug": "gelobel",
        },
    )
    assert login.status_code == 200

    response = client.get(
        "/api/v1/modules",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )

    assert response.status_code == 200
    modules = response.json()
    simulator_module = next(module for module in modules if module["id"] == "simuladores")
    assert simulator_module["screens"][0]["id"] == "simulador-combos"
    messages_module = next(module for module in modules if module["id"] == "mensagens")
    assert messages_module["screens"][0]["id"] == "mensagens-disparos-whatsapp"


def test_query_endpoint_returns_rows(client: TestClient) -> None:
    response = client.post(
        "/api/v1/query",
        json={"screenId": "demo-vendas", "widgetId": "wid-receita-canal", "filters": {"canal": "Online"}},
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["dataSourceId"] == "ws-vendas-demo"
    assert payload["rows"][0]["Receita"] == 18000.0
    assert payload["metadata"]["appliedFilters"] == ["canal"]


def test_query_endpoint_rejects_invalid_filter(client: TestClient) -> None:
    response = client.post(
        "/api/v1/query",
        json={"screenId": "demo-vendas", "widgetId": "wid-receita-canal", "filters": {"branch": "x"}},
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 400
    assert response.json()["code"] == "bad_request"


def test_query_endpoint_rejects_unknown_widget(client: TestClient) -> None:
    response = client.post(
        "/api/v1/query",
        json={"screenId": "demo-vendas", "widgetId": "wid-inexistente", "filters": {}},
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_sales_overview_endpoint_returns_sales_orders(client: TestClient) -> None:
    response = client.post(
        "/api/v1/query/sales-overview",
        json={"screenId": "demo-vendas", "limit": 5},
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["screenId"] == "demo-vendas"
    assert payload["clientSlug"] == "bhs-demo"
    assert payload["rows"][0]["customer_name"] == "Cliente Alpha"
    assert payload["rows"][0]["revenue"] == 18000.0


def test_combo_simulator_products_endpoint_returns_catalog(client: TestClient) -> None:
    response = client.post(
        "/api/v1/query/combo-simulator-products",
        json={"screenId": "demo-vendas", "search": "Produto", "company": "Demo", "limit": 10},
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["clientSlug"] == "bhs-demo"
    assert payload["companies"] == ["Demo"]
    assert payload["rows"][0]["product_id"] == 1
    assert payload["rows"][0]["unit_cost"] == 10.0
    assert len({row["product_id"] for row in payload["rows"]}) == 3
    assert {row["company"] for row in payload["rows"]} == {"Demo"}


def test_combo_simulator_requires_a_company_before_returning_products(client: TestClient) -> None:
    response = client.post(
        "/api/v1/query/combo-simulator-products",
        json={"screenId": "demo-vendas", "limit": 10},
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 200
    assert response.json()["companies"] == ["Demo"]
    assert response.json()["rows"] == []


def test_combo_simulator_unknown_company_returns_no_products(client: TestClient) -> None:
    response = client.post(
        "/api/v1/query/combo-simulator-products",
        json={"screenId": "demo-vendas", "company": "Outra empresa", "limit": 10},
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 200
    assert response.json()["companies"] == ["Demo"]
    assert response.json()["rows"] == []
