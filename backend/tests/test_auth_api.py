from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.repositories.mock_config_repository import MockConfigRepository


def test_login_cors_allows_post_from_frontend(client: TestClient) -> None:
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_login_staff_success(client: TestClient) -> None:
    # No MockConfigRepository, aceitamos qualquer usuário se a senha for "bhs123"
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "staff@bhs.com.br",
            "password": "bhs123"
        }
    )
    assert response.status_code == 200
    payload = response.json()
    assert "access_token" in payload
    assert payload["user"]["email"] == "staff@bhs.com.br"
    assert payload["user"]["is_staff"] is True


def test_login_client_admin_success(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@bhs.demo",
            "password": "bhs123"
        }
    )
    assert response.status_code == 200
    payload = response.json()
    assert "access_token" in payload
    assert payload["user"]["email"] == "admin@bhs.demo"
    assert payload["user"]["is_staff"] is False
    assert payload["user"]["client_id"] == "cli_bhs_demo"


def test_login_gelobel_admin_success(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@gelobel.com.br", "password": "Gelo#X7v!Q2mL9pR4"},
    )

    assert response.status_code == 200
    assert response.json()["user"]["client_slug"] == "gelobel"


def test_tenant_master_updates_own_profile_and_whatsapp_phone(client: TestClient) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@gelobel.com.br", "password": "Gelo#X7v!Q2mL9pR4", "clientSlug": "gelobel"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    updated = client.patch(
        "/api/v1/me",
        headers=headers,
        json={"name": "Administrador Comercial", "whatsapp_phone_e164": "+5571999999999"},
    )

    assert updated.status_code == 200
    assert updated.json()["name"] == "Administrador Comercial"
    assert updated.json()["whatsapp_phone_e164"] == "+5571999999999"
    assert client.get("/api/v1/me", headers=headers).json()["whatsapp_phone_e164"] == "+5571999999999"


def test_profile_rejects_invalid_whatsapp_phone(client: TestClient) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@gelobel.com.br", "password": "Gelo#X7v!Q2mL9pR4", "clientSlug": "gelobel"},
    )
    response = client.patch(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        json={"name": "Administrador Gelobel", "whatsapp_phone_e164": "71999999999"},
    )

    assert response.status_code == 422


def test_login_invalid_credentials(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "staff@bhs.com.br",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401
    assert response.json()["message"] == "E-mail ou senha incorretos."


def test_temporary_password_only_allows_required_change(
    client: TestClient,
    config_repository: MockConfigRepository,
) -> None:
    config_repository.set_temporary_credential("usr_demo_admin", "Temp#Strong1")
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@bhs.demo", "password": "Temp#Strong1", "clientSlug": "bhs-demo"},
    )
    assert login.status_code == 200
    assert login.json()["password_change_required"] is True
    restricted_token = login.json()["access_token"]
    restricted_headers = {"Authorization": f"Bearer {restricted_token}"}

    assert client.get("/api/v1/me", headers=restricted_headers).status_code == 403
    changed = client.post(
        "/api/v1/auth/change-password",
        headers=restricted_headers,
        json={"newPassword": "Definitive#Pass2"},
    )
    assert changed.status_code == 200
    assert changed.json()["password_change_required"] is False
    assert client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {changed.json()['access_token']}"},
    ).status_code == 200
    assert client.get("/api/v1/me", headers=restricted_headers).status_code == 401
    assert client.post(
        "/api/v1/auth/login",
        json={"email": "admin@bhs.demo", "password": "Temp#Strong1", "clientSlug": "bhs-demo"},
    ).status_code == 401


def test_expired_temporary_password_is_rejected(
    client: TestClient,
    config_repository: MockConfigRepository,
) -> None:
    config_repository.set_temporary_credential(
        "usr_demo_admin",
        "Expired#Pass1",
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@bhs.demo", "password": "Expired#Pass1", "clientSlug": "bhs-demo"},
    )
    assert response.status_code == 401


def test_voluntary_change_revokes_previous_token(
    client: TestClient,
) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@bhs.demo", "password": "bhs123", "clientSlug": "bhs-demo"},
    )
    old_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    changed = client.post(
        "/api/v1/auth/change-password",
        headers=old_headers,
        json={"currentPassword": "bhs123", "newPassword": "Voluntary#Pass2"},
    )
    assert changed.status_code == 200
    assert client.get("/api/v1/me", headers=old_headers).status_code == 401
    assert client.post(
        "/api/v1/auth/login",
        json={"email": "admin@bhs.demo", "password": "bhs123", "clientSlug": "bhs-demo"},
    ).status_code == 401


def test_administrative_reset_revokes_active_token_immediately(
    client: TestClient,
    config_repository: MockConfigRepository,
) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@bhs.demo", "password": "bhs123", "clientSlug": "bhs-demo"},
    )
    old_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    config_repository.set_temporary_credential("usr_demo_admin", "AdminReset#Pass3")

    assert client.get("/api/v1/me", headers=old_headers).status_code == 401
    reset_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@bhs.demo", "password": "AdminReset#Pass3", "clientSlug": "bhs-demo"},
    )
    assert reset_login.status_code == 200
    assert reset_login.json()["password_change_required"] is True
