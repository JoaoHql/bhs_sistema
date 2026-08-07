import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings


AUTH_HEADERS = {"Authorization": "Bearer admin@bhs.demo:bhs-demo"}


def test_production_rejects_insecure_defaults() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, environment="production")


def test_production_accepts_secure_explicit_configuration() -> None:
    settings = Settings(
        _env_file=None,
        environment="production",
        jwt_secret="a" * 32,
        dev_mock_auth=False,
        internal_api_token="internal-token",
        api_cors_origins=["https://app.example.com"],
        redis_url="rediss://cache.example.com:6380/0",
    )

    assert settings.redis_url == "rediss://cache.example.com:6380/0"


def test_redis_url_uses_the_requested_environment_variable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REDIS_URL", "rediss://cache.example.com:6380/1")

    settings = Settings(_env_file=None)

    assert settings.redis_url == "rediss://cache.example.com:6380/1"


def test_database_pool_queue_is_bounded() -> None:
    settings = Settings(_env_file=None)

    assert settings.db_pool_max_size == 10
    assert settings.db_pool_max_waiting == 20


def test_health_liveness_and_readiness_contracts(client: TestClient) -> None:
    for path in ("/api/v1/health", "/api/v1/health/live"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert response.headers["x-content-type-options"] == "nosniff"

    readiness = client.get("/api/v1/health/ready")
    assert readiness.status_code == 200
    assert readiness.json()["status"] == "degraded"
    assert readiness.json()["redis"] == "degraded"


def test_ai_endpoint_requires_backend_configuration(client: TestClient) -> None:
    response = client.post(
        "/api/v1/ai/generate-module",
        headers=AUTH_HEADERS,
        json={"prompt": "Crie uma tela de faturamento", "calculatedFields": []},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "bad_request"
