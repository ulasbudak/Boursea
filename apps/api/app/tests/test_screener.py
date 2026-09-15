import asyncio

import pytest
from fastapi.testclient import TestClient

from app import main, screener
from app.config import Settings
from app.fundamentals import FundamentalsSnapshot, FundamentalsUnavailableError
from app.market_data import CandlePoint, MarketDataUnavailableError
from app.screener import ScreenerCriteria, run_screener

client = TestClient(main.app)

FAKE_UNIVERSE = [
    {"symbol": "AAA", "name": "Alpha Corp", "sector": "Technology"},
    {"symbol": "BBB", "name": "Beta Corp", "sector": "Technology"},
    {"symbol": "CCC", "name": "Gamma Corp", "sector": "Healthcare"},
]


@pytest.fixture(autouse=True)
def patch_settings_and_cache(monkeypatch):
    monkeypatch.setattr(screener, "get_settings", lambda: Settings(finnhub_api_key="test-key"))
    monkeypatch.setattr(screener, "load_us_universe", lambda: FAKE_UNIVERSE)
    screener._fundamentals_cache.clear()
    yield
    screener._fundamentals_cache.clear()


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _snapshot(symbol: str, **kwargs) -> FundamentalsSnapshot:
    return FundamentalsSnapshot(symbol=symbol, exchange="US", **kwargs)


@pytest.mark.anyio
async def test_run_screener_filters_by_market_cap_and_pe(monkeypatch):
    snapshots = {
        "AAA": _snapshot("AAA", market_cap=1_000, pe_ratio=10.0),
        "BBB": _snapshot("BBB", market_cap=5_000, pe_ratio=30.0),
        "CCC": _snapshot("CCC", market_cap=2_000, pe_ratio=15.0),
    }

    async def fake_get_us_fundamentals(symbol, *, client=None):
        return snapshots[symbol]

    monkeypatch.setattr(screener, "get_us_fundamentals", fake_get_us_fundamentals)

    results, warnings = await run_screener(
        ScreenerCriteria(exchange="US", market_cap_min=1_500, pe_max=20.0)
    )

    assert warnings == []
    assert [r.symbol for r in results] == ["CCC"]


@pytest.mark.anyio
async def test_run_screener_applies_sector_prefilter_before_fetching(monkeypatch):
    called_symbols: list[str] = []

    async def fake_get_us_fundamentals(symbol, *, client=None):
        called_symbols.append(symbol)
        return _snapshot(symbol, market_cap=1_000, pe_ratio=10.0)

    monkeypatch.setattr(screener, "get_us_fundamentals", fake_get_us_fundamentals)

    results, _ = await run_screener(ScreenerCriteria(exchange="US", sector="Healthcare"))

    assert called_symbols == ["CCC"]
    assert [r.symbol for r in results] == ["CCC"]


@pytest.mark.anyio
async def test_run_screener_skips_symbols_with_unavailable_fundamentals(monkeypatch):
    async def fake_get_us_fundamentals(symbol, *, client=None):
        if symbol == "AAA":
            raise FundamentalsUnavailableError("boom")
        return _snapshot(symbol, market_cap=1_000, pe_ratio=10.0)

    monkeypatch.setattr(screener, "get_us_fundamentals", fake_get_us_fundamentals)

    results, _ = await run_screener(ScreenerCriteria(exchange="US"))

    assert "AAA" not in [r.symbol for r in results]
    assert {r.symbol for r in results} == {"BBB", "CCC"}


@pytest.mark.anyio
async def test_run_screener_applies_technical_filter_only_to_survivors(monkeypatch):
    fetched_candles_for: list[str] = []

    async def fake_get_us_fundamentals(symbol, *, client=None):
        # Only AAA passes the cheap fundamentals pre-filter.
        pe = 10.0 if symbol == "AAA" else 50.0
        return _snapshot(symbol, market_cap=1_000, pe_ratio=pe)

    async def fake_get_us_candles(symbol, timeframe, *, client=None):
        fetched_candles_for.append(symbol)
        closes = [10.0 + i for i in range(20)]
        return [
            CandlePoint(time=i, open=c, high=c, low=c, close=c, volume=1_000.0)
            for i, c in enumerate(closes)
        ]

    monkeypatch.setattr(screener, "get_us_fundamentals", fake_get_us_fundamentals)
    monkeypatch.setattr(screener, "get_us_candles", fake_get_us_candles)

    results, _ = await run_screener(ScreenerCriteria(exchange="US", pe_max=20.0, volume_min=500.0))

    # Candle data is only fetched for the fundamentals-filter survivor (AAA).
    assert fetched_candles_for == ["AAA"]
    assert [r.symbol for r in results] == ["AAA"]
    assert results[0].volume == 1_000.0
    assert results[0].rsi is not None


@pytest.mark.anyio
async def test_run_screener_technical_filter_excludes_on_candle_failure(monkeypatch):
    async def fake_get_us_fundamentals(symbol, *, client=None):
        return _snapshot(symbol, market_cap=1_000, pe_ratio=10.0)

    async def fake_get_us_candles(symbol, timeframe, *, client=None):
        raise MarketDataUnavailableError("boom")

    monkeypatch.setattr(screener, "get_us_fundamentals", fake_get_us_fundamentals)
    monkeypatch.setattr(screener, "get_us_candles", fake_get_us_candles)

    results, _ = await run_screener(ScreenerCriteria(exchange="US", volume_min=1.0))

    assert results == []


