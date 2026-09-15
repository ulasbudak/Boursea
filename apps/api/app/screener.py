import asyncio
import json
import time
from functools import lru_cache
from pathlib import Path

import httpx
from pydantic import BaseModel

from app.config import get_settings
from app.fundamentals import FundamentalsSnapshot, FundamentalsUnavailableError, get_us_fundamentals
from app.market_data import FINNHUB_TIMEOUT_SECONDS, MarketDataUnavailableError, get_us_candles
from app.technical import _rsi

US_UNIVERSE_PATH = Path(__file__).parent / "data" / "us_universe.json"
CACHE_TTL_SECONDS = 30 * 60
MAX_CONCURRENT_REQUESTS = 15
DEFAULT_TIMEFRAME = "daily"

# Process-local cache only (no DB/Celery) — resets on redeploy, acceptable for MVP.
_fundamentals_cache: dict[str, tuple[float, FundamentalsSnapshot]] = {}


@lru_cache
def load_us_universe() -> list[dict[str, str]]:
    with US_UNIVERSE_PATH.open(encoding="utf-8") as f:
        return json.load(f)


class ScreenerCriteria(BaseModel):
    exchange: str = "ALL"
    market_cap_min: float | None = None
    market_cap_max: float | None = None
    pe_min: float | None = None
    pe_max: float | None = None
    roe_min: float | None = None
    debt_to_equity_max: float | None = None
    sector: str | None = None
    rsi_min: float | None = None
    rsi_max: float | None = None
    volume_min: float | None = None


class ScreenerResult(BaseModel):
    symbol: str
    exchange: str
    name: str
    sector: str | None = None
    pe_ratio: float | None = None
    market_cap: float | None = None
    roe: float | None = None
    rsi: float | None = None
    volume: float | None = None


async def _get_cached_fundamentals(
    symbol: str, *, client: httpx.AsyncClient, semaphore: asyncio.Semaphore
) -> FundamentalsSnapshot | None:
    now = time.time()
    cached = _fundamentals_cache.get(symbol)
    if cached is not None and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    async with semaphore:
        try:
            snapshot = await get_us_fundamentals(symbol, client=client)
        except FundamentalsUnavailableError:
            return None

    _fundamentals_cache[symbol] = (now, snapshot)
    return snapshot


def _passes_fundamentals_filter(criteria: ScreenerCriteria, snapshot: FundamentalsSnapshot) -> bool:
    if criteria.market_cap_min is not None and (
        snapshot.market_cap is None or snapshot.market_cap < criteria.market_cap_min
    ):
        return False
    if criteria.market_cap_max is not None and (
        snapshot.market_cap is None or snapshot.market_cap > criteria.market_cap_max
    ):
        return False
    if criteria.pe_min is not None and (
        snapshot.pe_ratio is None or snapshot.pe_ratio < criteria.pe_min
    ):
        return False
    if criteria.pe_max is not None and (
        snapshot.pe_ratio is None or snapshot.pe_ratio > criteria.pe_max
    ):
        return False
    if criteria.roe_min is not None and (snapshot.roe is None or snapshot.roe < criteria.roe_min):
        return False
    if criteria.debt_to_equity_max is not None and (
        snapshot.debt_to_equity is None or snapshot.debt_to_equity > criteria.debt_to_equity_max
    ):
        return False
    return True


def _needs_technical_data(criteria: ScreenerCriteria) -> bool:
    return (
        criteria.rsi_min is not None
        or criteria.rsi_max is not None
        or criteria.volume_min is not None
    )


async def _fetch_technical_data(
    symbol: str, *, client: httpx.AsyncClient, semaphore: asyncio.Semaphore
) -> tuple[float | None, float | None]:
    async with semaphore:
        try:
            candles = await get_us_candles(symbol, DEFAULT_TIMEFRAME, client=client)
        except MarketDataUnavailableError:
            return None, None

    if not candles:
        return None, None

    rsi_values = _rsi([c.close for c in candles])
    rsi = rsi_values[-1] if rsi_values else None
    volume = candles[-1].volume
    return rsi, volume


def _passes_technical_filter(
    criteria: ScreenerCriteria, rsi: float | None, volume: float | None
) -> bool:
    if criteria.rsi_min is not None and (rsi is None or rsi < criteria.rsi_min):
        return False
    if criteria.rsi_max is not None and (rsi is None or rsi > criteria.rsi_max):
        return False
    if criteria.volume_min is not None and (volume is None or volume < criteria.volume_min):
        return False
    return True


async def _run_us_screener(criteria: ScreenerCriteria) -> tuple[list[ScreenerResult], list[str]]:
    settings = get_settings()
    if not settings.finnhub_api_key:
        return [], ["ABD hisse tarama verisi şu an sağlanamıyor."]

    universe = load_us_universe()
    if criteria.sector:
        normalized_sector = criteria.sector.strip().lower()
        universe = [e for e in universe if e.get("sector", "").lower() == normalized_sector]

    if not universe:
        return [], []

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    async with httpx.AsyncClient(timeout=FINNHUB_TIMEOUT_SECONDS) as client:
        fundamentals_results = await asyncio.gather(
            *(
                _get_cached_fundamentals(entry["symbol"], client=client, semaphore=semaphore)
                for entry in universe
            ),
            return_exceptions=True,
        )

        survivors: list[tuple[dict, FundamentalsSnapshot]] = []
        for entry, result in zip(universe, fundamentals_results):
            if isinstance(result, FundamentalsSnapshot) and _passes_fundamentals_filter(
                criteria, result
            ):
                survivors.append((entry, result))

        technical_by_symbol: dict[str, tuple[float | None, float | None]] = {}
        if _needs_technical_data(criteria) and survivors:
            technical_results = await asyncio.gather(
                *(
                    _fetch_technical_data(entry["symbol"], client=client, semaphore=semaphore)
                    for entry, _ in survivors
                ),
                return_exceptions=True,
            )
            for (entry, _), result in zip(survivors, technical_results):
                technical_by_symbol[entry["symbol"]] = (
                    result if isinstance(result, tuple) else (None, None)
                )

    results: list[ScreenerResult] = []
    for entry, snapshot in survivors:
        rsi, volume = technical_by_symbol.get(entry["symbol"], (None, None))
        if _needs_technical_data(criteria) and not _passes_technical_filter(criteria, rsi, volume):
            continue
        results.append(
            ScreenerResult(
                symbol=entry["symbol"],
                exchange="US",
                name=entry["name"],
                sector=entry.get("sector"),
                pe_ratio=snapshot.pe_ratio,
                market_cap=snapshot.market_cap,
                roe=snapshot.roe,
                rsi=rsi,
                volume=volume,
            )
        )

    return results, []


def _run_bist_screener() -> tuple[list[ScreenerResult], list[str]]:
    return [], ["BIST hisseleri için tarama verisi bu sürümde sağlanmıyor."]


async def run_screener(criteria: ScreenerCriteria) -> tuple[list[ScreenerResult], list[str]]:
    exchange_filter = criteria.exchange.strip().upper()
    results: list[ScreenerResult] = []
    warnings: list[str] = []

    if exchange_filter in ("ALL", "BIST"):
        bist_results, bist_warnings = _run_bist_screener()
        results.extend(bist_results)
        warnings.extend(bist_warnings)

    if exchange_filter in ("ALL", "US"):
        us_results, us_warnings = await _run_us_screener(criteria)
        results.extend(us_results)
        warnings.extend(us_warnings)

    return results, warnings
