from datetime import UTC, datetime

import pytest

from app import ai_combined
from app.ai_fundamental import FundamentalAIReport
from app.ai_technical import TechnicalAIReport

NOW = datetime(2026, 1, 1, tzinfo=UTC)


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _fundamental_report() -> FundamentalAIReport:
    return FundamentalAIReport(
        symbol="AAPL", exchange="US", report="Temel: güçlü.", generated_at=NOW, cached=True
    )


def _technical_report() -> TechnicalAIReport:
    return TechnicalAIReport(
        symbol="AAPL",
        exchange="US",
        report="Teknik: yükseliş.",
        detections=[],
        generated_at=NOW,
        cached=True,
    )


@pytest.mark.anyio
async def test_returns_cached_report_without_generating(monkeypatch):
    monkeypatch.setattr(
        ai_combined,
        "get_cached_report",
        lambda symbol, exchange, report_type, ttl_hours: (
            {"report": "Önbellekteki ortak rapor"},
            NOW,
        ),
    )

    async def unexpected(*a, **k):
        raise AssertionError("should not fetch underlying reports when cache is fresh")

    monkeypatch.setattr(ai_combined, "get_fundamental_report", unexpected)
    monkeypatch.setattr(ai_combined, "get_technical_report", unexpected)

    report = await ai_combined.get_combined_report("AAPL", "US")

    assert report.cached is True
    assert report.report == "Önbellekteki ortak rapor"


@pytest.mark.anyio
async def test_generates_from_both_underlying_reports_on_cache_miss(monkeypatch):
    saved = {}

    async def fake_get_fundamental_report(symbol, exchange):
        return _fundamental_report()

    async def fake_get_technical_report(symbol, exchange):
        return _technical_report()

    async def fake_call_gemini(system_prompt, user_prompt, *, client=None):
        assert "Temel: güçlü." in user_prompt
        assert "Teknik: yükseliş." in user_prompt
        return "Sentezlenmiş ortak rapor."

    def fake_save_report(symbol, exchange, report_type, content):
        saved["symbol"] = symbol
        saved["report_type"] = report_type
        saved["content"] = content
        return NOW

    monkeypatch.setattr(ai_combined, "get_cached_report", lambda *a, **k: None)
    monkeypatch.setattr(ai_combined, "get_fundamental_report", fake_get_fundamental_report)
    monkeypatch.setattr(ai_combined, "get_technical_report", fake_get_technical_report)
    monkeypatch.setattr(ai_combined, "call_gemini", fake_call_gemini)
    monkeypatch.setattr(ai_combined, "save_report", fake_save_report)

    report = await ai_combined.get_combined_report("AAPL", "US")

    assert report.cached is False
    assert report.report == "Sentezlenmiş ortak rapor."
    assert saved["report_type"] == "combined"


@pytest.mark.anyio
async def test_propagates_error_when_underlying_report_unavailable(monkeypatch):
    from app.ai_reports import AIReportUnavailableError

    async def failing_fundamental(symbol, exchange):
        raise AIReportUnavailableError(
            "Temel analiz AI raporu BIST borsası için henüz desteklenmiyor."
        )

    async def fake_get_technical_report(symbol, exchange):
        return _technical_report()

    monkeypatch.setattr(ai_combined, "get_cached_report", lambda *a, **k: None)
    monkeypatch.setattr(ai_combined, "get_fundamental_report", failing_fundamental)
    monkeypatch.setattr(ai_combined, "get_technical_report", fake_get_technical_report)

    with pytest.raises(AIReportUnavailableError):
        await ai_combined.get_combined_report("GARAN", "BIST")
