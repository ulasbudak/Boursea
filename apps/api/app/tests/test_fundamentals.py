import httpx
import pytest
from fastapi.testclient import TestClient

from app import fundamentals, main
from app.config import Settings
from app.fundamentals import (
    FundamentalsSnapshot,
    FundamentalsUnavailableError,
    get_bist_fundamentals,
    get_bist_historical_performance,
    get_peer_symbols,
    get_us_fundamentals,
    get_us_historical_performance,
    get_us_sector_comparison,
)

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    monkeypatch.setattr(fundamentals, "get_settings", lambda: Settings(finnhub_api_key="test-key"))


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_get_bist_fundamentals_returns_all_none():
    snapshot = get_bist_fundamentals("garan")

    assert snapshot.symbol == "GARAN"
    assert snapshot.exchange == "BIST"
    assert snapshot.pe_ratio is None
    assert snapshot.market_cap is None


@pytest.mark.anyio
async def test_get_us_fundamentals_prefers_primary_candidate_keys():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "metric": {
                    "peBasicExclExtraTTM": 28.5,
                    "peExclExtraTTM": 99.0,
                    "pbAnnual": 45.2,
                    "roeTTM": 1.5,
                    "roaTTM": 0.3,
                    "epsInclExtraItemsTTM": 6.1,
                    "epsGrowthTTMYoy": 0.1,
                    "currentDividendYieldTTM": 0.005,
                    "totalDebt/totalEquityAnnual": 1.9,
                    "grossMarginTTM": 0.46,
                    "netProfitMarginTTM": 0.25,
                    "marketCapitalization": 3_000_000.0,
                },
                "metricType": "all",
                "symbol": "AAPL",
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        snapshot = await get_us_fundamentals("AAPL", client=http_client)

    assert snapshot.pe_ratio == 28.5
    assert snapshot.pb_ratio == 45.2
    assert snapshot.roe == 1.5
    assert snapshot.roa == 0.3
    assert snapshot.eps == 6.1
    assert snapshot.eps_growth == 0.1
    assert snapshot.dividend_yield == 0.005
    assert snapshot.debt_to_equity == 1.9
    assert snapshot.gross_margin == 0.46
    assert snapshot.net_margin == 0.25
    assert snapshot.market_cap == 3_000_000.0 * 1_000_000
    # Fields absent from the fixture fall back to None, not a crash.
    assert snapshot.ebitda_margin is None
    assert snapshot.free_cash_flow is None


@pytest.mark.anyio
async def test_get_us_fundamentals_falls_back_to_secondary_key():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"metric": {"peExclExtraTTM": 12.3}, "metricType": "all", "symbol": "XYZ"},
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        snapshot = await get_us_fundamentals("XYZ", client=http_client)

    assert snapshot.pe_ratio == 12.3


@pytest.mark.anyio
async def test_get_us_fundamentals_raises_on_empty_metric():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"metric": {}, "metricType": "all", "symbol": "ZZZZ"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        with pytest.raises(FundamentalsUnavailableError):
            await get_us_fundamentals("ZZZZ", client=http_client)


@pytest.mark.anyio
async def test_get_us_fundamentals_raises_on_http_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        with pytest.raises(FundamentalsUnavailableError):
            await get_us_fundamentals("AAPL", client=http_client)


@pytest.mark.anyio
async def test_get_us_fundamentals_raises_without_api_key(monkeypatch):
    monkeypatch.setattr(fundamentals, "get_settings", lambda: Settings(finnhub_api_key=""))

    with pytest.raises(FundamentalsUnavailableError):
        await get_us_fundamentals("AAPL")


def test_fundamentals_endpoint_returns_bist_snapshot_with_warning():
    response = client.get("/fundamentals", params={"symbol": "GARAN", "exchange": "BIST"})

    assert response.status_code == 200
    body = response.json()
    assert body["fundamentals"]["symbol"] == "GARAN"
    assert body["fundamentals"]["pe_ratio"] is None
    assert len(body["warnings"]) == 1


