import asyncio

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.errors import UnauthorizedError
from app.services.audit_service import sanitize_metadata
from app.services.credential_service import CredentialService


def login_headers(client: TestClient, email: str, password: str = "bhs123", client_slug: str | None = None) -> dict[str, str]:
    body = {"email": email, "password": password}
    if client_slug:
        body["clientSlug"] = client_slug
    response = client.post("/api/v1/auth/login", json=body)
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_password_policy_and_generator_are_enforced() -> None:
    credentials = CredentialService(get_settings())
    for _ in range(12):
        password = credentials.generate_password()
        credentials.validate_password(password)
        assert len(password) >= get_settings().password_min_length

    with pytest.raises(ValueError, match="maiuscula"):
        credentials.validate_password("lowercase#123")
    with pytest.raises(ValueError, match="especial"):
        credentials.validate_password("NoSpecial123")


def test_audit_metadata_redacts_credentials() -> None:
    sanitized = sanitize_metadata({"password": "secret", "nested": {"access_token": "jwt"}, "action": "safe"})
    assert sanitized == {"password": "[redacted]", "nested": {"access_token": "[redacted]"}, "action": "safe"}


def test_user_management_audits_success_and_denied_attempts(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    events: list[dict] = []

    async def record(_, **event):  # type: ignore[no-untyped-def]
        events.append(event)

    monkeypatch.setattr("app.services.audit_service.AuditService.log_action", record)
    tenant = login_headers(client, "admin@bhs.demo", client_slug="bhs-demo")
    created = client.post(
        "/api/v1/tenant/users",
        headers=tenant,
        json={"email": "audit.viewer@example.com", "name": "Audit Viewer", "temporaryPassword": {"mode": "generated"}, "permissions": []},
    )
    assert created.status_code == 201
    assert any(event["action"] == "user.common.created" and event["actor_id"] == "usr_demo_admin" for event in events)

    denied = client.patch("/api/v1/tenant/users/usr_gelobel_admin", headers=tenant, json={"name": "Blocked"})
    assert denied.status_code == 404
    denied_event = next(event for event in events if event["action"] == "user_management.denied")
    assert denied_event["actor_id"] == "usr_demo_admin"
    assert denied_event["client_id"] == "cli_bhs_demo"
    assert denied_event["resource_id"] == "usr_gelobel_admin"
    assert denied_event["status"] == "failed"
    assert "password" not in denied_event["metadata"]


def test_password_change_concurrency_allows_one_winner(config_repository) -> None:  # type: ignore[no-untyped-def]
    async def change(password: str) -> str:
        try:
            return str(await config_repository.change_password("usr_demo_admin", 1, password))
        except UnauthorizedError:
            return "revoked"

    async def race() -> tuple[str, str]:
        return await asyncio.gather(change("hash-a"), change("hash-b"))

    first, second = asyncio.run(race())
    assert sorted((first, second)) == ["2", "revoked"]
