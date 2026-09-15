import httpx
import pytest
from fastapi.testclient import TestClient

from app import main, market_data
from app.config import Settings
from app.market_data import (
    FinnhubError,
    MarketDataUnavailableError,
    SymbolResult,
    get_bist_candles,
    get_bist_overview,
    get_us_candles,
    get_us_overview,
    search_bist_symbols,
    search_us_symbols,
)

client = TestClient(main.app)

BIST_FIXTURE = [
    {"symbol": "GARAN", "name": "Garanti BBVA"},
    {"symbol": "AKBNK", "name": "Akbank"},
    {"symbol": "THYAO", "name": "Türk Hava Yolları"},
]


def test_search_bist_symbols_matches_by_prefix():
    results = search_bist_symbols("GAR", BIST_FIXTURE)

    assert [r.symbol for r in results] == ["GARAN"]
    assert results[0].exchange == "BIST"


def test_search_bist_symbols_matches_by_name_substring():
    results = search_bist_symbols("hava", BIST_FIXTURE)

    assert [r.symbol for r in results] == ["THYAO"]


def test_search_bist_symbols_falls_back_to_fuzzy_match_on_typo():
    results = search_bist_symbols("GARAB", BIST_FIXTURE)

    assert "GARAN" in [r.symbol for r in results]


def test_search_bist_symbols_returns_empty_for_no_match():
    results = search_bist_symbols("zzzznotarealquery", BIST_FIXTURE)

    assert results == []


def test_search_bist_symbols_returns_empty_for_blank_query():
    assert search_bist_symbols("", BIST_FIXTURE) == []


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    monkeypatch.setattr(
        market_data, "get_settings", lambda: Settings(finnhub_api_key="test-key")
    )