@pytest.mark.anyio
async def test_get_cached_fundamentals_uses_cache_within_ttl(monkeypatch):
    call_count = 0

    async def fake_get_us_fundamentals(symbol, *, client=None):
        nonlocal call_count
        call_count += 1
        return _snapshot(symbol, market_cap=1_000, pe_ratio=10.0)

    monkeypatch.setattr(screener, "get_us_fundamentals", fake_get_us_fundamentals)
    semaphore = asyncio.Semaphore(5)

    import httpx

    async with httpx.AsyncClient() as http_client:
        first = await screener._get_cached_fundamentals(
            "AAA", client=http_client, semaphore=semaphore
        )
        second = await screener._get_cached_fundamentals(
            "AAA", client=http_client, semaphore=semaphore
        )

    assert call_count == 1
    assert first == second


@pytest.mark.anyio
async def test_get_cached_fundamentals_refetches_after_ttl_expires(monkeypatch):
    call_count = 0

    async def fake_get_us_fundamentals(symbol, *, client=None):
        nonlocal call_count
        call_count += 1
        return _snapshot(symbol, market_cap=float(call_count), pe_ratio=10.0)

    monkeypatch.setattr(screener, "get_us_fundamentals", fake_get_us_fundamentals)
    semaphore = asyncio.Semaphore(5)

    fake_time = [1_000.0]
    monkeypatch.setattr(screener.time, "time", lambda: fake_time[0])

    import httpx

    async with httpx.AsyncClient() as http_client:
        first = await screener._get_cached_fundamentals(
            "AAA", client=http_client, semaphore=semaphore
        )
        fake_time[0] += screener.CACHE_TTL_SECONDS + 1
        second = await screener._get_cached_fundamentals(
            "AAA", client=http_client, semaphore=semaphore
        )

    assert call_count == 2
    assert first.market_cap != second.market_cap


@pytest.mark.anyio
async def test_run_screener_respects_concurrency_limit(monkeypatch):
    monkeypatch.setattr(screener, "MAX_CONCURRENT_REQUESTS", 3)
    universe = [
        {"symbol": f"S{i}", "name": f"Stock {i}", "sector": "Technology"} for i in range(10)
    ]
    monkeypatch.setattr(screener, "load_us_universe", lambda: universe)

    active = 0
    max_active = 0

    async def fake_get_us_fundamentals(symbol, *, client=None):
        nonlocal active, max_active
        active += 1
        max_active = max(max_active, active)
        await asyncio.sleep(0.01)
        active -= 1
        return _snapshot(symbol, market_cap=1_000, pe_ratio=10.0)

    monkeypatch.setattr(screener, "get_us_fundamentals", fake_get_us_fundamentals)

    await run_screener(ScreenerCriteria(exchange="US"))

    assert max_active <= 3


@pytest.mark.anyio
async def test_run_screener_bist_returns_empty_with_warning():
    results, warnings = await run_screener(ScreenerCriteria(exchange="BIST"))

    assert results == []
    assert len(warnings) == 1


@pytest.mark.anyio
async def test_run_screener_all_includes_bist_warning_and_us_results(monkeypatch):
    async def fake_get_us_fundamentals(symbol, *, client=None):
        return _snapshot(symbol, market_cap=1_000, pe_ratio=10.0)

    monkeypatch.setattr(screener, "get_us_fundamentals", fake_get_us_fundamentals)

    results, warnings = await run_screener(ScreenerCriteria(exchange="ALL"))

    assert len(results) == len(FAKE_UNIVERSE)
    assert len(warnings) == 1


@pytest.mark.anyio
async def test_run_screener_without_api_key_returns_warning(monkeypatch):
    monkeypatch.setattr(screener, "get_settings", lambda: Settings(finnhub_api_key=""))

    results, warnings = await run_screener(ScreenerCriteria(exchange="US"))

    assert results == []
    assert len(warnings) == 1


def test_screener_endpoint_returns_bist_empty_with_warning():
    response = client.get("/screener/run", params={"exchange": "BIST"})

    assert response.status_code == 200
    body = response.json()
    assert body["results"] == []
    assert len(body["warnings"]) == 1


def test_screener_endpoint_filters_us_results(monkeypatch):
    async def fake_run_screener(criteria):
        assert criteria.pe_max == 15.0
        return (
            [
                screener.ScreenerResult(
                    symbol="AAA", exchange="US", name="Alpha Corp", pe_ratio=10.0
                )
            ],
            [],
        )

    monkeypatch.setattr(main, "run_screener", fake_run_screener)

    response = client.get("/screener/run", params={"exchange": "US", "pe_max": 15.0})

    assert response.status_code == 200
    body = response.json()
    assert len(body["results"]) == 1
    assert body["results"][0]["symbol"] == "AAA"


def test_screener_endpoint_rejects_unknown_exchange():
    response = client.get("/screener/run", params={"exchange": "XYZ"})

    assert response.status_code == 400
