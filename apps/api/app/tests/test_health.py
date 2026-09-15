from fastapi.testclient import TestClient

from app import db
from app.config import Settings
from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_db_reports_unavailable_without_config(monkeypatch) -> None:
    monkeypatch.setattr(db, "get_settings", lambda: Settings(supabase_db_url=""))

    response = client.get("/health/db")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
