import pytest
from fastapi.testclient import TestClient

from app import comparison, main
from app.comparison import ComparisonEntry, compare_symbols
from app.fundamentals import FundamentalsSnapshot, FundamentalsUnavailableError
from app.market_data import CandlePoint, MarketDataUnavailableError

client = TestClient(main.app)


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _snapshot(symbol: str, **kwargs) -> FundamentalsSnapshot:
    return FundamentalsSnapshot(symbol=symbol, exchange="US", **kwargs)


def _candles(count: int = 20) -> list[CandlePoint]:
    return [
        CandlePoint(
            time=i, open=10.0 + i, high=10.0 + i, low=10.0 + i, close=10.0 + i, volume=1_000.0
        )
        for i in range(count)
    ]


# --- app/comparison.py (data layer) ----------------------------------------------


@pytest.mark.anyio
async def test_compare_symbols_returns_us_entries_with_score_and_rsi(monkeypatch):
    async def fake_get_us_fundamentals(symbol, *, client=None):
        return _snapshot(symbol, market_cap=1_000, pe_ratio=10.0, roe=20.0)

    async def fake_get_us_candles(symbol, timeframe, *, client=None):
        return _candles()

    monkeypatch.setattr(comparison, "get_us_fundamentals", fake_get_us_fundamentals)
    monkeypatch.setattr(comparison, "get_us_candles", fake_get_us_candles)

    results = await compare_symbols([("AAA", "US"), ("BBB", "US")])

    assert [r.symbol for r in results] == ["AAA", "BBB"]
    assert all(r.fundamentals is not None for r in results)
    assert all(r.rsi is not None for r in results)
    assert all(r.warnings == [] for r in results)


@pytest.mark.anyio
async def test_compare_symbols_us_handles_unavailable_fundamentals(monkeypatch):
    async def fake_get_us_fundamentals(symbol, *, client=None):
        raise FundamentalsUnavailableError("boom")

    async def fake_get_us_candles(symbol, timeframe, *, client=None):
        return _candles()

    monkeypatch.setattr(comparison, "get_us_fundamentals", fake_get_us_fundamentals)
    monkeypatch.setattr(comparison, "get_us_candles", fake_get_us_candles)

    results = await compare_symbols([("AAA", "US"), ("BBB", "US")])

    assert all(r.fundamentals is None for r in results)
    assert all(len(r.warnings) == 1 for r in results)


@pytest.mark.anyio
async def test_compare_symbols_us_handles_unavailable_candles(monkeypatch):
    async def fake_get_us_fundamentals(symbol, *, client=None):
        return _snapshot(symbol, market_cap=1_000, pe_ratio=10.0)

    async def fake_get_us_candles(symbol, timeframe, *, client=None):
        raise MarketDataUnavailableError("boom")

    monkeypatch.setattr(comparison, "get_us_fundamentals", fake_get_us_fundamentals)
    monkeypatch.setattr(comparison, "get_us_candles", fake_get_us_candles)

    results = await compare_symbols([("AAA", "US")])

    assert results[0].rsi is None
    assert results[0].score is None
    assert len(results[0].warnings) == 1


@pytest.mark.anyio
async def test_compare_symbols_bist_returns_placeholder_with_warning():
    results = await compare_symbols([("THYAO", "BIST")])

    assert results[0].symbol == "THYAO"
    assert results[0].exchange == "BIST"
    assert results[0].score is None
    assert results[0].rsi is None
    assert len(results[0].warnings) == 1


@pytest.mark.anyio
async def test_compare_symbols_mixed_exchanges(monkeypatch):
    async def fake_get_us_fundamentals(symbol, *, client=None):
        return _snapshot(symbol, market_cap=1_000, pe_ratio=10.0)

    async def fake_get_us_candles(symbol, timeframe, *, client=None):
        return _candles()

    monkeypatch.setattr(comparison, "get_us_fundamentals", fake_get_us_fundamentals)
    monkeypatch.setattr(comparison, "get_us_candles", fake_get_us_candles)

    results = await compare_symbols([("AAA", "US"), ("THYAO", "BIST")])

    assert [r.exchange for r in results] == ["US", "BIST"]


# --- /compare endpoint ------------------------------------------------------------


def test_compare_endpoint_returns_results(monkeypatch):
    async def fake_compare_symbols(entries):
        assert entries == [("AAA", "US"), ("BBB", "US")]
        return [
            ComparisonEntry(symbol="AAA", exchange="US"),
            ComparisonEntry(symbol="BBB", exchange="US"),
        ]

    monkeypatch.setattr(main, "compare_symbols", fake_compare_symbols)

    response = client.get("/compare", params={"symbols": "AAA:US,BBB:US"})

    assert response.status_code == 200
    body = response.json()
    assert [r["symbol"] for r in body["results"]] == ["AAA", "BBB"]
    assert body["warnings"] == []


def test_compare_endpoint_collects_warnings(monkeypatch):
    async def fake_compare_symbols(entries):
        return [
            ComparisonEntry(symbol="AAA", exchange="US", warnings=["uyarı"]),
            ComparisonEntry(symbol="BBB", exchange="US"),
        ]

    monkeypatch.setattr(main, "compare_symbols", fake_compare_symbols)

    response = client.get("/compare", params={"symbols": "AAA:US,BBB:US"})

    assert response.status_code == 200
    assert response.json()["warnings"] == ["uyarı"]


def test_compare_endpoint_rejects_too_few_symbols():
    response = client.get("/compare", params={"symbols": "AAA:US"})

    assert response.status_code == 400


def test_compare_endpoint_rejects_too_many_symbols():
    response = client.get(
        "/compare", params={"symbols": "AAA:US,BBB:US,CCC:US,DDD:US,EEE:US"}
    )

    assert response.status_code == 400


def test_compare_endpoint_rejects_bad_format():
    response = client.get("/compare", params={"symbols": "AAA,BBB:US"})

    assert response.status_code == 400


def test_compare_endpoint_rejects_bad_exchange():
    response = client.get("/compare", params={"symbols": "AAA:XYZ,BBB:US"})

    assert response.status_code == 400
