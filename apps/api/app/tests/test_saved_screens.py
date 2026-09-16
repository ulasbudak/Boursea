from contextlib import contextmanager
from datetime import UTC, datetime

import psycopg
import pytest
from fastapi.testclient import TestClient

from app import main, saved_screens
from app.auth import get_current_claims
from app.saved_screens import SavedScreen, SavedScreenNotFoundError

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
        self.committed = False

    def cursor(self, row_factory=None):
        return FakeCursor(self._responses)

    def commit(self):
        self.committed = True

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def fake_get_connection(responses: list[dict]):
    @contextmanager
    def _get_connection():
        yield FakeConnection(responses)

    return _get_connection


# --- app/saved_screens.py (data layer) -------------------------------------------


def test_list_saved_screens_returns_empty_when_none(monkeypatch):
    monkeypatch.setattr(
        saved_screens, "get_connection", fake_get_connection([{"fetchall": []}])
    )

    assert saved_screens.list_saved_screens("user-1") == []


def test_list_saved_screens_returns_rows(monkeypatch):
    row = {"id": "s1", "name": "Ucuz Teknoloji", "criteria": {"pe_max": 25}, "created_at": NOW}
    monkeypatch.setattr(
        saved_screens, "get_connection", fake_get_connection([{"fetchall": [row]}])
    )

    result = saved_screens.list_saved_screens("user-1")

    assert len(result) == 1
    assert result[0].name == "Ucuz Teknoloji"
    assert result[0].criteria == {"pe_max": 25}


def test_create_saved_screen(monkeypatch):
    row = {"id": "s1", "name": "New", "criteria": {"pe_max": 25}, "created_at": NOW}
    monkeypatch.setattr(
        saved_screens, "get_connection", fake_get_connection([{"fetchone": row}])
    )

    result = saved_screens.create_saved_screen("user-1", "New", {"pe_max": 25})

    assert result.id == "s1"
    assert result.name == "New"


def test_update_saved_screen(monkeypatch):
    row = {"id": "s1", "name": "Renamed", "criteria": {"pe_max": 30}, "created_at": NOW}
    monkeypatch.setattr(
        saved_screens, "get_connection", fake_get_connection([{"fetchone": row}])
    )

    result = saved_screens.update_saved_screen(
        "user-1", "s1", name="Renamed", criteria={"pe_max": 30}
    )

    assert result.name == "Renamed"
    assert result.criteria == {"pe_max": 30}


def test_update_saved_screen_raises_when_not_found(monkeypatch):
    monkeypatch.setattr(
        saved_screens, "get_connection", fake_get_connection([{"fetchone": None}])
    )

    with pytest.raises(SavedScreenNotFoundError):
        saved_screens.update_saved_screen("user-1", "s1", name="Renamed")


def test_delete_saved_screen_success(monkeypatch):
    monkeypatch.setattr(
        saved_screens, "get_connection", fake_get_connection([{"rowcount": 1}])
    )

    saved_screens.delete_saved_screen("user-1", "s1")


def test_delete_saved_screen_raises_when_not_found(monkeypatch):
    monkeypatch.setattr(
        saved_screens, "get_connection", fake_get_connection([{"rowcount": 0}])
    )

    with pytest.raises(SavedScreenNotFoundError):
        saved_screens.delete_saved_screen("user-1", "s1")


# --- /saved-screens endpoints -----------------------------------------------------

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def override_auth():
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    yield
    main.app.dependency_overrides.pop(get_current_claims, None)


def test_get_saved_screens_endpoint(monkeypatch):
    sample = [SavedScreen(id="s1", name="List", criteria={}, created_at=NOW)]
    monkeypatch.setattr(main, "list_saved_screens", lambda user_id: sample)

    response = client.get("/saved-screens")

    assert response.status_code == 200
    assert response.json()[0]["name"] == "List"


def test_post_saved_screen_endpoint_creates(monkeypatch):
    created = SavedScreen(id="s1", name="New", criteria={"pe_max": 25}, created_at=NOW)
    monkeypatch.setattr(main, "create_saved_screen", lambda user_id, name, criteria: created)

    response = client.post("/saved-screens", json={"name": "New", "criteria": {"pe_max": 25}})

    assert response.status_code == 201
    assert response.json()["name"] == "New"


def test_post_saved_screen_endpoint_rejects_blank_name():
    response = client.post("/saved-screens", json={"name": "   ", "criteria": {}})

    assert response.status_code == 400


def test_put_saved_screen_endpoint_success(monkeypatch):
    updated = SavedScreen(id="s1", name="Renamed", criteria={}, created_at=NOW)
    monkeypatch.setattr(
        main, "update_saved_screen", lambda user_id, saved_screen_id, *, name, criteria: updated
    )

    response = client.put("/saved-screens/s1", json={"name": "Renamed"})

    assert response.status_code == 200
    assert response.json()["name"] == "Renamed"


def test_put_saved_screen_endpoint_not_found(monkeypatch):
    def fake_update(user_id, saved_screen_id, *, name, criteria):
        raise SavedScreenNotFoundError(saved_screen_id)

    monkeypatch.setattr(main, "update_saved_screen", fake_update)

    response = client.put("/saved-screens/s1", json={"name": "Renamed"})

    assert response.status_code == 404


def test_delete_saved_screen_endpoint_success(monkeypatch):
    monkeypatch.setattr(main, "delete_saved_screen", lambda user_id, saved_screen_id: None)

    response = client.delete("/saved-screens/s1")

    assert response.status_code == 204


def test_delete_saved_screen_endpoint_not_found(monkeypatch):
    def fake_delete(user_id, saved_screen_id):
        raise SavedScreenNotFoundError(saved_screen_id)

    monkeypatch.setattr(main, "delete_saved_screen", fake_delete)

    response = client.delete("/saved-screens/s1")

    assert response.status_code == 404


def test_get_saved_screens_endpoint_returns_503_on_db_error(monkeypatch):
    def fake_list(user_id):
        raise psycopg.OperationalError("down")

    monkeypatch.setattr(main, "list_saved_screens", fake_list)

    response = client.get("/saved-screens")

    assert response.status_code == 503


def test_saved_screens_endpoint_requires_auth():
    main.app.dependency_overrides.pop(get_current_claims, None)

    response = client.get("/saved-screens")

    assert response.status_code == 401
