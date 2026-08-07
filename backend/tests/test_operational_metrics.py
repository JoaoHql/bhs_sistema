from fastapi.testclient import TestClient


def test_readiness_exposes_process_metrics(client: TestClient) -> None:
    assert client.get("/api/v1/health/live").status_code == 200

    response = client.get("/api/v1/health/ready")

    assert response.status_code == 200
    metrics = response.json()["metrics"]
    assert metrics["http_requests_total"] >= 1
    assert metrics["process_uptime_seconds"] >= 0
