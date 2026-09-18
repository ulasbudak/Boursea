from contextlib import contextmanager
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app import entitlements, main
from app.alerts import PriceAlert
from app.auth import get_current_claims
from app.entitlements import EntitlementLimitError
from app.portfolios import Portfolio
from app.signal_alerts import SignalAlert
from app.simulations import Simulation
from app.watchlists import Watchlist, WatchlistItem

NOW = datetime(2026, 1, 1, tzinfo=UTC)


class FakeCursor:
    def __init__(self, responses: list[dict]):
        self._responses = responses
        self._index = -1

    def execute(self, query, params=None):
        self._index += 1

    def fetchone(self):
        return self._responses[self._index].get("fetchone")

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeConnection:
    def __init__(self, responses: list[dict]):
        self._responses = responses

    def cursor(self, row_factory=None):
        return FakeCursor(self._responses)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def fake_get_connection(responses: list[dict]):
    @contextmanager
    def _get_connection():
        yield FakeConnection(responses)

    return _get_connection


# --- app/entitlements.py --------------------------------------------------------


def test_get_tier_defaults_to_free_when_no_row(monkeypatch):
    monkeypatch.setattr(
        entitlements, "get_connection", fake_get_connection([{"fetchone": None}])
    )

    assert entitlements.get_tier("user-1") == "free"


def test_get_tier_returns_premium_when_set(monkeypatch):
    monkeypatch.setattr(
        entitlements, "get_connection", fake_get_connection([{"fetchone": {"tier": "premium"}}])
    )

    assert entitlements.get_tier("user-1") == "premium"


def test_get_entitlement_free_has_limits(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "free")

    result = entitlements.get_entitlement("user-1")

    assert result.tier == "free"
    assert result.watchlist_item_limit == entitlements.FREE_WATCHLIST_ITEM_LIMIT
    assert result.simulation_limit == entitlements.FREE_SIMULATION_LIMIT
    assert result.advanced_indicators is False
    assert result.realtime_data is False
    assert result.ai_reports is False


def test_get_entitlement_premium_is_unlimited(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "premium")

    result = entitlements.get_entitlement("user-1")

    assert result.tier == "premium"
    assert result.watchlist_item_limit is None
    assert result.alert_limit is None
    assert result.simulation_limit is None
    assert result.advanced_indicators is True
    assert result.ai_reports is True


def test_enforce_ai_reports_access_blocks_free(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "free")

    with pytest.raises(EntitlementLimitError):
        entitlements.enforce_ai_reports_access("user-1")


def test_enforce_ai_reports_access_allows_premium(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "premium")

    entitlements.enforce_ai_reports_access("user-1")  # no error


def test_enforce_watchlist_item_limit_allows_premium(monkeypatch):
    def unexpected_call(user_id):
        raise AssertionError("should not query items for premium")

    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "premium")
    monkeypatch.setattr(entitlements, "list_watchlists", unexpected_call)

    entitlements.enforce_watchlist_item_limit("user-1")  # no error


def test_enforce_watchlist_item_limit_blocks_when_at_cap(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "free")
    items = [
        WatchlistItem(id=f"i{i}", symbol="AAPL", exchange="US", note=None, added_at=NOW)
        for i in range(entitlements.FREE_WATCHLIST_ITEM_LIMIT)
    ]
    watchlist = Watchlist(id="w1", name="Main", created_at=NOW, items=items)
    monkeypatch.setattr(entitlements, "list_watchlists", lambda user_id: [watchlist])

    with pytest.raises(EntitlementLimitError):
        entitlements.enforce_watchlist_item_limit("user-1")


def test_enforce_watchlist_item_limit_allows_under_cap(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "free")
    watchlist = Watchlist(id="w1", name="Main", created_at=NOW, items=[])
    monkeypatch.setattr(entitlements, "list_watchlists", lambda user_id: [watchlist])

    entitlements.enforce_watchlist_item_limit("user-1")  # no error


def test_enforce_alert_limit_counts_only_active(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "free")
    alerts = [
        PriceAlert(
            id=str(i), symbol="AAPL", exchange="US", direction="above", threshold=100,
            status="triggered" if i == 0 else "active", created_at=NOW,
        )
        for i in range(entitlements.FREE_ALERT_LIMIT + 1)
    ]
    monkeypatch.setattr(entitlements, "list_alerts", lambda user_id: alerts)

    # FREE_ALERT_LIMIT+1 rows but one is triggered -> exactly FREE_ALERT_LIMIT active -> blocked
    with pytest.raises(EntitlementLimitError):
        entitlements.enforce_alert_limit("user-1")


def test_enforce_signal_alert_limit_blocks_when_at_cap(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "free")
    alerts = [
        SignalAlert(
            id=str(i), symbol="AAPL", exchange="US", rule_id="rsi_oversold",
            rule_name="RSI aşırı satım", timeframe="daily", status="active", created_at=NOW,
        )
        for i in range(entitlements.FREE_SIGNAL_ALERT_LIMIT)
    ]
    monkeypatch.setattr(entitlements, "list_signal_alerts", lambda user_id: alerts)

    with pytest.raises(EntitlementLimitError):
        entitlements.enforce_signal_alert_limit("user-1")