@pytest.mark.anyio
async def test_search_us_symbols_parses_finnhub_response():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["q"] == "AAPL"
        assert request.url.params["token"] == "test-key"
        return httpx.Response(
            200,
            json={
                "count": 1,
                "result": [
                    {
                        "description": "APPLE INC",
                        "displaySymbol": "AAPL",
                        "symbol": "AAPL",
                        "type": "Common Stock",
                    }
                ],
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        results = await search_us_symbols("AAPL", client=client)

    assert results == [
        market_data.SymbolResult(symbol="AAPL", name="APPLE INC", exchange="US")
    ]


@pytest.mark.anyio
async def test_search_us_symbols_raises_finnhub_error_on_http_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(FinnhubError):
            await search_us_symbols("AAPL", client=client)


@pytest.mark.anyio
async def test_search_us_symbols_raises_without_api_key(monkeypatch):
    monkeypatch.setattr(market_data, "get_settings", lambda: Settings(finnhub_api_key=""))

    with pytest.raises(FinnhubError):
        await search_us_symbols("AAPL")


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_search_endpoint_returns_bist_results_with_exchange_label(monkeypatch):
    async def fake_search_us_symbols(query: str) -> list[SymbolResult]:
        return []

    monkeypatch.setattr(main, "search_us_symbols", fake_search_us_symbols)

    response = client.get("/symbols/search", params={"q": "GARAN", "exchange": "BIST"})

    assert response.status_code == 200
    body = response.json()
    assert body["results"][0]["symbol"] == "GARAN"
    assert body["results"][0]["exchange"] == "BIST"
    assert body["warnings"] == []


def test_search_endpoint_returns_empty_results_for_no_match():
    response = client.get("/symbols/search", params={"q": "zzzznotarealquery", "exchange": "BIST"})

    assert response.status_code == 200
    assert response.json() == {"results": [], "warnings": []}


def test_search_endpoint_surfaces_warning_when_finnhub_unavailable(monkeypatch):
    async def failing_search_us_symbols(query: str) -> list[SymbolResult]:
        raise FinnhubError("boom")

    monkeypatch.setattr(main, "search_us_symbols", failing_search_us_symbols)

    response = client.get("/symbols/search", params={"q": "GARAN", "exchange": "ALL"})

    assert response.status_code == 200
    body = response.json()
    assert any(r["symbol"] == "GARAN" for r in body["results"])
    assert len(body["warnings"]) == 1


def test_get_bist_overview_resolves_known_symbol(monkeypatch):
    monkeypatch.setattr(market_data, "load_bist_symbols", lambda: BIST_FIXTURE)

    overview = get_bist_overview("garan")

    assert overview.symbol == "GARAN"
    assert overview.exchange == "BIST"
    assert overview.name == "Garanti BBVA"
    assert overview.price is None


def test_get_bist_overview_falls_back_to_symbol_when_unknown(monkeypatch):
    monkeypatch.setattr(market_data, "load_bist_symbols", lambda: BIST_FIXTURE)

    overview = get_bist_overview("ZZZZ")

    assert overview.name == "ZZZZ"
    assert overview.price is None


@pytest.mark.anyio
async def test_get_us_overview_parses_finnhub_response():
    def handler(request: httpx.Request) -> httpx.Response:
        if "quote" in str(request.url):
            return httpx.Response(
                200, json={"c": 190.5, "d": 1.5, "dp": 0.79, "pc": 189.0}
            )
        return httpx.Response(
            200,
            json={
                "name": "Apple Inc",
                "marketCapitalization": 3_000_000.0,
                "currency": "USD",
                "finnhubIndustry": "Technology",
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        overview = await get_us_overview("AAPL", client=client)

    assert overview.symbol == "AAPL"
    assert overview.exchange == "US"
    assert overview.name == "Apple Inc"
    assert overview.price == 190.5
    assert overview.change_abs == 1.5
    assert overview.change_pct == 0.79
    assert overview.market_cap == 3_000_000.0 * 1_000_000
    assert overview.currency == "USD"
    assert overview.sector == "Technology"


@pytest.mark.anyio
async def test_get_us_overview_raises_on_zero_quote():
    def handler(request: httpx.Request) -> httpx.Response:
        if "quote" in str(request.url):
            return httpx.Response(200, json={"c": 0, "d": 0, "dp": 0, "pc": 0})
        return httpx.Response(200, json={"name": "Unknown"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(MarketDataUnavailableError):
            await get_us_overview("ZZZZ", client=client)


@pytest.mark.anyio
async def test_get_us_overview_raises_on_http_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(MarketDataUnavailableError):
            await get_us_overview("AAPL", client=client)


@pytest.mark.anyio
async def test_get_us_overview_raises_without_api_key(monkeypatch):
    monkeypatch.setattr(market_data, "get_settings", lambda: Settings(finnhub_api_key=""))

    with pytest.raises(MarketDataUnavailableError):
        await get_us_overview("AAPL")


def test_overview_endpoint_returns_bist_overview_with_warning(monkeypatch):
    monkeypatch.setattr(market_data, "load_bist_symbols", lambda: BIST_FIXTURE)

    response = client.get("/symbols/overview", params={"symbol": "GARAN", "exchange": "BIST"})

    assert response.status_code == 200
    body = response.json()
    assert body["overview"]["name"] == "Garanti BBVA"
    assert body["overview"]["price"] is None
    assert len(body["warnings"]) == 1


def test_overview_endpoint_surfaces_warning_when_us_provider_unavailable(monkeypatch):
    async def failing_get_us_overview(symbol: str) -> None:
        raise MarketDataUnavailableError("boom")

    monkeypatch.setattr(main, "get_us_overview", failing_get_us_overview)

    response = client.get("/symbols/overview", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 200
    body = response.json()
    assert body["overview"] is None
    assert len(body["warnings"]) == 1


def test_overview_endpoint_rejects_unknown_exchange():
    response = client.get("/symbols/overview", params={"symbol": "AAPL", "exchange": "XYZ"})

    assert response.status_code == 400


def test_get_bist_candles_returns_empty_list():
    assert get_bist_candles("GARAN", "daily") == []


@pytest.mark.anyio
async def test_get_us_candles_sends_correct_resolution_per_timeframe():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["resolution"] = request.url.params["resolution"]
        captured["from"] = int(request.url.params["from"])
        captured["to"] = int(request.url.params["to"])
        return httpx.Response(200, json={"s": "ok", "t": [], "o": [], "h": [], "l": [], "c": [], "v": []})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        await get_us_candles("AAPL", "weekly", client=http_client)

    assert captured["resolution"] == "W"
    assert captured["to"] - captured["from"] == 5 * 365 * 86400


@pytest.mark.anyio
async def test_get_us_candles_parses_successful_response():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "s": "ok",
                "t": [1000, 2000],
                "o": [10.0, 11.0],
                "h": [12.0, 13.0],
                "l": [9.0, 10.5],
                "c": [11.5, 12.5],
                "v": [1000, 1500],
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        candles = await get_us_candles("AAPL", "daily", client=http_client)

    assert len(candles) == 2
    assert candles[0].time == 1000
    assert candles[0].open == 10.0
    assert candles[0].close == 11.5
    assert candles[0].volume == 1000
    assert candles[1].close == 12.5


@pytest.mark.anyio
async def test_get_us_candles_raises_when_no_data():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"s": "no_data"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        with pytest.raises(MarketDataUnavailableError):
            await get_us_candles("ZZZZ", "daily", client=http_client)


@pytest.mark.anyio
async def test_get_us_candles_raises_on_http_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        with pytest.raises(MarketDataUnavailableError):
            await get_us_candles("AAPL", "daily", client=http_client)


@pytest.mark.anyio
async def test_get_us_candles_raises_without_api_key(monkeypatch):
    monkeypatch.setattr(market_data, "get_settings", lambda: Settings(finnhub_api_key=""))

    with pytest.raises(MarketDataUnavailableError):
        await get_us_candles("AAPL", "daily")


def test_candles_endpoint_returns_bist_empty_with_warning():
    response = client.get("/symbols/candles", params={"symbol": "GARAN", "exchange": "BIST"})

    assert response.status_code == 200
    body = response.json()
    assert body["candles"] == []
    assert len(body["warnings"]) == 1


def test_candles_endpoint_surfaces_warning_when_us_provider_unavailable(monkeypatch):
    async def failing_get_us_candles(symbol: str, timeframe: str) -> list:
        raise MarketDataUnavailableError("boom")

    monkeypatch.setattr(main, "get_us_candles", failing_get_us_candles)

    response = client.get("/symbols/candles", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 200
    body = response.json()
    assert body["candles"] == []
    assert len(body["warnings"]) == 1


def test_candles_endpoint_rejects_unknown_exchange():
    response = client.get("/symbols/candles", params={"symbol": "AAPL", "exchange": "XYZ"})

    assert response.status_code == 400


def test_candles_endpoint_rejects_unknown_timeframe():
    response = client.get(
        "/symbols/candles", params={"symbol": "AAPL", "exchange": "US", "timeframe": "yearly"}
    )

    assert response.status_code == 400