def test_fundamentals_endpoint_surfaces_warning_when_us_provider_unavailable(monkeypatch):
    async def failing_get_us_fundamentals(symbol: str) -> None:
        raise FundamentalsUnavailableError("boom")

    monkeypatch.setattr(main, "get_us_fundamentals", failing_get_us_fundamentals)

    response = client.get("/fundamentals", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 200
    body = response.json()
    assert body["fundamentals"] is None
    assert len(body["warnings"]) == 1


def test_fundamentals_endpoint_rejects_unknown_exchange():
    response = client.get("/fundamentals", params={"symbol": "AAPL", "exchange": "XYZ"})

    assert response.status_code == 400


def test_fundamentals_endpoint_bist_has_no_sector_comparison():
    response = client.get("/fundamentals", params={"symbol": "GARAN", "exchange": "BIST"})

    assert response.json()["sector_comparison"] is None


@pytest.mark.anyio
async def test_get_peer_symbols_excludes_self_and_caps_list():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json=["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NFLX", "ORCL", "IBM", "CSCO"]
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        peers = await get_peer_symbols("AAPL", client=http_client)

    assert "AAPL" not in peers
    assert len(peers) == fundamentals.MAX_PEERS


@pytest.mark.anyio
async def test_get_peer_symbols_raises_on_http_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        with pytest.raises(FundamentalsUnavailableError):
            await get_peer_symbols("AAPL", client=http_client)


@pytest.mark.anyio
async def test_get_us_sector_comparison_averages_available_peers():
    def handler(request: httpx.Request) -> httpx.Response:
        if "peers" in str(request.url):
            return httpx.Response(200, json=["AAPL", "PEER1", "PEER2"])
        symbol = request.url.params["symbol"]
        if symbol == "PEER1":
            return httpx.Response(200, json={"metric": {"peBasicExclExtraTTM": 10.0}})
        if symbol == "PEER2":
            return httpx.Response(200, json={"metric": {"peBasicExclExtraTTM": 20.0}})
        return httpx.Response(500)

    own_snapshot = FundamentalsSnapshot(symbol="AAPL", exchange="US", pe_ratio=18.0)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        comparison = await get_us_sector_comparison("AAPL", own_snapshot, client=http_client)

    assert comparison is not None
    assert comparison.peer_count == 2
    assert comparison.pe_ratio.sector_average == 15.0
    assert comparison.pe_ratio.value == 18.0
    assert comparison.pe_ratio.diff_pct == pytest.approx(20.0)
    # No peer had pb data, so that metric stays unavailable rather than crashing.
    assert comparison.pb_ratio is None


@pytest.mark.anyio
async def test_get_us_sector_comparison_returns_none_when_no_peers():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=["AAPL"])

    own_snapshot = FundamentalsSnapshot(symbol="AAPL", exchange="US", pe_ratio=18.0)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        comparison = await get_us_sector_comparison("AAPL", own_snapshot, client=http_client)

    assert comparison is None


@pytest.mark.anyio
async def test_get_us_sector_comparison_returns_none_when_peers_request_fails():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    own_snapshot = FundamentalsSnapshot(symbol="AAPL", exchange="US", pe_ratio=18.0)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        comparison = await get_us_sector_comparison("AAPL", own_snapshot, client=http_client)

    assert comparison is None


