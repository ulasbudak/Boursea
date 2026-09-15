import asyncio
import time

from pydantic import BaseModel

from app.fundamentals import FundamentalsSnapshot, FundamentalsUnavailableError, get_us_fundamentals
from app.market_data import CandlePoint, MarketDataUnavailableError, get_us_candles
from app.technical import _rsi, _sma, evaluate_signals

MIN_CANDLES_FOR_TECHNICAL = 15
NINETY_DAYS_SECONDS = 90 * 86400


class ScoreFactor(BaseModel):
    name: str
    points: float
    max_points: float


class StockScore(BaseModel):
    value: int
    label: str
    factors: list[ScoreFactor]


def _label_for(value: int) -> str:
    if value >= 70:
        return "Al"
    if value >= 40:
        return "Nötr"
    return "Sat"


def _score_pe(pe_ratio: float | None) -> ScoreFactor:
    points = 0.0
    if pe_ratio is not None and pe_ratio > 0:
        if pe_ratio < 15:
            points = 10.0
        elif pe_ratio < 25:
            points = 6.0
        elif pe_ratio < 40:
            points = 2.0
    return ScoreFactor(name="F/K Oranı", points=points, max_points=10)


def _score_roe(roe: float | None) -> ScoreFactor:
    points = 0.0
    if roe is not None:
        if roe > 15:
            points = 10.0
        elif roe > 5:
            points = 5.0
    return ScoreFactor(name="ROE", points=points, max_points=10)


def _score_debt_to_equity(debt_to_equity: float | None) -> ScoreFactor:
    points = 0.0
    if debt_to_equity is not None:
        if debt_to_equity < 1:
            points = 10.0
        elif debt_to_equity < 2:
            points = 5.0
    return ScoreFactor(name="Borç/Özsermaye", points=points, max_points=10)


def _score_net_margin(net_margin: float | None) -> ScoreFactor:
    points = 0.0
    if net_margin is not None:
        if net_margin > 15:
            points = 10.0
        elif net_margin > 5:
            points = 5.0
    return ScoreFactor(name="Net Kâr Marjı", points=points, max_points=10)


def _score_eps_growth(eps_growth: float | None) -> ScoreFactor:
    points = 10.0 if eps_growth is not None and eps_growth > 0 else 0.0
    return ScoreFactor(name="EPS Büyüme Oranı", points=points, max_points=10)


def _has_usable_fundamentals(fundamentals: FundamentalsSnapshot | None) -> bool:
    if fundamentals is None:
        return False
    return any(
        v is not None
        for v in (
            fundamentals.pe_ratio,
            fundamentals.roe,
            fundamentals.debt_to_equity,
            fundamentals.net_margin,
            fundamentals.eps_growth,
        )
    )


def _score_trend(candles: list[CandlePoint]) -> ScoreFactor:
    closes = [c.close for c in candles]
    sma50 = _sma(closes, 50)
    sma200 = _sma(closes, 200)
    price = closes[-1]
    latest_sma50 = sma50[-1]
    latest_sma200 = sma200[-1]

    points = 6.0  # "karışık" default
    if latest_sma50 is not None and latest_sma200 is not None:
        if price > latest_sma50 > latest_sma200:
            points = 20.0
        elif price < latest_sma50 < latest_sma200:
            points = 0.0
        elif price > latest_sma50:
            points = 12.0
    elif latest_sma50 is not None:
        points = 12.0 if price > latest_sma50 else 0.0

    return ScoreFactor(name="Trend (Fiyat/SMA50/SMA200)", points=points, max_points=20)


def _score_rsi(candles: list[CandlePoint]) -> ScoreFactor:
    closes = [c.close for c in candles]
    rsi_values = _rsi(closes, 14)
    latest_rsi = rsi_values[-1] if rsi_values else None

    points = 0.0
    if latest_rsi is not None:
        if 40 <= latest_rsi <= 60:
            points = 15.0
        elif 30 <= latest_rsi < 40 or 60 < latest_rsi <= 70:
            points = 8.0

    return ScoreFactor(name="RSI (14)", points=points, max_points=15)


def _score_recent_signals(candles: list[CandlePoint]) -> ScoreFactor:
    signals = evaluate_signals(candles)
    cutoff = int(time.time()) - NINETY_DAYS_SECONDS
    recent = [s for s in signals if s.triggered_at >= cutoff]

    bullish = sum(1 for s in recent if s.direction == "bullish")
    bearish = sum(1 for s in recent if s.direction == "bearish")

    if bullish > bearish:
        points = 15.0
    elif bullish == bearish:
        points = 7.0
    else:
        points = 0.0

    return ScoreFactor(name="Son 90 Günün Sinyal Eğilimi", points=points, max_points=15)


def compute_score(fundamentals: FundamentalsSnapshot | None, candles: list[CandlePoint]) -> StockScore | None:
    if not _has_usable_fundamentals(fundamentals) or len(candles) < MIN_CANDLES_FOR_TECHNICAL:
        return None

    assert fundamentals is not None  # narrowed by _has_usable_fundamentals

    factors = [
        _score_pe(fundamentals.pe_ratio),
        _score_roe(fundamentals.roe),
        _score_debt_to_equity(fundamentals.debt_to_equity),
        _score_net_margin(fundamentals.net_margin),
        _score_eps_growth(fundamentals.eps_growth),
        _score_trend(candles),
        _score_rsi(candles),
        _score_recent_signals(candles),
    ]

    total = sum(f.points for f in factors)
    value = round(total)
    return StockScore(value=value, label=_label_for(value), factors=factors)


def compute_bist_score() -> StockScore | None:
    return None


async def compute_us_score(symbol: str) -> StockScore | None:
    fundamentals_result, candles_result = await asyncio.gather(
        get_us_fundamentals(symbol),
        get_us_candles(symbol, "daily"),
        return_exceptions=True,
    )

    if isinstance(fundamentals_result, Exception) and not isinstance(
        fundamentals_result, FundamentalsUnavailableError
    ):
        raise fundamentals_result
    if isinstance(candles_result, Exception) and not isinstance(candles_result, MarketDataUnavailableError):
        raise candles_result

    fundamentals = fundamentals_result if isinstance(fundamentals_result, FundamentalsSnapshot) else None
    candles = candles_result if isinstance(candles_result, list) else []

    return compute_score(fundamentals, candles)
