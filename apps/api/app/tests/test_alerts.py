from contextlib import contextmanager
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app import alerts, main
from app.alerts import AlertNotFoundError, PriceAlert
from app.auth import get_current_claims
from app.market_data import MarketDataUnavailableError, StockOverview

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


def make_alert(**overrides) -> PriceAlert:
    defaults = dict(
        id="a1",
        symbol="AAPL",
        exchange="US",
        name="Apple Inc",
        direction="above",
        threshold=200.0,
        status="active",
        created_at=NOW,
        triggered_at=None,
    )
    defaults.update(overrides)
    return PriceAlert(**defaults)


# --- app/alerts.py (data layer) --------------------------------------------


def test_list_alerts_returns_empty_when_none(monkeypatch):
    monkeypatch.setattr(alerts, "get_connection", fake_get_connection([{"fetchall": []}]))

    assert alerts.list_alerts("user-1") == []


def test_create_alert(monkeypatch):
    monkeypatch.setattr(
        alerts,
        "get_connection",
        fake_get_connection(
            [
                {
                    "fetchone": {
                        "id": "a1",
                        "symbol": "AAPL",
                        "exchange": "US",
                        "name": "Apple Inc",
                        "direction": "above",
                        "threshold": 200.0,
                        "status": "active",
                        "created_at": NOW,
                        "triggered_at": None,
                    }
                }
            ]
        ),
    )

    result = alerts.create_alert(
        "user-1", symbol="aapl", exchange="us", name="Apple Inc", direction="above", threshold=200.0
    )

    assert result.symbol == "AAPL"
    assert result.exchange == "US"
    assert result.status == "active"


def test_delete_alert_success(monkeypatch):
    monkeypatch.setattr(alerts, "get_connection", fake_get_connection([{"rowcount": 1}]))

    alerts.delete_alert("user-1", "a1")


def test_delete_alert_raises_when_not_found(monkeypatch):
    monkeypatch.setattr(alerts, "get_connection", fake_get_connection([{"rowcount": 0}]))

    with pytest.raises(AlertNotFoundError):
        alerts.delete_alert("user-1", "a1")


# --- evaluate_and_persist ---------------------------------------------------


@pytest.mark.anyio
async def test_evaluate_marks_alert_triggered_when_condition_met(monkeypatch):
    async def fake_get_us_overview(symbol: str) -> StockOverview:
        return StockOverview(symbol=symbol, exchange="US", name="Apple Inc", price=210.0)

    monkeypatch.setattr(alerts, "get_us_overview", fake_get_us_overview)
    monkeypatch.setattr(alerts, "_mark_triggered", lambda alert_id: None)

    alert = make_alert(direction="above", threshold=200.0)
    updated, warnings = await alerts.evaluate_and_persist([alert])

    assert updated[0].status == "triggered"
    assert updated[0].triggered_at is not None
    assert warnings == []


@pytest.mark.anyio
async def test_evaluate_leaves_alert_active_when_condition_not_met(monkeypatch):
    async def fake_get_us_overview(symbol: str) -> StockOverview:
        return StockOverview(symbol=symbol, exchange="US", name="Apple Inc", price=190.0)

    monkeypatch.setattr(alerts, "get_us_overview", fake_get_us_overview)

    alert = make_alert(direction="above", threshold=200.0)
    updated, warnings = await alerts.evaluate_and_persist([alert])

    assert updated[0].status == "active"
    assert warnings == []


@pytest.mark.anyio
async def test_evaluate_flags_unavailable_without_silently_triggering(monkeypatch):
    async def failing_get_us_overview(symbol: str) -> StockOverview:
        raise MarketDataUnavailableError("no key")

    monkeypatch.setattr(alerts, "get_us_overview", failing_get_us_overview)

    alert = make_alert(direction="above", threshold=200.0)
    updated, warnings = await alerts.evaluate_and_persist([alert])

    assert updated[0].status == "active"
    assert updated[0].unavailable is True
    assert len(warnings) == 1


@pytest.mark.anyio
async def test_evaluate_never_calls_finnhub_for_bist_alerts(monkeypatch):
    async def unexpected_call(symbol: str) -> StockOverview:
        raise AssertionError("BIST alerts must not hit the US price provider")

    monkeypatch.setattr(alerts, "get_us_overview", unexpected_call)

    alert = make_alert(exchange="BIST", symbol="GARAN")
    updated, warnings = await alerts.evaluate_and_persist([alert])

    assert updated[0].unavailable is True
    assert updated[0].status == "active"


@pytest.mark.anyio
async def test_evaluate_skips_already_triggered_alerts(monkeypatch):
    async def unexpected_call(symbol: str) -> StockOverview:
        raise AssertionError("Already-triggered alerts should not be re-evaluated")

    monkeypatch.setattr(alerts, "get_us_overview", unexpected_call)

    alert = make_alert(status="triggered", triggered_at=NOW)
    updated, warnings = await alerts.evaluate_and_persist([alert])

    assert updated[0].status == "triggered"
    assert warnings == []


@pytest.fixture
def anyio_backend():
    return "asyncio"


# --- /alerts endpoints -------------------------------------------------------

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def override_auth():
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    yield
    main.app.dependency_overrides.pop(get_current_claims, None)


def test_get_alerts_endpoint_evaluates_and_returns(monkeypatch):
    sample = [make_alert()]
    monkeypatch.setattr(main, "list_alerts", lambda user_id: sample)

    async def fake_evaluate(alerts_in, **kwargs):
        return alerts_in, []

    monkeypatch.setattr(main, "evaluate_and_persist", fake_evaluate)

    response = client.get("/alerts")

    assert response.status_code == 200
    body = response.json()
    assert body["alerts"][0]["symbol"] == "AAPL"
    assert body["warnings"] == []


def test_post_alert_endpoint_rejects_invalid_direction():
    response = client.post(
        "/alerts",
        json={"symbol": "AAPL", "exchange": "US", "direction": "sideways", "threshold": 100.0},
    )

    assert response.status_code == 400


def test_post_alert_endpoint_rejects_non_positive_threshold():
    response = client.post(
        "/alerts",
        json={"symbol": "AAPL", "exchange": "US", "direction": "above", "threshold": 0},
    )

    assert response.status_code == 400


def test_post_alert_endpoint_creates(monkeypatch):
    monkeypatch.setattr(main, "enforce_alert_limit", lambda user_id: None)
    monkeypatch.setattr(main, "create_alert", lambda user_id, **kwargs: make_alert())

    response = client.post(
        "/alerts",
        json={"symbol": "AAPL", "exchange": "US", "direction": "above", "threshold": 200.0},
    )

    assert response.status_code == 201
    assert response.json()["symbol"] == "AAPL"


def test_delete_alert_endpoint_not_found(monkeypatch):
    def raise_not_found(user_id, alert_id):
        raise AlertNotFoundError(alert_id)

    monkeypatch.setattr(main, "delete_alert", raise_not_found)

    response = client.delete("/alerts/a1")

    assert response.status_code == 404
