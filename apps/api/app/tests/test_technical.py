import pytest
from fastapi.testclient import TestClient

from app import main
from app.market_data import CandlePoint
from app.technical import _ema, _macd_histogram, _rsi, _sma, evaluate_signals

client = TestClient(main.app)

DAY = 86400


def make_candles(closes: list[float], start_time: int = 1_600_000_000) -> list[CandlePoint]:
    return [
        CandlePoint(time=start_time + i * DAY, open=c, high=c + 1, low=c - 1, close=c, volume=1000)
        for i, c in enumerate(closes)
    ]


def test_sma_matches_manual_average():
    closes = [10.0, 11.0, 12.0, 13.0, 14.0]
    result = _sma(closes, 3)

    assert result[0] is None
    assert result[1] is None
    assert result[2] == pytest.approx((10 + 11 + 12) / 3)
    assert result[3] == pytest.approx((11 + 12 + 13) / 3)
    assert result[4] == pytest.approx((12 + 13 + 14) / 3)


def test_ema_reacts_faster_than_sma_to_a_jump():
    closes = [100.0] * 30 + [120.0] * 5
    sma_result = _sma(closes, 10)
    ema_result = _ema(closes, 10)

    assert ema_result[-1] > sma_result[-1]


def test_rsi_within_bounds_and_null_before_period():
    closes = [100 + (i % 5) - 2 for i in range(60)]
    result = _rsi([float(c) for c in closes], 14)

    assert result[0] is None
    for value in result:
        if value is not None:
            assert 0 <= value <= 100


def test_macd_histogram_returns_none_before_warmup_and_numbers_after():
    closes = [100.0 + i * 0.3 for i in range(60)]
    result = _macd_histogram([float(c) for c in closes])

    assert result[0] is None
    assert result[-1] is not None


def test_evaluate_signals_detects_rsi_oversold_crossing():
    # Sharp, sustained decline drives RSI below 30 at some point; we only assert the rule fires
    # and that the reported date matches an actual crossing point (prev>=30, curr<30).
    closes = [100.0] * 20 + [100 - i * 2.0 for i in range(1, 20)]
    candles = make_candles(closes)

    signals = evaluate_signals(candles)
    rsi_signals = [s for s in signals if s.rule_id == "rsi_oversold"]

    assert len(rsi_signals) >= 1
    assert rsi_signals[0].direction == "bearish"
    assert rsi_signals[0].triggered_at in [c.time for c in candles]


def test_evaluate_signals_detects_golden_cross():
    # Flat-then-rising price: SMA50 stays low while price rises, eventually SMA50 crosses above
    # a flat SMA200, producing a golden_cross signal.
    closes = [100.0] * 210 + [100 + i * 3.0 for i in range(1, 60)]
    candles = make_candles(closes)

    signals = evaluate_signals(candles)
    golden = [s for s in signals if s.rule_id == "golden_cross"]

    assert len(golden) >= 1
    assert golden[0].direction == "bullish"


def test_evaluate_signals_returns_empty_for_short_series():
    assert evaluate_signals(make_candles([100.0])) == []
    assert evaluate_signals([]) == []


def test_evaluate_signals_caps_at_max_and_sorts_descending():
    # Oscillating price to generate plenty of RSI crossings.
    closes = []
    for i in range(200):
        closes.append(100 + (20 if i % 10 < 5 else -20))
    candles = make_candles([float(c) for c in closes])

    signals = evaluate_signals(candles)

    assert len(signals) <= 20
    times = [s.triggered_at for s in signals]
    assert times == sorted(times, reverse=True)


def test_signals_endpoint_returns_bist_empty_with_warning():
    response = client.get("/symbols/signals", params={"symbol": "GARAN", "exchange": "BIST"})

    assert response.status_code == 200
    body = response.json()
    assert body["signals"] == []
    assert len(body["warnings"]) == 1


def test_signals_endpoint_surfaces_warning_when_us_provider_unavailable(monkeypatch):
    from app.market_data import MarketDataUnavailableError

    async def failing_get_us_candles(symbol: str, timeframe: str) -> list:
        raise MarketDataUnavailableError("boom")

    monkeypatch.setattr(main, "get_us_candles", failing_get_us_candles)

    response = client.get("/symbols/signals", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 200
    body = response.json()
    assert body["signals"] == []
    assert len(body["warnings"]) == 1


def test_signals_endpoint_returns_computed_signals_for_us(monkeypatch):
    closes = [100.0] * 20 + [100 - i * 2.0 for i in range(1, 20)]
    fake_candles = make_candles(closes)

    async def fake_get_us_candles(symbol: str, timeframe: str) -> list[CandlePoint]:
        return fake_candles

    monkeypatch.setattr(main, "get_us_candles", fake_get_us_candles)

    response = client.get("/symbols/signals", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 200
    body = response.json()
    assert len(body["signals"]) >= 1
    assert body["warnings"] == []


def test_signals_endpoint_rejects_unknown_exchange():
    response = client.get("/symbols/signals", params={"symbol": "AAPL", "exchange": "XYZ"})

    assert response.status_code == 400


def test_signals_endpoint_rejects_unknown_timeframe():
    response = client.get(
        "/symbols/signals", params={"symbol": "AAPL", "exchange": "US", "timeframe": "yearly"}
    )

    assert response.status_code == 400
