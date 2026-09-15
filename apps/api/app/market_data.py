import difflib
import json
from functools import lru_cache
from pathlib import Path

import httpx
from pydantic import BaseModel

from app.config import get_settings

BIST_SYMBOLS_PATH = Path(__file__).parent / "data" / "bist_symbols.json"
FINNHUB_SEARCH_URL = "https://finnhub.io/api/v1/search"
FINNHUB_TIMEOUT_SECONDS = 3.0
MAX_RESULTS = 20
FUZZY_MATCH_CUTOFF = 0.6


class SymbolResult(BaseModel):
    symbol: str
    name: str
    exchange: str


class FinnhubError(Exception):
    """Raised when the Finnhub symbol search cannot be completed."""


@lru_cache
def load_bist_symbols() -> list[dict[str, str]]:
    with BIST_SYMBOLS_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def search_bist_symbols(
    query: str, entries: list[dict[str, str]] | None = None
) -> list[SymbolResult]:
    normalized = query.strip().lower()
    if not normalized:
        return []

    candidates = entries if entries is not None else load_bist_symbols()

    prefix_matches = [e for e in candidates if e["symbol"].lower().startswith(normalized)]
    substring_matches = [
        e
        for e in candidates
        if e not in prefix_matches and normalized in e["name"].lower()
    ]
    ordered = prefix_matches + substring_matches

    if not ordered:
        symbol_pool = {e["symbol"].lower(): e for e in candidates}
        name_pool = {e["name"].lower(): e for e in candidates}
        close_symbols = difflib.get_close_matches(
            normalized, symbol_pool.keys(), n=MAX_RESULTS, cutoff=FUZZY_MATCH_CUTOFF
        )
        close_names = difflib.get_close_matches(
            normalized, name_pool.keys(), n=MAX_RESULTS, cutoff=FUZZY_MATCH_CUTOFF
        )
        seen_symbols = set()
        for key in close_symbols:
            entry = symbol_pool[key]
            if entry["symbol"] not in seen_symbols:
                ordered.append(entry)
                seen_symbols.add(entry["symbol"])
        for key in close_names:
            entry = name_pool[key]
            if entry["symbol"] not in seen_symbols:
                ordered.append(entry)
                seen_symbols.add(entry["symbol"])

    return [
        SymbolResult(symbol=e["symbol"], name=e["name"], exchange="BIST")
        for e in ordered[:MAX_RESULTS]
    ]


async def search_us_symbols(
    query: str, *, client: httpx.AsyncClient | None = None
) -> list[SymbolResult]:
    settings = get_settings()
    if not settings.finnhub_api_key:
        raise FinnhubError("FINNHUB_API_KEY is not configured")

    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=FINNHUB_TIMEOUT_SECONDS)
    try:
        response = await http_client.get(
            FINNHUB_SEARCH_URL,
            params={"q": query, "token": settings.finnhub_api_key},
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        raise FinnhubError(f"Finnhub request failed: {exc}") from exc
    finally:
        if owns_client:
            await http_client.aclose()

    results = []
    for item in payload.get("result", [])[:MAX_RESULTS]:
        symbol = item.get("symbol")
        name = item.get("description")
        if not symbol or not name:
            continue
        results.append(SymbolResult(symbol=symbol, name=name, exchange="US"))
    return results
