import asyncio

from pydantic import BaseModel

from app.fundamentals import (
    FundamentalsSnapshot,
    FundamentalsUnavailableError,
    get_bist_fundamentals,
    get_us_fundamentals,
)
from app.market_data import MarketDataUnavailableError, get_us_candles
from app.scoring import StockScore, compute_bist_score, compute_score
from app.technical import _rsi

MAX_COMPARISON_SYMBOLS = 4


class ComparisonEntry(BaseModel):
    symbol: str
    exchange: str
    fundamentals: FundamentalsSnapshot | None = None
    score: StockScore | None = None
    rsi: float | None = None
    warnings: list[str] = []


async def _compare_us_symbol(symbol: str) -> ComparisonEntry:
    warnings: list[str] = []
    fundamentals_result, candles_result = await asyncio.gather(
        get_us_fundamentals(symbol),
        get_us_candles(symbol, "daily"),
        return_exceptions=True,
    )

    fundamentals: FundamentalsSnapshot | None = None
    if isinstance(fundamentals_result, FundamentalsSnapshot):
        fundamentals = fundamentals_result
    elif isinstance(fundamentals_result, FundamentalsUnavailableError):
        warnings.append(f"{symbol}: temel analiz verisi şu an güncellenemiyor.")
    elif isinstance(fundamentals_result, BaseException):
        raise fundamentals_result

    candles = candles_result if isinstance(candles_result, list) else []
    if isinstance(candles_result, MarketDataUnavailableError):
        warnings.append(f"{symbol}: grafik/teknik veri şu an güncellenemiyor.")
    elif isinstance(candles_result, BaseException):
        raise candles_result

    rsi_values = _rsi([c.close for c in candles]) if candles else []
    rsi = rsi_values[-1] if rsi_values else None
    score = compute_score(fundamentals, candles)

    return ComparisonEntry(
        symbol=symbol,
        exchange="US",
        fundamentals=fundamentals,
        score=score,
        rsi=rsi,
        warnings=warnings,
    )


def _compare_bist_symbol(symbol: str) -> ComparisonEntry:
    return ComparisonEntry(
        symbol=symbol,
        exchange="BIST",
        fundamentals=get_bist_fundamentals(symbol),
        score=compute_bist_score(),
        rsi=None,
        warnings=["BIST hisseleri için karşılaştırma verisi bu sürümde sağlanmıyor."],
    )


async def compare_symbols(entries: list[tuple[str, str]]) -> list[ComparisonEntry]:
    us_symbols = [symbol for symbol, exchange in entries if exchange == "US"]
    us_entries = await asyncio.gather(*(_compare_us_symbol(symbol) for symbol in us_symbols))
    us_by_symbol = {entry.symbol: entry for entry in us_entries}

    results: list[ComparisonEntry] = []
    for symbol, exchange in entries:
        results.append(us_by_symbol[symbol] if exchange == "US" else _compare_bist_symbol(symbol))
    return results
