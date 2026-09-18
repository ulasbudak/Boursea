from contextlib import contextmanager
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app import main, signal_alerts
from app.auth import get_current_claims
from app.market_data import MarketDataUnavailableError
from app.signal_alerts import SignalAlert, SignalAlertNotFoundError
from app.technical import SignalRecord

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


def make_alert(**overrides) -> SignalAlert:
    defaults = dict(
        id="a1",
        symbol="AAPL",
        exchange="US",
        name="Apple Inc",
        rule_id="rsi_oversold",
        rule_name="RSI 30 altına düştü",
        timeframe="daily",
        status="active",
        created_at=NOW,
        triggered_at=None,
    )
    defaults.update(overrides)
    return SignalAlert(**defaults)


# --- app/signal_alerts.py (data layer) --------------------------------------------


def test_list_alerts_returns_empty_when_none(monkeypatch):
    monkeypatch.setattr(signal_alerts, "get_connection", fake_get_connection([{"fetchall": []}]))

    assert signal_alerts.list_alerts("user-1") == []


def test_create_alert_resolves_rule_name_from_catalog(monkeypatch):
    monkeypatch.setattr(
        signal_alerts,
        "get_connection",
        fake_get_connection(
            [
                {
                    "fetchone": {
                        "id": "a1",
                        "symbol": "AAPL",
                        "exchange": "US",
                        "name": "Apple Inc",
                        "rule_id": "rsi_overbought",
                        "timeframe": "daily",
                        "status": "active",
                        "created_at": NOW,
                        "triggered_at": None,
                    }
                }
            ]
        ),
    )

    result = signal_alerts.create_alert(
        "user-1", symbol="aapl", exchange="us", name="Apple Inc", rule_id="rsi_overbought",
        timeframe="daily",
    )

    assert result.symbol == "AAPL"
    assert result.rule_id == "rsi_overbought"
    assert result.rule_name == "RSI 70 üstüne çıktı"


def test_delete_alert_raises_when_not_found(monkeypatch):
    monkeypatch.setattr(signal_alerts, "get_connection", fake_get_connection([{"rowcount": 0}]))

    with pytest.raises(SignalAlertNotFoundError):
        signal_alerts.delete_alert("user-1", "a1")


# --- evaluate_and_persist ---------------------------------------------------


@pytest.mark.anyio
async def test_evaluate_marks_alert_triggered_when_rule_fires(monkeypatch):
    async def fake_get_us_candles(symbol, timeframe):
        return []

    def fake_evaluate_signals(candles):
        return [
            SignalRecord(
                rule_id="rsi_oversold", rule_name="RSI 30 altına düştü",
                direction="bearish", triggered_at=1700000000,
            )
        ]

    monkeypatch.setattr(signal_alerts, "get_us_candles", fake_get_us_candles)
    monkeypatch.setattr(signal_alerts, "evaluate_signals", fake_evaluate_signals)
    monkeypatch.setattr(signal_alerts, "_mark_triggered", lambda alert_id, triggered_at: None)

    alert = make_alert(rule_id="rsi_oversold")
    updated, warnings = await signal_alerts.evaluate_and_persist([alert])

    assert updated[0].status == "triggered"
    assert updated[0].triggered_at is not None
    assert warnings == []


@pytest.mark.anyio
async def test_evaluate_leaves_alert_active_when_rule_does_not_fire(monkeypatch):
    async def fake_get_us_candles(symbol, timeframe):
        return []

    monkeypatch.setattr(signal_alerts, "get_us_candles", fake_get_us_candles)
    monkeypatch.setattr(signal_alerts, "evaluate_signals", lambda candles: [])

    alert = make_alert(rule_id="rsi_oversold")
    updated, warnings = await signal_alerts.evaluate_and_persist([alert])

    assert updated[0].status == "active"
    assert warnings == []


@pytest.mark.anyio
async def test_evaluate_flags_unavailable_on_market_data_error(monkeypatch):
    async def failing_get_us_candles(symbol, timeframe):
        raise MarketDataUnavailableError("no key")

    monkeypatch.setattr(signal_alerts, "get_us_candles", failing_get_us_candles)

    alert = make_alert()
    updated, warnings = await signal_alerts.evaluate_and_persist([alert])

    assert updated[0].unavailable is True
    assert updated[0].status == "active"
    assert len(warnings) == 1


@pytest.mark.anyio
async def test_evaluate_never_calls_market_data_for_bist_alerts(monkeypatch):
    async def unexpected_call(symbol, timeframe):
        raise AssertionError("BIST signal alerts must not hit the US candle provider")

    monkeypatch.setattr(signal_alerts, "get_us_candles", unexpected_call)

    alert = make_alert(exchange="BIST", symbol="GARAN")
    updated, warnings = await signal_alerts.evaluate_and_persist([alert])

    assert updated[0].unavailable is True
    assert updated[0].status == "active"
    assert len(warnings) == 1


@pytest.fixture
def anyio_backend():
    return "asyncio"


# --- /signal-alerts endpoints -------------------------------------------------------

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def override_auth():
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    yield
    main.app.dependency_overrides.pop(get_current_claims, None)


def test_get_technical_rules_endpoint():
    response = client.get("/technical/rules")

    assert response.status_code == 200
    body = response.json()
    assert any(rule["rule_id"] == "rsi_oversold" for rule in body)


def test_get_signal_alerts_endpoint(monkeypatch):
    sample = [make_alert()]
    monkeypatch.setattr(main, "list_signal_alerts", lambda user_id: sample)

    async def fake_evaluate(alerts_in, **kwargs):
        return alerts_in, []

    monkeypatch.setattr(main, "evaluate_signal_alerts", fake_evaluate)

    response = client.get("/signal-alerts")

    assert response.status_code == 200
    assert response.json()["alerts"][0]["rule_id"] == "rsi_oversold"


def test_post_signal_alert_rejects_unknown_rule_id():
    response = client.post(
        "/signal-alerts",
        json={"symbol": "AAPL", "exchange": "US", "rule_id": "not_a_real_rule"},
    )

    assert response.status_code == 400


def test_post_signal_alert_rejects_invalid_timeframe():
    response = client.post(
        "/signal-alerts",
        json={
            "symbol": "AAPL", "exchange": "US", "rule_id": "rsi_oversold",
            "timeframe": "yearly",
        },
    )

    assert response.status_code == 400


def test_post_signal_alert_creates(monkeypatch):
    monkeypatch.setattr(main, "enforce_signal_alert_limit", lambda user_id: None)
    monkeypatch.setattr(main, "create_signal_alert", lambda user_id, **kwargs: make_alert())

    response = client.post(
        "/signal-alerts",
        json={"symbol": "AAPL", "exchange": "US", "rule_id": "rsi_oversold"},
    )

    assert response.status_code == 201
    assert response.json()["symbol"] == "AAPL"


def test_delete_signal_alert_endpoint_not_found(monkeypatch):
    def raise_not_found(user_id, alert_id):
        raise SignalAlertNotFoundError(alert_id)

    monkeypatch.setattr(main, "delete_signal_alert", raise_not_found)

    response = client.delete("/signal-alerts/a1")

    assert response.status_code == 404
