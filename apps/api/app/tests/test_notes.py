from contextlib import contextmanager
from datetime import UTC, datetime

import psycopg
import pytest
from fastapi.testclient import TestClient

from app import main, notes
from app.auth import get_current_claims

NOW = datetime(2026, 1, 1, tzinfo=UTC)


class FakeCursor:
    def __init__(self, responses: list[dict]):
        self._responses = responses
        self._index = -1
        self.rowcount = 0

    def execute(self, query, params=None):
        self._index += 1
        self.rowcount = self._responses[self._index].get("rowcount", 0)

    def fetchone(self):
        return self._responses[self._index].get("fetchone")

    def fetchall(self):
        return self._responses[self._index].get("fetchall", [])

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeConnection:
    def __init__(self, responses: list[dict]):
        self._responses = responses

    def cursor(self, row_factory=None):
        return FakeCursor(self._responses)

    def commit(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def fake_get_connection(responses: list[dict]):
    @contextmanager
    def _get_connection():
        yield FakeConnection(responses)

    return _get_connection


def _note_row(**overrides) -> dict:
    row = {
        "id": "n1",
        "symbol": "AAPL",
        "exchange": "US",
        "note": "Watch for earnings",
        "created_at": NOW,
        "updated_at": NOW,
    }
    row.update(overrides)
    return row


# --- app/notes.py (data layer) --------------------------------------------------


def test_get_note_returns_none_when_missing(monkeypatch):
    monkeypatch.setattr(notes, "get_connection", fake_get_connection([{"fetchone": None}]))

    assert notes.get_note("user-1", "AAPL", "US") is None


def test_get_note_returns_existing_note(monkeypatch):
    monkeypatch.setattr(
        notes, "get_connection", fake_get_connection([{"fetchone": _note_row()}])
    )

    result = notes.get_note("user-1", "aapl", "us")

    assert result is not None
    assert result.note == "Watch for earnings"


def test_upsert_note_creates_or_updates(monkeypatch):
    monkeypatch.setattr(
        notes, "get_connection", fake_get_connection([{"fetchone": _note_row(note="Updated")}])
    )

    result = notes.upsert_note("user-1", "aapl", "us", "Updated")

    assert result.note == "Updated"
    assert result.symbol == "AAPL"


def test_delete_note_is_idempotent(monkeypatch):
    monkeypatch.setattr(notes, "get_connection", fake_get_connection([{"rowcount": 0}]))

    notes.delete_note("user-1", "AAPL", "US")  # no error even if nothing was deleted


# --- /notes endpoints -------------------------------------------------------

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def override_auth():
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    yield
    main.app.dependency_overrides.pop(get_current_claims, None)


def test_get_note_endpoint_rejects_bad_exchange():
    response = client.get("/notes", params={"symbol": "AAPL", "exchange": "XYZ"})

    assert response.status_code == 400


def test_get_note_endpoint_returns_null_when_missing(monkeypatch):
    monkeypatch.setattr(main, "get_note", lambda user_id, symbol, exchange: None)

    response = client.get("/notes", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 200
    assert response.json() is None


def test_put_note_endpoint_rejects_blank_note():
    response = client.put("/notes", json={"symbol": "AAPL", "exchange": "US", "note": "  "})

    assert response.status_code == 400


def test_put_note_endpoint_success(monkeypatch):
    saved = notes.StockNote(**_note_row())
    monkeypatch.setattr(
        main, "upsert_note", lambda user_id, symbol, exchange, note: saved
    )

    response = client.put(
        "/notes", json={"symbol": "aapl", "exchange": "us", "note": "Watch for earnings"}
    )

    assert response.status_code == 200
    assert response.json()["note"] == "Watch for earnings"


def test_delete_note_endpoint_success(monkeypatch):
    monkeypatch.setattr(main, "delete_note", lambda user_id, symbol, exchange: None)

    response = client.delete("/notes", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 204


def test_notes_endpoint_returns_503_on_db_error(monkeypatch):
    def failing_get_note(user_id, symbol, exchange):
        raise psycopg.OperationalError("down")

    monkeypatch.setattr(main, "get_note", failing_get_note)

    response = client.get("/notes", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 503


def test_notes_endpoint_requires_auth():
    main.app.dependency_overrides.pop(get_current_claims, None)

    response = client.get("/notes", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 401