def test_fundamentals_endpoint_includes_sector_comparison_for_us(monkeypatch):
    own_snapshot = FundamentalsSnapshot(symbol="AAPL", exchange="US", pe_ratio=18.0)
    expected_comparison = fundamentals.SectorComparison(
        peer_count=2,
        pe_ratio=fundamentals.MetricComparison(value=18.0, sector_average=15.0, diff_pct=20.0),
    )

    async def fake_get_us_fundamentals(symbol: str) -> FundamentalsSnapshot:
        return own_snapshot

    async def fake_get_us_sector_comparison(symbol: str, snapshot: FundamentalsSnapshot):
        assert snapshot is own_snapshot
        return expected_comparison

    monkeypatch.setattr(main, "get_us_fundamentals", fake_get_us_fundamentals)
    monkeypatch.setattr(main, "get_us_sector_comparison", fake_get_us_sector_comparison)

    response = client.get("/fundamentals", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 200
    body = response.json()
    assert body["sector_comparison"]["peer_count"] == 2
    assert body["sector_comparison"]["pe_ratio"]["sector_average"] == 15.0


def test_get_bist_historical_performance_returns_empty_series():
    history = get_bist_historical_performance("garan")

    assert history.symbol == "GARAN"
    assert history.annual == []
    assert history.quarterly == []


@pytest.mark.anyio
async def test_get_us_historical_performance_derives_net_income_and_caps_periods():
    annual_entries = [{"period": f"{2015 + i}-12-31", "v": 10.0 + i} for i in range(8)]
    net_margin_entries = [{"period": f"{2015 + i}-12-31", "v": 0.2} for i in range(8)]
    eps_entries = [{"period": f"{2015 + i}-12-31", "v": 1.5 + i} for i in range(8)]

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "series": {
                    "annual": {
                        "salesPerShare": annual_entries,
                        "netMargin": net_margin_entries,
                        "eps": eps_entries,
                    },
                    "quarterly": {},
                },
                "symbol": "AAPL",
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        history = await get_us_historical_performance("AAPL", client=http_client)

    assert len(history.annual) == 5  # capped at MAX_ANNUAL_PERIODS
    assert history.quarterly == []
    # Chronological order: oldest to newest.
    assert history.annual[0].period < history.annual[-1].period
    latest = history.annual[-1]
    assert latest.period == "2022-12-31"
    assert latest.revenue_per_share == 17.0
    assert latest.net_income_per_share == pytest.approx(17.0 * 0.2)
    assert latest.eps == 8.5


@pytest.mark.anyio
async def test_get_us_historical_performance_handles_partial_period_data():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "series": {
                    "annual": {
                        "salesPerShare": [{"period": "2023-12-31", "v": 10.0}],
                        # No netMargin for this period -> net income stays None, not a guess.
                        "eps": [{"period": "2023-12-31", "v": 2.0}],
                    },
                    "quarterly": {},
                },
                "symbol": "AAPL",
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        history = await get_us_historical_performance("AAPL", client=http_client)

    assert len(history.annual) == 1
    point = history.annual[0]
    assert point.revenue_per_share == 10.0
    assert point.net_income_per_share is None
    assert point.eps == 2.0


@pytest.mark.anyio
async def test_get_us_historical_performance_raises_when_no_series_data():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json={"series": {"annual": {}, "quarterly": {}}, "symbol": "ZZZZ"}
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        with pytest.raises(FundamentalsUnavailableError):
            await get_us_historical_performance("ZZZZ", client=http_client)


@pytest.mark.anyio
async def test_get_us_historical_performance_raises_on_http_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        with pytest.raises(FundamentalsUnavailableError):
            await get_us_historical_performance("AAPL", client=http_client)


def test_history_endpoint_returns_bist_empty_series_with_warning():
    response = client.get("/fundamentals/history", params={"symbol": "GARAN", "exchange": "BIST"})

    assert response.status_code == 200
    body = response.json()
    assert body["history"]["annual"] == []
    assert len(body["warnings"]) == 1


def test_history_endpoint_surfaces_warning_when_us_provider_unavailable(monkeypatch):
    async def failing_get_us_historical_performance(symbol: str):
        raise FundamentalsUnavailableError("boom")

    monkeypatch.setattr(
        main, "get_us_historical_performance", failing_get_us_historical_performance
    )

    response = client.get("/fundamentals/history", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 200
    body = response.json()
    assert body["history"] is None
    assert len(body["warnings"]) == 1


def test_history_endpoint_rejects_unknown_exchange():
    response = client.get("/fundamentals/history", params={"symbol": "AAPL", "exchange": "XYZ"})

    assert response.status_code == 400
