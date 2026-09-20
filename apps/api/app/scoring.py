import asyncio

from pydantic import BaseModel

from app.fundamentals import FundamentalsSnapshot, FundamentalsUnavailableError, get_us_fundamentals
from app.market_data import CandlePoint, MarketDataUnavailableError, get_us_candles
from app.technical import _bollinger_bands, _macd_histogram, _rsi, _sma, _stochastic

MIN_CANDLES_FOR_TECHNICAL = 15


class ScoreFactor(BaseModel):
    name: str
    points: float
    max_points: float


class TechnicalConsensus(BaseModel):
    bullish: int
    bearish: int
    neutral: int
    total: int


class StockScore(BaseModel):
    value: int
    label: str
    factors: list[ScoreFactor]
    consensus: TechnicalConsensus
    rationale: str


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

    points = 4.5  # "karışık" default
    if latest_sma50 is not None and latest_sma200 is not None:
        if price > latest_sma50 > latest_sma200:
            points = 15.0
        elif price < latest_sma50 < latest_sma200:
            points = 0.0
        elif price > latest_sma50:
            points = 9.0
    elif latest_sma50 is not None:
        points = 9.0 if price > latest_sma50 else 0.0

    return ScoreFactor(name="Trend (Fiyat/SMA50/SMA200)", points=points, max_points=15)


def _score_rsi(candles: list[CandlePoint]) -> ScoreFactor:
    closes = [c.close for c in candles]
    rsi_values = _rsi(closes, 14)
    latest_rsi = rsi_values[-1] if rsi_values else None

    points = 0.0
    if latest_rsi is not None:
        if 40 <= latest_rsi <= 60:
            points = 10.0
        elif 30 <= latest_rsi < 40 or 60 < latest_rsi <= 70:
            points = 5.0

    return ScoreFactor(name="RSI (14)", points=points, max_points=10)


# Each entry: (indicator label, bias at the *current* bar). Oscillators (RSI, Stochastic) are
# read as mean-reversion signals here (oversold -> bullish bias, overbought -> bearish bias) -
# the standard convention for "current positioning bias," distinct from how Story 3.5's signal
# list labels the RSI/Stochastic *crossing events themselves* by momentum direction.
def _compute_consensus(candles: list[CandlePoint]) -> TechnicalConsensus:
    closes = [c.close for c in candles]
    highs = [c.high for c in candles]
    lows = [c.low for c in candles]

    biases: list[str] = []

    rsi_values = _rsi(closes, 14)
    latest_rsi = rsi_values[-1] if rsi_values else None
    if latest_rsi is not None:
        if latest_rsi < 30:
            biases.append("bullish")
        elif latest_rsi > 70:
            biases.append("bearish")
        else:
            biases.append("neutral")

    macd_hist = _macd_histogram(closes)
    latest_macd = macd_hist[-1] if macd_hist else None
    if latest_macd is not None:
        biases.append("bullish" if latest_macd > 0 else "bearish" if latest_macd < 0 else "neutral")

    sma20 = _sma(closes, 20)
    sma50 = _sma(closes, 50)
    sma200 = _sma(closes, 200)
    if sma50 and sma200 and sma50[-1] is not None and sma200[-1] is not None:
        biases.append(
            "bullish"
            if sma50[-1] > sma200[-1]
            else "bearish"
            if sma50[-1] < sma200[-1]
            else "neutral"
        )
    if sma20 and sma50 and sma20[-1] is not None and sma50[-1] is not None:
        biases.append(
            "bullish"
            if sma20[-1] > sma50[-1]
            else "bearish"
            if sma20[-1] < sma50[-1]
            else "neutral"
        )

    bands = _bollinger_bands(closes, 20, 2.0)
    latest_bands = bands[-1] if bands else None
    if latest_bands is not None:
        upper, _middle, lower = latest_bands
        price = closes[-1]
        if price > upper:
            biases.append("bullish")
        elif price < lower:
            biases.append("bearish")
        else:
            biases.append("neutral")

    stoch = _stochastic(highs, lows, closes, 14, 3)
    latest_stoch = stoch[-1] if stoch else None
    if latest_stoch is not None:
        latest_k, _latest_d = latest_stoch
        if latest_k < 20:
            biases.append("bullish")
        elif latest_k > 80:
            biases.append("bearish")
        else:
            biases.append("neutral")

    return TechnicalConsensus(
        bullish=biases.count("bullish"),
        bearish=biases.count("bearish"),
        neutral=biases.count("neutral"),
        total=len(biases),
    )


def _score_consensus(consensus: TechnicalConsensus) -> ScoreFactor:
    points = 0.0 if consensus.total == 0 else 25.0 * consensus.bullish / consensus.total
    return ScoreFactor(name="Teknik Konsensüs", points=round(points, 2), max_points=25)


def _build_rationale(
    value: int, label: str, factors: list[ScoreFactor], consensus: TechnicalConsensus
) -> str:
    fundamental_names = {"F/K Oranı", "ROE", "Borç/Özsermaye", "Net Kâr Marjı", "EPS Büyüme Oranı"}
    fundamental_factors = [f for f in factors if f.name in fundamental_names]
    top_fundamental = max(fundamental_factors, key=lambda f: f.points, default=None)

    parts = [f"Özet skor {value}/100 ({label})."]
    if top_fundamental is not None and top_fundamental.points > 0:
        contribution = f"{top_fundamental.points:.0f}/{top_fundamental.max_points:.0f}p"
        parts.append(f"Temel tarafta en güçlü katkı: {top_fundamental.name} ({contribution}).")
    if consensus.total > 0:
        bullish_ratio = f"{consensus.bullish}/{consensus.total}"
        parts.append(f"Teknik göstergelerin {bullish_ratio} kadarı şu an yükseliş yönünde.")
    parts.append("Bu değerlendirme kural bazlı bir özettir, yatırım tavsiyesi değildir.")

    return " ".join(parts)


def compute_score(
    fundamentals: FundamentalsSnapshot | None, candles: list[CandlePoint]
) -> StockScore | None:
    if not _has_usable_fundamentals(fundamentals) or len(candles) < MIN_CANDLES_FOR_TECHNICAL:
        return None

    assert fundamentals is not None  # narrowed by _has_usable_fundamentals

    consensus = _compute_consensus(candles)

    factors = [
        _score_pe(fundamentals.pe_ratio),
        _score_roe(fundamentals.roe),
        _score_debt_to_equity(fundamentals.debt_to_equity),
        _score_net_margin(fundamentals.net_margin),
        _score_eps_growth(fundamentals.eps_growth),
        _score_trend(candles),
        _score_rsi(candles),
        _score_consensus(consensus),
    ]

    total = sum(f.points for f in factors)
    value = round(total)
    label = _label_for(value)
    rationale = _build_rationale(value, label, factors, consensus)
    return StockScore(
        value=value, label=label, factors=factors, consensus=consensus, rationale=rationale
    )


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
    if isinstance(candles_result, Exception) and not isinstance(
        candles_result, MarketDataUnavailableError
    ):
        raise candles_result

    fundamentals = (
        fundamentals_result if isinstance(fundamentals_result, FundamentalsSnapshot) else None
    )
    candles = candles_result if isinstance(candles_result, list) else []

    return compute_score(fundamentals, candles)
