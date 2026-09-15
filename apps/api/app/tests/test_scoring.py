import time

import pytest
from fastapi.testclient import TestClient

from app import main
from app.fundamentals import FundamentalsSnapshot, FundamentalsUnavailableError
from app.market_data import CandlePoint, MarketDataUnavailableError
from app.scoring import _build_rationale, _compute_consensus, _score_consensus, compute_score, compute_us_score

client = TestClient(main.app)

DAY = 86400


def make_candles(closes: list[float], start_time: int | None = None) -> list[CandlePoint]:
    if start_time is None:
        start_time = int(time.time()) - len(closes) * DAY
    return [
        CandlePoint(time=start_time + i * DAY, open=c, high=c + 1, low=c - 1, close=c, volume=1000)
        for i, c in enumerate(closes)
    ]


STRONG_FUNDAMENTALS = FundamentalsSnapshot(
    symbol="AAPL",
    exchange="US",
    pe_ratio=12.0,
    roe=20.0,
    debt_to_equity=0.5,
    net_margin=20.0,
    eps_growth=10.0,
)

WEAK_FUNDAMENTALS = FundamentalsSnapshot(
    symbol="XYZ",
    exchange="US",
    pe_ratio=80.0,
    roe=1.0,
    debt_to_equity=5.0,
    net_margin=1.0,
    eps_growth=-5.0,
)


def test_compute_score_returns_none_when_fundamentals_entirely_missing():
    empty_fundamentals = FundamentalsSnapshot(symbol="AAPL", exchange="US")
    candles = make_candles([100.0 + i * 0.1 for i in range(250)])

    assert compute_score(empty_fundamentals, candles) is None
    assert compute_score(None, candles) is None


def test_compute_score_returns_none_when_too_few_candles():
    assert compute_score(STRONG_FUNDAMENTALS, make_candles([100.0] * 5)) is None
    assert compute_score(STRONG_FUNDAMENTALS, []) is None


def test_compute_score_strong_fundamentals_and_uptrend_scores_high():
    # Steady uptrend gives price > SMA50 > SMA200 and a mid-range RSI.
    candles = make_candles([100.0 + i * 0.3 for i in range(260)])

    result = compute_score(STRONG_FUNDAMENTALS, candles)

    assert result is not None
    assert result.value >= 70
    assert result.label == "Al"
    # Fundamental factors alone should already contribute their full 50 points.
    technical_names = {"Trend (Fiyat/SMA50/SMA200)", "RSI (14)", "Teknik Konsensüs"}
    fundamental_points = sum(f.points for f in result.factors if f.name not in technical_names)
    assert fundamental_points == 50


def test_compute_score_weak_fundamentals_and_downtrend_scores_low():
    candles = make_candles([200.0 - i * 0.3 for i in range(260)])

    result = compute_score(WEAK_FUNDAMENTALS, candles)

    assert result is not None
    assert result.value < 40
    assert result.label == "Sat"


def test_compute_score_factors_sum_to_value():
    candles = make_candles([100.0 + i * 0.2 for i in range(260)])
    result = compute_score(STRONG_FUNDAMENTALS, candles)

    assert result is not None
    assert round(sum(f.points for f in result.factors)) == result.value


def test_compute_score_label_boundaries():
    from app.scoring import _label_for

    assert _label_for(70) == "Al"
    assert _label_for(69) == "Nötr"
    assert _label_for(40) == "Nötr"
    assert _label_for(39) == "Sat"


def test_compute_score_includes_consensus_and_rationale():
    candles = make_candles([100.0 + i * 0.2 for i in range(260)])
    result = compute_score(STRONG_FUNDAMENTALS, candles)

    assert result is not None
    assert result.consensus.total <= 6
    assert result.consensus.bullish + result.consensus.bearish + result.consensus.neutral == result.consensus.total
    assert str(result.value) in result.rationale
    assert result.label in result.rationale
    assert "yatırım tavsiyesi değildir" in result.rationale


def test_compute_consensus_reads_oversold_rsi_and_stochastic_as_bullish():
    # Sharp, sustained decline pushes RSI and %K into oversold territory - read as a bullish
    # (mean-reversion) bias by _compute_consensus, distinct from how the signal list labels the
    # decline itself as bearish momentum.
    declining = make_candles([200.0 - i * 3 for i in range(60)])

    consensus = _compute_consensus(declining)

    assert consensus.total > 0
    assert consensus.bullish >= 1


def test_compute_consensus_reads_overbought_rsi_and_stochastic_as_bearish():
    rallying = make_candles([100.0 + i * 3 for i in range(60)])

    consensus = _compute_consensus(rallying)

    assert consensus.total > 0
    assert consensus.bearish >= 1


