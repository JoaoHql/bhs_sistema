from fastapi.testclient import TestClient


def login_headers(client: TestClient, email: str, password: str = "bhs123", client_slug: str | None = None) -> dict[str, str]:
    body = {"email": email, "password": password}
    if client_slug:
        body["clientSlug"] = client_slug
    response = client.post("/api/v1/auth/login", json=body)
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_team_crud_is_restricted_to_tenant_masters(client: TestClient) -> None:
    headers = login_headers(client, "staff@bhs.com.br")
    listed = client.get("/api/v1/internal/masters", headers=headers)
    assert listed.status_code == 200
    assert listed.json() and all(item["roles"] == ["admin"] for item in listed.json())

    created = client.post(
        "/api/v1/internal/masters", headers=headers,
        json={"email": "master.acme@example.com", "name": "MASTER ACME", "clientSlug": "acme-demo", "temporaryPassword": {"mode": "generated"}},
    )
    assert created.status_code == 201
    assert created.headers["cache-control"] == "no-store"
    assert created.json()["user"]["roles"] == ["admin"]
    assert created.json()["temporaryPassword"]

    first_reset = client.post(
        f"/api/v1/internal/masters/{created.json()['user']['id']}/reset-password",
        headers=headers,
        json={"mode": "generated"},
    )
    second_reset = client.post(
        f"/api/v1/internal/masters/{created.json()['user']['id']}/reset-password",
        headers=headers,
        json={"mode": "defined", "password": "Another#Pass2"},
    )
    assert first_reset.status_code == second_reset.status_code == 200

    denied = client.post(
        "/api/v1/internal/users", headers=headers,
        json={"email": "common@example.com", "name": "Common User", "password": "Strong#Pass1", "is_staff": False, "clientSlug": "bhs-demo", "roles": ["viewer"], "allowedScreenIds": []},
    )
    assert denied.status_code == 409


def test_tenant_master_crud_common_user_and_permissions(client: TestClient) -> None:
    headers = login_headers(client, "admin@bhs.demo", client_slug="bhs-demo")
    created = client.post(
        "/api/v1/tenant/users", headers=headers,
        json={
            "email": "viewer@example.com", "name": "Viewer Test",
            "temporaryPassword": {"mode": "defined", "password": "Strong#Pass1"},
            "permissions": [{"screenId": "demo-vendas", "access": "read"}],
        },
    )
    assert created.status_code == 201
    user = created.json()["user"]
    assert user["roles"] == ["viewer"]
    assert user["allowed_screen_ids"] == ["demo-vendas"]
    assert user["permissions"] == [{"screenId": "demo-vendas", "access": "read"}]

    updated = client.patch(f"/api/v1/tenant/users/{user['id']}", headers=headers, json={"name": "Viewer Updated", "status": "inactive"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "inactive"

    permissions = client.put(
        f"/api/v1/tenant/users/{user['id']}/permissions", headers=headers,
        json={"permissions": [{"screenId": "workspace-dados", "access": "write"}]},
    )
    assert permissions.status_code == 200
    assert permissions.json()["allowed_screen_ids"] == ["workspace-dados"]
    assert permissions.json()["permissions"] == [{"screenId": "workspace-dados", "access": "write"}]

    listed = client.get("/api/v1/tenant/users", headers=headers)
    assert listed.status_code == 200
    listed_user = next(item for item in listed.json() if item["id"] == user["id"])
    assert listed_user["permissions"] == [{"screenId": "workspace-dados", "access": "write"}]

    team = login_headers(client, "staff@bhs.com.br")
    assert client.post(
        f"/api/v1/internal/masters/{user['id']}/reset-password", headers=team,
        json={"mode": "generated"},
    ).status_code == 404
    assert client.patch(
        "/api/v1/tenant/users/usr_demo_admin", headers=headers, json={"name": "Forbidden Promotion"},
    ).status_code == 404


def test_scope_role_and_permission_escalations_are_rejected(client: TestClient) -> None:
    team = login_headers(client, "staff@bhs.com.br")
    tenant = login_headers(client, "admin@bhs.demo", client_slug="bhs-demo")

    assert client.post(
        "/api/v1/tenant/users", headers=team,
        json={"email": "x@example.com", "name": "User X", "temporaryPassword": {"mode": "generated"}, "permissions": []},
    ).status_code == 403
    assert client.post(
        "/api/v1/internal/masters", headers=tenant,
        json={"email": "x@example.com", "name": "Master X", "clientSlug": "bhs-demo", "temporaryPassword": {"mode": "generated"}},
    ).status_code == 403
    invalid = client.post(
        "/api/v1/tenant/users", headers=tenant,
        json={"email": "x@example.com", "name": "User X", "temporaryPassword": {"mode": "generated"}, "permissions": [{"screenId": "configuracoes", "access": "read"}]},
    )
    assert invalid.status_code == 400
    assert client.patch("/api/v1/tenant/users/usr_gelobel_admin", headers=tenant, json={"name": "Nope"}).status_code == 404
    duplicate = client.post(
        "/api/v1/tenant/users", headers=tenant,
        json={"email": "dup@example.com", "name": "Duplicate", "temporaryPassword": {"mode": "generated"}, "permissions": [{"screenId": "demo-vendas", "access": "read"}, {"screenId": "demo-vendas", "access": "write"}]},
    )
    assert duplicate.status_code == 400


def test_last_tenant_master_cannot_be_deactivated(client: TestClient) -> None:
    team = login_headers(client, "staff@bhs.com.br")
    response = client.patch("/api/v1/internal/masters/usr_demo_admin", headers=team, json={"status": "inactive"})
    assert response.status_code == 409
    assert "ultimo MASTER" in response.json()["message"]


def test_team_can_delete_master_but_not_last_active_master(client: TestClient) -> None:
    team = login_headers(client, "staff@bhs.com.br")
    created = client.post(
        "/api/v1/internal/masters", headers=team,
        json={"email": "second.master@example.com", "name": "Second MASTER", "clientSlug": "bhs-demo", "temporaryPassword": {"mode": "generated"}},
    )
    user_id = created.json()["user"]["id"]
    assert client.delete(f"/api/v1/internal/masters/{user_id}", headers=team).status_code == 204
    assert client.delete("/api/v1/internal/masters/usr_demo_admin", headers=team).status_code == 409


def test_tenant_master_can_delete_own_common_user_only(client: TestClient) -> None:
    tenant = login_headers(client, "admin@bhs.demo", client_slug="bhs-demo")
    created = client.post(
        "/api/v1/tenant/users", headers=tenant,
        json={"email": "delete.viewer@example.com", "name": "Delete Viewer", "temporaryPassword": {"mode": "generated"}, "permissions": []},
    )
    user_id = created.json()["user"]["id"]
    assert client.delete(f"/api/v1/tenant/users/{user_id}", headers=tenant).status_code == 204
    assert client.delete("/api/v1/tenant/users/usr_gelobel_admin", headers=tenant).status_code == 404
