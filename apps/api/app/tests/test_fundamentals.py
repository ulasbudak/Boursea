import httpx
import pytest
from fastapi.testclient import TestClient

from app import fundamentals, main
from app.config import Settings
from app.fundamentals import (
    FundamentalsUnavailableError,
    get_bist_fundamentals,
    get_us_fundamentals,
)

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    monkeypatch.setattr(
        fundamentals, "get_settings", lambda: Settings(finnhub_api_key="test-key")
    )


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
