import asyncio

import httpx
from pydantic import BaseModel

from app.market_data import FINNHUB_TIMEOUT_SECONDS, MarketDataUnavailableError, get_us_overview
from app.screener import load_us_universe

MAX_CONCURRENT_REQUESTS = 15
MAX_HIGHLIGHTS = 10

NO_INTEREST_WARNING = "Öne çıkanları görmek için ayarlardan ilgi alanı sektörü seç."


class Highlight(BaseModel):
    symbol: str
    exchange: str
    name: str
    sector: str | None = None
    price: float | None = None
    change_abs: float | None = None
    change_pct: float | None = None


async def get_highlights(interest_sectors: list[str]) -> tuple[list[Highlight], list[str]]:
    """Rule-based "biggest movers" within the user's selected sectors (Story 7.1).

    Same two-tier shape as the screener (Story 4.1): filter the static US universe by
    sector first (free), then fetch live quotes only for that subset. No live BIST price
    source exists yet (see docs/architecture.md), so this is US-only, same as the screener.
    """
    if not interest_sectors:
        return [], [NO_INTEREST_WARNING]

    normalized = {s.strip().lower() for s in interest_sectors}
    universe = load_us_universe()
    candidates = [e for e in universe if e.get("sector", "").lower() in normalized]
    if not candidates:
        return [], []

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

    async def fetch(entry: dict, client: httpx.AsyncClient):
        async with semaphore:
            try:
                return await get_us_overview(entry["symbol"], client=client)
            except MarketDataUnavailableError:
                return None

    async with httpx.AsyncClient(timeout=FINNHUB_TIMEOUT_SECONDS) as client:
        overviews = await asyncio.gather(*(fetch(entry, client) for entry in candidates))

    highlights = [
        Highlight(
            symbol=entry["symbol"],
            exchange="US",
            name=entry["name"],
            sector=entry.get("sector"),
            price=overview.price,
            change_abs=overview.change_abs,
            change_pct=overview.change_pct,
        )
        for entry, overview in zip(candidates, overviews)
        if overview is not None and overview.change_pct is not None
    ]
    highlights.sort(key=lambda h: abs(h.change_pct or 0), reverse=True)
    return highlights[:MAX_HIGHLIGHTS], []
