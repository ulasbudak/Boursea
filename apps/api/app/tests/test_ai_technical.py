from datetime import UTC, datetime

import numpy as np
import pytest

from app import ai_technical
from app.ai_reports import AIReportUnavailableError
from app.ai_technical import (
    Detection,
    _decode_detections,
    _summarize_detections,
    get_technical_report,
)
from app.market_data import CandlePoint, MarketDataUnavailableError

NOW = datetime(2026, 1, 1, tzinfo=UTC)


def _make_candles(n: int) -> list[CandlePoint]:
    return [
        CandlePoint(time=1_700_000_000 + i * 86400, open=100, high=101, low=99, close=100.5)
        for i in range(n)
    ]


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_returns_cached_report_without_running_inference(monkeypatch):
    monkeypatch.setattr(
        ai_technical,
        "get_cached_report",
        lambda symbol, exchange, report_type, ttl_hours: (
            {"report": "Önbellekteki teknik rapor", "detections": []},
            NOW,
        ),
    )

    def unexpected_call(candles):
        raise AssertionError("should not run inference when cache is fresh")

    monkeypatch.setattr(ai_technical, "_run_inference", unexpected_call)

    report = await get_technical_report("AAPL", "US")

    assert report.cached is True
    assert report.report == "Önbellekteki teknik rapor"


@pytest.mark.anyio
async def test_raises_for_bist_when_not_cached(monkeypatch):
    monkeypatch.setattr(ai_technical, "get_cached_report", lambda *a, **k: None)

    with pytest.raises(AIReportUnavailableError):
        await get_technical_report("GARAN", "BIST")


@pytest.mark.anyio
async def test_raises_when_candle_fetch_fails(monkeypatch):
    async def fake_get_us_candles(symbol, timeframe):
        raise MarketDataUnavailableError("no data")

    monkeypatch.setattr(ai_technical, "get_cached_report", lambda *a, **k: None)
    monkeypatch.setattr("app.market_data.get_us_candles", fake_get_us_candles)

    with pytest.raises(AIReportUnavailableError):
        await get_technical_report("AAPL", "US")


@pytest.mark.anyio
async def test_raises_when_too_few_candles(monkeypatch):
    async def fake_get_us_candles(symbol, timeframe):
        return _make_candles(5)

    monkeypatch.setattr(ai_technical, "get_cached_report", lambda *a, **k: None)
    monkeypatch.setattr("app.market_data.get_us_candles", fake_get_us_candles)

    with pytest.raises(AIReportUnavailableError):
        await get_technical_report("AAPL", "US")


@pytest.mark.anyio
async def test_generates_and_saves_report_on_cache_miss(monkeypatch):
    saved = {}

    async def fake_get_us_candles(symbol, timeframe):
        return _make_candles(30)

    def fake_run_inference(candles):
        return [Detection(label="Buy", confidence=0.8)]

    def fake_save_report(symbol, exchange, report_type, content):
        saved["symbol"] = symbol
        saved["report_type"] = report_type
        saved["content"] = content
        return NOW

    monkeypatch.setattr(ai_technical, "get_cached_report", lambda *a, **k: None)
    monkeypatch.setattr("app.market_data.get_us_candles", fake_get_us_candles)
    monkeypatch.setattr(ai_technical, "_run_inference", fake_run_inference)
    monkeypatch.setattr(ai_technical, "save_report", fake_save_report)

    report = await get_technical_report("AAPL", "US")

    assert report.cached is False
    assert report.detections == [Detection(label="Buy", confidence=0.8)]
    assert saved["symbol"] == "AAPL"
    assert saved["report_type"] == "technical"
    assert "Al" in report.report


def test_summarize_detections_handles_empty_list():
    text = _summarize_detections([])

    assert "tespit etmedi" in text
    assert "yatırım tavsiyesi değildir" in text


def test_summarize_detections_reports_counts_and_top_confidence():
    detections = [
        Detection(label="Buy", confidence=0.4),
        Detection(label="Sell", confidence=0.9),
    ]

    text = _summarize_detections(detections)

    assert "1 Al ve 1 Sat" in text
    assert "Sell" in text


def _yolo_output(rows: list[tuple[float, float, float, float, float, float]]) -> np.ndarray:
    """rows: (cx, cy, w, h, buy_score, sell_score) -> YOLOv8 head shape (1, 6, anchors)."""
    return np.array(rows, dtype=np.float32).T[None]


def test_decode_detections_drops_low_confidence_and_overlapping_boxes():
    output = _yolo_output(
        [
            (100, 100, 50, 50, 0.9, 0.1),  # kept: best Buy
            (102, 101, 50, 50, 0.6, 0.1),  # suppressed: overlaps the better Buy box
            (300, 100, 50, 50, 0.2, 0.25),  # dropped: below the confidence threshold
            (500, 100, 50, 50, 0.1, 0.7),  # kept: separate Sell box
        ]
    )

    detections = _decode_detections(output)

    assert [(d.label, round(d.confidence, 2)) for d in detections] == [
        ("Buy", 0.9),
        ("Sell", 0.7),
    ]


def test_decode_detections_keeps_overlapping_boxes_of_different_classes():
    output = _yolo_output(
        [
            (100, 100, 50, 50, 0.8, 0.1),
            (100, 100, 50, 50, 0.1, 0.6),
        ]
    )

    labels = sorted(d.label for d in _decode_detections(output))

    assert labels == ["Buy", "Sell"]