def test_enforce_portfolio_limit_blocks_when_at_cap(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "free")
    portfolios = [
        Portfolio(id=str(i), name=f"P{i}", created_at=NOW)
        for i in range(entitlements.FREE_PORTFOLIO_LIMIT)
    ]
    monkeypatch.setattr(entitlements, "list_portfolios", lambda user_id: portfolios)

    with pytest.raises(EntitlementLimitError):
        entitlements.enforce_portfolio_limit("user-1")


def test_enforce_simulation_limit_allows_premium(monkeypatch):
    def unexpected_call(user_id):
        raise AssertionError("should not query simulations for premium")

    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "premium")
    monkeypatch.setattr(entitlements, "list_simulations", unexpected_call)

    entitlements.enforce_simulation_limit("user-1")  # no error


def test_enforce_simulation_limit_blocks_when_at_cap(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "free")
    simulations = [
        Simulation(id=str(i), name=f"S{i}", starting_budget=1000, cash_balance=1000, created_at=NOW)
        for i in range(entitlements.FREE_SIMULATION_LIMIT)
    ]
    monkeypatch.setattr(entitlements, "list_simulations", lambda user_id: simulations)

    with pytest.raises(EntitlementLimitError):
        entitlements.enforce_simulation_limit("user-1")


def test_enforce_simulation_limit_allows_under_cap(monkeypatch):
    monkeypatch.setattr(entitlements, "get_tier", lambda user_id: "free")
    monkeypatch.setattr(entitlements, "list_simulations", lambda user_id: [])

    entitlements.enforce_simulation_limit("user-1")  # no error


# --- endpoints ------------------------------------------------------------------

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def override_auth():
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    yield
    main.app.dependency_overrides.pop(get_current_claims, None)


def test_get_entitlements_endpoint(monkeypatch):
    monkeypatch.setattr(
        main,
        "get_entitlement",
        lambda user_id: entitlements.Entitlement(
            tier="free",
            watchlist_item_limit=10,
            alert_limit=3,
            signal_alert_limit=3,
            portfolio_limit=1,
            simulation_limit=1,
            advanced_indicators=False,
            realtime_data=False,
            ai_reports=False,
        ),
    )

    response = client.get("/entitlements")

    assert response.status_code == 200
    assert response.json()["tier"] == "free"


def test_entitlements_endpoint_requires_auth():
    main.app.dependency_overrides.pop(get_current_claims, None)

    response = client.get("/entitlements")

    assert response.status_code == 401


def test_post_watchlist_item_endpoint_returns_403_at_limit(monkeypatch):
    def blocked(user_id):
        raise EntitlementLimitError("limit reached")

    monkeypatch.setattr(main, "enforce_watchlist_item_limit", blocked)

    response = client.post(
        "/watchlists/w1/items", json={"symbol": "AAPL", "exchange": "US"}
    )

    assert response.status_code == 403


def test_post_alert_endpoint_returns_403_at_limit(monkeypatch):
    def blocked(user_id):
        raise EntitlementLimitError("limit reached")

    monkeypatch.setattr(main, "enforce_alert_limit", blocked)

    response = client.post(
        "/alerts", json={"symbol": "AAPL", "exchange": "US", "direction": "above", "threshold": 100}
    )

    assert response.status_code == 403


def test_post_signal_alert_endpoint_returns_403_at_limit(monkeypatch):
    def blocked(user_id):
        raise EntitlementLimitError("limit reached")

    monkeypatch.setattr(main, "enforce_signal_alert_limit", blocked)

    response = client.post(
        "/signal-alerts",
        json={"symbol": "AAPL", "exchange": "US", "rule_id": "rsi_oversold", "timeframe": "daily"},
    )

    assert response.status_code == 403


def test_post_portfolio_endpoint_returns_403_at_limit(monkeypatch):
    def blocked(user_id):
        raise EntitlementLimitError("limit reached")

    monkeypatch.setattr(main, "enforce_portfolio_limit", blocked)

    response = client.post("/portfolios", json={"name": "New"})

    assert response.status_code == 403


def test_get_fundamental_ai_report_endpoint_returns_403_for_free_user(monkeypatch):
    def blocked(user_id):
        raise EntitlementLimitError("AI analiz raporları yalnızca premium katmanda kullanılabilir.")

    monkeypatch.setattr(main, "enforce_ai_reports_access", blocked)

    params = {"symbol": "AAPL", "exchange": "US"}
    response = client.get("/symbols/ai-report/fundamental", params=params)

    assert response.status_code == 403


def test_get_fundamental_ai_report_endpoint_requires_auth():
    main.app.dependency_overrides.pop(get_current_claims, None)

    params = {"symbol": "AAPL", "exchange": "US"}
    response = client.get("/symbols/ai-report/fundamental", params=params)

    assert response.status_code == 401


def test_get_technical_ai_report_endpoint_returns_403_for_free_user(monkeypatch):
    def blocked(user_id):
        raise EntitlementLimitError("AI analiz raporları yalnızca premium katmanda kullanılabilir.")

    monkeypatch.setattr(main, "enforce_ai_reports_access", blocked)

    params = {"symbol": "AAPL", "exchange": "US"}
    response = client.get("/symbols/ai-report/technical", params=params)

    assert response.status_code == 403


def test_get_technical_ai_report_endpoint_requires_auth():
    main.app.dependency_overrides.pop(get_current_claims, None)

    params = {"symbol": "AAPL", "exchange": "US"}
    response = client.get("/symbols/ai-report/technical", params=params)

    assert response.status_code == 401
