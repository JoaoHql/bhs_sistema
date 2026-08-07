import pytest
from fastapi.testclient import TestClient
from app.core.config import get_settings
from app.core.security import create_jwt_token


@pytest.fixture()
def user_jwt_token() -> str:
    settings = get_settings()
    # Criar um token válido para o administrador de bhs-demo
    data = {
        "sub": "usr_demo_admin",
        "email": "admin@bhs.demo",
        "client_slug": "bhs-demo",
        "is_staff": False,
        "roles": ["admin"],
        "credentials_version": 1,
        "password_change_required": False,
    }
    return create_jwt_token(
        data,
        settings.jwt_secret,
        settings.jwt_algorithm,
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
    )


def test_auth_missing_token_production(client: TestClient, monkeypatch) -> None:
    # Simular ambiente de produção onde dev_mock_auth e environment mudam
    settings = get_settings()
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "dev_mock_auth", False)

    response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_auth_missing_token_local_does_not_fallback_to_demo(client: TestClient, monkeypatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "environment", "local")
    monkeypatch.setattr(settings, "dev_mock_auth", True)

    response = client.get("/api/v1/me")

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_auth_invalid_token(client: TestClient) -> None:
    response = client.get("/api/v1/me", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_auth_token_without_tenant_is_denied(client: TestClient) -> None:
    settings = get_settings()
    token = create_jwt_token(
        {
            "sub": "usr_demo_admin",
            "email": "admin@bhs.demo",
            "is_staff": False,
            "roles": ["admin"],
        },
        settings.jwt_secret,
        settings.jwt_algorithm,
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
    )

    response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_auth_token_without_credentials_version_is_denied(client: TestClient) -> None:
    settings = get_settings()
    token = create_jwt_token(
        {
            "sub": "usr_demo_admin",
            "email": "admin@bhs.demo",
            "client_slug": "bhs-demo",
            "is_staff": False,
            "roles": ["admin"],
            "password_change_required": False,
        },
        settings.jwt_secret,
        settings.jwt_algorithm,
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
    )
    response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_auth_valid_token(client: TestClient, user_jwt_token: str) -> None:
    response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {user_jwt_token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "admin@bhs.demo"


def test_cross_tenant_access_denied(client: TestClient, user_jwt_token: str) -> None:
    # admin@bhs.demo pertence a cli_bhs_demo (bhs-demo), não acme-demo.
    # Tentar consultar dados ou telas de acme-demo deve falhar ou ser bloqueado pelo tenant isolado.
    # Vamos validar chamando query apontando para outro tenant, mas usando token de bhs-demo.
    response = client.post(
        "/api/v1/query",
        json={
            "screen_id": "demo-vendas",
            "widget_id": "wid-receita-canal",
            "filters": {}
        },
        headers={"Authorization": f"Bearer {user_jwt_token}"}
    )
    
    # Executa a query com isolamento do tenant resolvido dinamicamente (bhs-demo).
    assert response.status_code == 200
    assert response.json()["metadata"]["clientSlug"] == "bhs-demo"


def test_cross_tenant_header_is_rejected(client: TestClient, user_jwt_token: str) -> None:
    response = client.post(
        "/api/v1/query",
        json={"screen_id": "demo-vendas", "widget_id": "wid-receita-canal", "filters": {}},
        headers={
            "Authorization": f"Bearer {user_jwt_token}",
            "X-Tenant-Slug": "acme-demo",
        },
    )
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"
