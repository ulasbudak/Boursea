import pytest
from fastapi.testclient import TestClient

from app import highlights, main
from app.auth import get_current_claims
from app.market_data import MarketDataUnavailableError, StockOverview

FAKE_UNIVERSE = [
    {"symbol": "AAPL", "name": "Apple Inc", "sector": "Technology"},
    {"symbol": "XOM", "name": "Exxon Mobil", "sector": "Energy"},
    {"symbol": "MSFT", "name": "Microsoft Corp", "sector": "Technology"},
]


@pytest.mark.anyio
async def test_get_highlights_returns_warning_when_no_interests():
    result, warnings = await highlights.get_highlights([])

    assert result == []
    assert warnings == [highlights.NO_INTEREST_WARNING]


@pytest.mark.anyio
async def test_get_highlights_filters_by_sector_and_sorts_by_move_size(monkeypatch):
    monkeypatch.setattr(highlights, "load_us_universe", lambda: FAKE_UNIVERSE)

    async def fake_get_us_overview(symbol: str, *, client=None) -> StockOverview:
        moves = {"AAPL": 1.5, "MSFT": -8.0}
        return StockOverview(
            symbol=symbol, exchange="US", name=symbol, price=100.0, change_abs=1.0,
            change_pct=moves[symbol],
        )

    monkeypatch.setattr(highlights, "get_us_overview", fake_get_us_overview)

    result, warnings = await highlights.get_highlights(["Technology"])

    assert [h.symbol for h in result] == ["MSFT", "AAPL"]
    assert warnings == []


@pytest.mark.anyio
async def test_get_highlights_excludes_symbols_with_unavailable_price(monkeypatch):
    monkeypatch.setattr(highlights, "load_us_universe", lambda: FAKE_UNIVERSE)

    async def failing_get_us_overview(symbol: str, *, client=None) -> StockOverview:
        raise MarketDataUnavailableError("boom")

    monkeypatch.setattr(highlights, "get_us_overview", failing_get_us_overview)

    result, warnings = await highlights.get_highlights(["Technology"])

    assert result == []


@pytest.mark.anyio
async def test_get_highlights_returns_empty_when_no_symbols_in_sector(monkeypatch):
    monkeypatch.setattr(highlights, "load_us_universe", lambda: FAKE_UNIVERSE)

    result, warnings = await highlights.get_highlights(["Real Estate"])

    assert result == []
    assert warnings == []


@pytest.mark.anyio
async def test_get_highlights_caps_result_count(monkeypatch):
    big_universe = [
        {"symbol": f"S{i}", "name": f"Stock {i}", "sector": "Technology"} for i in range(20)
    ]
    monkeypatch.setattr(highlights, "load_us_universe", lambda: big_universe)

    async def fake_get_us_overview(symbol: str, *, client=None) -> StockOverview:
        return StockOverview(
            symbol=symbol, exchange="US", name=symbol, price=100.0, change_abs=1.0, change_pct=1.0
        )

    monkeypatch.setattr(highlights, "get_us_overview", fake_get_us_overview)

    result, _ = await highlights.get_highlights(["Technology"])

    assert len(result) == highlights.MAX_HIGHLIGHTS


# --- /highlights endpoint --------------------------------------------------------

client = TestClient(main.app)


def test_highlights_endpoint_reads_interest_sectors_from_jwt_claims(monkeypatch):
    captured = {}

    async def fake_get_highlights(interest_sectors):
        captured["sectors"] = interest_sectors
        return [], []

    monkeypatch.setattr(main, "get_highlights", fake_get_highlights)
    main.app.dependency_overrides[get_current_claims] = lambda: {
        "sub": "user-1",
        "user_metadata": {"interest_sectors": ["Technology", "Energy"]},
    }
    try:
        response = client.get("/highlights")
    finally:
        main.app.dependency_overrides.pop(get_current_claims, None)

    assert response.status_code == 200
    assert captured["sectors"] == ["Technology", "Energy"]


def test_highlights_endpoint_defaults_to_empty_list_without_metadata(monkeypatch):
    captured = {}

    async def fake_get_highlights(interest_sectors):
        captured["sectors"] = interest_sectors
        return [], []

    monkeypatch.setattr(main, "get_highlights", fake_get_highlights)
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    try:
        response = client.get("/highlights")
    finally:
        main.app.dependency_overrides.pop(get_current_claims, None)

    assert response.status_code == 200
    assert captured["sectors"] == []


def test_highlights_endpoint_requires_auth():
    response = client.get("/highlights")

    assert response.status_code == 401
