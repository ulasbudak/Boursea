from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_db_reports_unavailable_without_config() -> None:
    response = client.get("/health/db")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
