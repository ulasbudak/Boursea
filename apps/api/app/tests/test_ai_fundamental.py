from datetime import UTC, datetime

import httpx
import pytest

from app import ai_fundamental, ai_reports
from app.ai_fundamental import AIReportUnavailableError, get_fundamental_report
from app.config import Settings
from app.fundamentals import FundamentalsSnapshot, FundamentalsUnavailableError

NOW = datetime(2026, 1, 1, tzinfo=UTC)


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    monkeypatch.setattr(
        ai_reports,
        "get_settings",
        lambda: Settings(anthropic_api_key="test-key", anthropic_model="claude-test"),
    )


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _anthropic_response() -> httpx.Response:
    return httpx.Response(
        200,
        json={"content": [{"type": "text", "text": "Test temel analiz raporu."}]},
    )


@pytest.mark.anyio
async def test_returns_cached_report_without_calling_anthropic(monkeypatch):
    monkeypatch.setattr(
        ai_fundamental,
        "get_cached_report",
        lambda symbol, exchange, report_type, ttl_hours: ({"report": "Önbellekteki rapor"}, NOW),
    )

    def unexpected_call(request: httpx.Request) -> httpx.Response:
        raise AssertionError("should not call Anthropic when cache is fresh")

    transport = httpx.MockTransport(unexpected_call)
    async with httpx.AsyncClient(transport=transport) as http_client:
        report = await get_fundamental_report("AAPL", "US", client=http_client)

    assert report.cached is True
    assert report.report == "Önbellekteki rapor"


@pytest.mark.anyio
async def test_raises_for_bist_when_not_cached(monkeypatch):
    monkeypatch.setattr(
        ai_fundamental, "get_cached_report", lambda *a, **k: None
    )

    with pytest.raises(AIReportUnavailableError):
        await get_fundamental_report("GARAN", "BIST")


@pytest.mark.anyio
async def test_raises_when_fundamentals_unavailable(monkeypatch):
    async def fake_get_us_fundamentals(symbol, *, client=None):
        raise FundamentalsUnavailableError("no data")

    monkeypatch.setattr(ai_fundamental, "get_cached_report", lambda *a, **k: None)
    monkeypatch.setattr(ai_fundamental, "get_us_fundamentals", fake_get_us_fundamentals)

    with pytest.raises(AIReportUnavailableError):
        await get_fundamental_report("AAPL", "US")


@pytest.mark.anyio
async def test_generates_and_saves_report_on_cache_miss(monkeypatch):
    saved = {}

    async def fake_get_us_fundamentals(symbol, *, client=None):
        return FundamentalsSnapshot(symbol="AAPL", exchange="US", pe_ratio=28.5)

    async def fake_get_us_sector_comparison(symbol, snapshot, *, client=None):
        return None

    async def fake_get_us_historical_performance(symbol, *, client=None):
        return None

    def fake_save_report(symbol, exchange, report_type, content):
        saved["symbol"] = symbol
        saved["exchange"] = exchange
        saved["report_type"] = report_type
        saved["content"] = content
        return NOW

    monkeypatch.setattr(ai_fundamental, "get_cached_report", lambda *a, **k: None)
    monkeypatch.setattr(ai_fundamental, "get_us_fundamentals", fake_get_us_fundamentals)
    monkeypatch.setattr(ai_fundamental, "get_us_sector_comparison", fake_get_us_sector_comparison)
    monkeypatch.setattr(
        ai_fundamental, "get_us_historical_performance", fake_get_us_historical_performance
    )
    monkeypatch.setattr(ai_fundamental, "save_report", fake_save_report)

    def handler(request: httpx.Request) -> httpx.Response:
        assert "anthropic.com" in str(request.url)
        assert request.headers["x-api-key"] == "test-key"
        return _anthropic_response()

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        report = await get_fundamental_report("AAPL", "US", client=http_client)

    assert report.cached is False
    assert report.report == "Test temel analiz raporu."
    assert saved["symbol"] == "AAPL"
    assert saved["report_type"] == "fundamental"
    assert saved["content"]["report"] == "Test temel analiz raporu."


@pytest.mark.anyio
async def test_raises_when_anthropic_key_missing(monkeypatch):
    monkeypatch.setattr(ai_reports, "get_settings", lambda: Settings(anthropic_api_key=""))
    monkeypatch.setattr(ai_fundamental, "get_cached_report", lambda *a, **k: None)

    async def fake_get_us_fundamentals(symbol, *, client=None):
        return FundamentalsSnapshot(symbol="AAPL", exchange="US", pe_ratio=28.5)

    async def fake_get_us_sector_comparison(symbol, snapshot, *, client=None):
        return None

    async def fake_get_us_historical_performance(symbol, *, client=None):
        return None

    monkeypatch.setattr(ai_fundamental, "get_us_fundamentals", fake_get_us_fundamentals)
    monkeypatch.setattr(ai_fundamental, "get_us_sector_comparison", fake_get_us_sector_comparison)
    monkeypatch.setattr(
        ai_fundamental, "get_us_historical_performance", fake_get_us_historical_performance
    )

    with pytest.raises(AIReportUnavailableError):
        await get_fundamental_report("AAPL", "US")


def test_get_cached_report_ignores_stale_rows(monkeypatch):
    from contextlib import contextmanager

    class FakeCursor:
        def execute(self, query, params=None):
            pass

        def fetchone(self):
            return {"content": {"report": "old"}, "generated_at": datetime(2020, 1, 1, tzinfo=UTC)}

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    class FakeConnection:
        def cursor(self, row_factory=None):
            return FakeCursor()

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    @contextmanager
    def fake_get_connection():
        yield FakeConnection()

    monkeypatch.setattr(ai_reports, "get_connection", fake_get_connection)

    result = ai_reports.get_cached_report("AAPL", "US", "fundamental", ttl_hours=24.0)

    assert result is None
