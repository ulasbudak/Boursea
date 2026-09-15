import httpx
import pytest
from fastapi.testclient import TestClient

from app import main, market_data
from app.config import Settings
from app.market_data import FinnhubError, SymbolResult, search_bist_symbols, search_us_symbols

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