def test_score_consensus_factor_is_proportional_to_bullish_ratio():
    from app.scoring import TechnicalConsensus

    all_bullish = _score_consensus(TechnicalConsensus(bullish=6, bearish=0, neutral=0, total=6))
    all_bearish = _score_consensus(TechnicalConsensus(bullish=0, bearish=6, neutral=0, total=6))
    half = _score_consensus(TechnicalConsensus(bullish=3, bearish=3, neutral=0, total=6))
    empty = _score_consensus(TechnicalConsensus(bullish=0, bearish=0, neutral=0, total=0))

    assert all_bullish.points == pytest.approx(25.0)
    assert all_bearish.points == pytest.approx(0.0)
    assert half.points == pytest.approx(12.5)
    assert empty.points == pytest.approx(0.0)
    assert all_bullish.max_points == 25


def test_build_rationale_mentions_top_fundamental_factor():
    result = compute_score(STRONG_FUNDAMENTALS, make_candles([100.0 + i * 0.2 for i in range(260)]))

    assert result is not None
    # Every scored fundamental factor for STRONG_FUNDAMENTALS earns full points, so any one of
    # them may be picked as "top" - just assert the rationale references one of their labels.
    fundamental_labels = {"F/K Oranı", "ROE", "Borç/Özsermaye", "Net Kâr Marjı", "EPS Büyüme Oranı"}
    assert any(label in result.rationale for label in fundamental_labels)


@pytest.mark.anyio
async def test_compute_us_score_returns_none_when_fundamentals_unavailable(monkeypatch):
    async def failing_fundamentals(symbol: str):
        raise FundamentalsUnavailableError("boom")

    async def ok_candles(symbol: str, timeframe: str):
        return make_candles([100.0 + i * 0.2 for i in range(260)])

    monkeypatch.setattr("app.scoring.get_us_fundamentals", failing_fundamentals)
    monkeypatch.setattr("app.scoring.get_us_candles", ok_candles)

    result = await compute_us_score("AAPL")

    assert result is None


@pytest.mark.anyio
async def test_compute_us_score_returns_none_when_candles_unavailable(monkeypatch):
    async def ok_fundamentals(symbol: str):
        return STRONG_FUNDAMENTALS

    async def failing_candles(symbol: str, timeframe: str):
        raise MarketDataUnavailableError("boom")

    monkeypatch.setattr("app.scoring.get_us_fundamentals", ok_fundamentals)
    monkeypatch.setattr("app.scoring.get_us_candles", failing_candles)

    result = await compute_us_score("AAPL")

    assert result is None


@pytest.mark.anyio
async def test_compute_us_score_propagates_unexpected_errors(monkeypatch):
    async def broken_fundamentals(symbol: str):
        raise ValueError("unexpected bug")

    async def ok_candles(symbol: str, timeframe: str):
        return make_candles([100.0] * 260)

    monkeypatch.setattr("app.scoring.get_us_fundamentals", broken_fundamentals)
    monkeypatch.setattr("app.scoring.get_us_candles", ok_candles)

    with pytest.raises(ValueError):
        await compute_us_score("AAPL")


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_score_endpoint_returns_bist_none_with_warning():
    response = client.get("/symbols/score", params={"symbol": "GARAN", "exchange": "BIST"})

    assert response.status_code == 200
    body = response.json()
    assert body["score"] is None
    assert len(body["warnings"]) == 1


def test_score_endpoint_returns_computed_score_for_us(monkeypatch):
    async def fake_compute_us_score(symbol: str):
        return compute_score(STRONG_FUNDAMENTALS, make_candles([100.0 + i * 0.2 for i in range(260)]))

    monkeypatch.setattr(main, "compute_us_score", fake_compute_us_score)

    response = client.get("/symbols/score", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 200
    body = response.json()
    assert body["score"]["value"] >= 70
    assert body["score"]["label"] == "Al"
    assert len(body["score"]["factors"]) == 8
    assert "consensus" in body["score"]
    assert "total" in body["score"]["consensus"]
    assert isinstance(body["score"]["rationale"], str) and len(body["score"]["rationale"]) > 0
    assert body["warnings"] == []


def test_score_endpoint_warns_when_score_unavailable(monkeypatch):
    async def fake_compute_us_score(symbol: str):
        return None

    monkeypatch.setattr(main, "compute_us_score", fake_compute_us_score)

    response = client.get("/symbols/score", params={"symbol": "AAPL", "exchange": "US"})

    assert response.status_code == 200
    body = response.json()
    assert body["score"] is None
    assert len(body["warnings"]) == 1


def test_score_endpoint_rejects_unknown_exchange():
    response = client.get("/symbols/score", params={"symbol": "AAPL", "exchange": "XYZ"})

    assert response.status_code == 400
