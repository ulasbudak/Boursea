from contextlib import contextmanager
from datetime import UTC, datetime

import psycopg
import pytest
from fastapi.testclient import TestClient

from app import main, watchlists
from app.auth import get_current_claims
from app.watchlists import Watchlist, WatchlistItem, WatchlistNotFoundError

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


# --- app/watchlists.py (data layer) --------------------------------------------


def test_list_watchlists_returns_empty_when_none(monkeypatch):
    monkeypatch.setattr(watchlists, "get_connection", fake_get_connection([{"fetchall": []}]))

    assert watchlists.list_watchlists("user-1") == []


def test_list_watchlists_attaches_items(monkeypatch):
    watchlist_row = {"id": "w1", "name": "My List", "created_at": NOW}
    item_row = {
        "id": "i1",
        "watchlist_id": "w1",
        "symbol": "AAPL",
        "exchange": "US",
        "name": "Apple Inc",
        "note": None,
        "added_at": NOW,
    }
    monkeypatch.setattr(
        watchlists,
        "get_connection",
        fake_get_connection([{"fetchall": [watchlist_row]}, {"fetchall": [item_row]}]),
    )

    result = watchlists.list_watchlists("user-1")

    assert len(result) == 1
    assert result[0].name == "My List"
    assert len(result[0].items) == 1
    assert result[0].items[0].symbol == "AAPL"


def test_create_watchlist(monkeypatch):
    monkeypatch.setattr(
        watchlists,
        "get_connection",
        fake_get_connection([{"fetchone": {"id": "w1", "name": "New", "created_at": NOW}}]),
    )

    result = watchlists.create_watchlist("user-1", "New")

    assert result.id == "w1"
    assert result.name == "New"


def test_delete_watchlist_success(monkeypatch):
    monkeypatch.setattr(watchlists, "get_connection", fake_get_connection([{"rowcount": 1}]))

    watchlists.delete_watchlist("user-1", "w1")


def test_delete_watchlist_raises_when_not_found(monkeypatch):
    monkeypatch.setattr(watchlists, "get_connection", fake_get_connection([{"rowcount": 0}]))

    with pytest.raises(WatchlistNotFoundError):
        watchlists.delete_watchlist("user-1", "w1")


def test_add_item_success(monkeypatch):
    monkeypatch.setattr(
        watchlists,
        "get_connection",
        fake_get_connection(
            [
                {"fetchone": (1,)},
                {
                    "fetchone": {
                        "id": "i1",
                        "symbol": "AAPL",
                        "exchange": "US",
                        "name": "Apple Inc",
                        "note": None,
                        "added_at": NOW,
                    }
                },
            ]
        ),
    )

    result = watchlists.add_item("user-1", "w1", symbol="aapl", exchange="us", name="Apple Inc")

    assert result.symbol == "AAPL"
    assert result.exchange == "US"


def test_add_item_raises_when_watchlist_not_found(monkeypatch):
    monkeypatch.setattr(watchlists, "get_connection", fake_get_connection([{"fetchone": None}]))

    with pytest.raises(WatchlistNotFoundError):
        watchlists.add_item("user-1", "w1", symbol="AAPL", exchange="US", name=None)


def test_remove_item_success(monkeypatch):
    monkeypatch.setattr(watchlists, "get_connection", fake_get_connection([{"rowcount": 1}]))

    watchlists.remove_item("user-1", "w1", "i1")


def test_remove_item_raises_when_not_found(monkeypatch):
    monkeypatch.setattr(watchlists, "get_connection", fake_get_connection([{"rowcount": 0}]))

    with pytest.raises(WatchlistNotFoundError):
        watchlists.remove_item("user-1", "w1", "i1")


# --- /watchlists endpoints -------------------------------------------------------

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def override_auth():
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    yield
    main.app.dependency_overrides.pop(get_current_claims, None)


def test_get_watchlists_endpoint(monkeypatch):
    sample = [Watchlist(id="w1", name="List", created_at=NOW, items=[])]
    monkeypatch.setattr(main, "list_watchlists", lambda user_id: sample)

    response = client.get("/watchlists")

    assert response.status_code == 200
    assert response.json()[0]["name"] == "List"


def test_post_watchlist_endpoint_creates(monkeypatch):
    created = Watchlist(id="w1", name="New", created_at=NOW, items=[])
    monkeypatch.setattr(main, "create_watchlist", lambda user_id, name: created)

    response = client.post("/watchlists", json={"name": "New"})

    assert response.status_code == 201
    assert response.json()["name"] == "New"


def test_post_watchlist_endpoint_rejects_blank_name():
    response = client.post("/watchlists", json={"name": "   "})

    assert response.status_code == 400


def test_delete_watchlist_endpoint_not_found(monkeypatch):
    def fake_delete(user_id, watchlist_id):
        raise WatchlistNotFoundError(watchlist_id)

    monkeypatch.setattr(main, "delete_watchlist", fake_delete)

    response = client.delete("/watchlists/w1")

    assert response.status_code == 404


def test_post_watchlist_item_endpoint_rejects_bad_exchange():
    response = client.post("/watchlists/w1/items", json={"symbol": "AAPL", "exchange": "XYZ"})

    assert response.status_code == 400


def test_post_watchlist_item_endpoint_success(monkeypatch):
    item = WatchlistItem(
        id="i1", symbol="AAPL", exchange="US", name="Apple Inc", note=None, added_at=NOW
    )
    monkeypatch.setattr(main, "enforce_watchlist_item_limit", lambda user_id: None)
    monkeypatch.setattr(
        main, "add_item", lambda user_id, watchlist_id, *, symbol, exchange, name: item
    )

    response = client.post(
        "/watchlists/w1/items", json={"symbol": "aapl", "exchange": "us", "name": "Apple Inc"}
    )

    assert response.status_code == 201
    assert response.json()["symbol"] == "AAPL"


def test_delete_watchlist_item_endpoint_success(monkeypatch):
    monkeypatch.setattr(main, "remove_item", lambda user_id, watchlist_id, item_id: None)

    response = client.delete("/watchlists/w1/items/i1")

    assert response.status_code == 204


def test_get_watchlists_endpoint_returns_503_on_db_error(monkeypatch):
    def fake_list(user_id):
        raise psycopg.OperationalError("down")

    monkeypatch.setattr(main, "list_watchlists", fake_list)

    response = client.get("/watchlists")

    assert response.status_code == 503


def test_watchlists_endpoint_requires_auth():
    main.app.dependency_overrides.pop(get_current_claims, None)

    response = client.get("/watchlists")

    assert response.status_code == 401
