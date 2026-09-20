import asyncio

import httpx
from pydantic import BaseModel

from app.config import get_settings

FINNHUB_METRIC_URL = "https://finnhub.io/api/v1/stock/metric"
FINNHUB_PEERS_URL = "https://finnhub.io/api/v1/stock/peers"
FINNHUB_TIMEOUT_SECONDS = 3.0
MAX_PEERS = 8
MAX_ANNUAL_PERIODS = 5
MAX_QUARTERLY_PERIODS = 20

COMPARISON_METRIC_FIELDS = (
    "pe_ratio",
    "pb_ratio",
    "roe",
    "roa",
    "eps",
    "eps_growth",
    "dividend_yield",
    "debt_to_equity",
    "gross_margin",
    "net_margin",
    "ebitda_margin",
    "free_cash_flow",
    "market_cap",
)


class FundamentalsSnapshot(BaseModel):
    symbol: str
    exchange: str
    pe_ratio: float | None = None
    pb_ratio: float | None = None
    roe: float | None = None
    roa: float | None = None
    eps: float | None = None
    eps_growth: float | None = None
    dividend_yield: float | None = None
    debt_to_equity: float | None = None
    gross_margin: float | None = None
    net_margin: float | None = None
    ebitda_margin: float | None = None
    free_cash_flow: float | None = None
    market_cap: float | None = None


class MetricComparison(BaseModel):
    value: float | None = None
    sector_average: float | None = None
    diff_pct: float | None = None


class SectorComparison(BaseModel):
    peer_count: int
    pe_ratio: MetricComparison | None = None
    pb_ratio: MetricComparison | None = None
    roe: MetricComparison | None = None
    roa: MetricComparison | None = None
    eps: MetricComparison | None = None
    eps_growth: MetricComparison | None = None
    dividend_yield: MetricComparison | None = None
    debt_to_equity: MetricComparison | None = None
    gross_margin: MetricComparison | None = None
    net_margin: MetricComparison | None = None
    ebitda_margin: MetricComparison | None = None
    free_cash_flow: MetricComparison | None = None
    market_cap: MetricComparison | None = None


class HistoricalDataPoint(BaseModel):
    period: str
    revenue_per_share: float | None = None
    net_income_per_share: float | None = None
    eps: float | None = None


class HistoricalPerformance(BaseModel):
    symbol: str
    exchange: str
    annual: list[HistoricalDataPoint] = []
    quarterly: list[HistoricalDataPoint] = []


class FundamentalsUnavailableError(Exception):
    """Raised when fundamentals data cannot be retrieved for a symbol."""


def _first_present(metric: dict, *candidate_keys: str) -> float | None:
    for key in candidate_keys:
        value = metric.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    return None


def get_bist_fundamentals(symbol: str) -> FundamentalsSnapshot:
    return FundamentalsSnapshot(symbol=symbol.strip().upper(), exchange="BIST")


async def get_us_fundamentals(
    symbol: str, *, client: httpx.AsyncClient | None = None
) -> FundamentalsSnapshot:
    settings = get_settings()
    if not settings.finnhub_api_key:
        raise FundamentalsUnavailableError("FINNHUB_API_KEY is not configured")

    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=FINNHUB_TIMEOUT_SECONDS)
    try:
        response = await http_client.get(
            FINNHUB_METRIC_URL,
            params={"symbol": symbol, "metric": "all", "token": settings.finnhub_api_key},
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        raise FundamentalsUnavailableError(f"Finnhub request failed: {exc}") from exc
    finally:
        if owns_client:
            await http_client.aclose()

    metric = payload.get("metric")
    if not isinstance(metric, dict) or not metric:
        raise FundamentalsUnavailableError(f"No fundamentals data for symbol {symbol}")

    market_cap = _first_present(metric, "marketCapitalization")

    return FundamentalsSnapshot(
        symbol=symbol.upper(),
        exchange="US",
        pe_ratio=_first_present(
            metric, "peBasicExclExtraTTM", "peExclExtraTTM", "peNormalizedAnnual"
        ),
        pb_ratio=_first_present(metric, "pbAnnual", "pbQuarterly", "pb"),
        roe=_first_present(metric, "roeTTM", "roeRfy", "roeAnnual", "roe"),
        roa=_first_present(metric, "roaTTM", "roaRfy", "roaAnnual", "roa"),
        eps=_first_present(metric, "epsInclExtraItemsTTM", "epsExclExtraItemsTTM", "eps"),
        eps_growth=_first_present(metric, "epsGrowthTTMYoy", "epsGrowth5Y"),
        dividend_yield=_first_present(
            metric, "currentDividendYieldTTM", "dividendYieldIndicatedAnnual", "dividendYield5Y"
        ),
        debt_to_equity=_first_present(
            metric,
            "totalDebt/totalEquityAnnual",
            "totalDebt/totalEquityQuarterly",
            "totalDebtToEquity",
        ),
        gross_margin=_first_present(metric, "grossMarginTTM", "grossMarginAnnual", "grossMargin"),
        net_margin=_first_present(
            metric, "netProfitMarginTTM", "netProfitMarginAnnual", "netMargin"
        ),
        ebitda_margin=_first_present(metric, "ebitdaMarginTTM", "ebitdaMargin"),
        free_cash_flow=_first_present(metric, "freeCashFlowTTM", "freeCashFlowAnnual"),
        market_cap=market_cap * 1_000_000 if market_cap else None,
    )


async def get_peer_symbols(symbol: str, *, client: httpx.AsyncClient | None = None) -> list[str]:
    settings = get_settings()
    if not settings.finnhub_api_key:
        raise FundamentalsUnavailableError("FINNHUB_API_KEY is not configured")

    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=FINNHUB_TIMEOUT_SECONDS)
    try:
        response = await http_client.get(
            FINNHUB_PEERS_URL,
            params={"symbol": symbol, "grouping": "sector", "token": settings.finnhub_api_key},
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        raise FundamentalsUnavailableError(f"Finnhub peers request failed: {exc}") from exc
    finally:
        if owns_client:
            await http_client.aclose()

    if not isinstance(payload, list):
        raise FundamentalsUnavailableError(f"Unexpected peers response for symbol {symbol}")

    normalized = symbol.strip().upper()
    peers = [p for p in payload if isinstance(p, str) and p.strip().upper() != normalized]
    return peers[:MAX_PEERS]


def _average(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def _diff_pct(value: float | None, average: float | None) -> float | None:
    if value is None or average is None or average == 0:
        return None
    return (value - average) / abs(average) * 100


async def get_us_sector_comparison(
    symbol: str,
    own_snapshot: FundamentalsSnapshot,
    *,
    client: httpx.AsyncClient | None = None,
) -> SectorComparison | None:
    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=FINNHUB_TIMEOUT_SECONDS)
    try:
        try:
            peers = await get_peer_symbols(symbol, client=http_client)
        except FundamentalsUnavailableError:
            return None

        if not peers:
            return None

        results = await asyncio.gather(
            *(get_us_fundamentals(peer, client=http_client) for peer in peers),
            return_exceptions=True,
        )
    finally:
        if owns_client:
            await http_client.aclose()

    peer_snapshots = [r for r in results if isinstance(r, FundamentalsSnapshot)]
    if not peer_snapshots:
        return None

    comparisons: dict[str, MetricComparison | None] = {}
    for field in COMPARISON_METRIC_FIELDS:
        own_value = getattr(own_snapshot, field)
        peer_values = [
            v for v in (getattr(peer, field) for peer in peer_snapshots) if v is not None
        ]
        average = _average(peer_values)
        if average is None:
            comparisons[field] = None
        else:
            comparisons[field] = MetricComparison(
                value=own_value,
                sector_average=average,
                diff_pct=_diff_pct(own_value, average),
            )

    return SectorComparison(peer_count=len(peer_snapshots), **comparisons)


def _extract_period_series(series_bucket: dict, *candidate_keys: str) -> dict[str, float]:
    for key in candidate_keys:
        entries = series_bucket.get(key)
        if not isinstance(entries, list) or not entries:
            continue
        by_period = {
            entry["period"]: float(entry["v"])
            for entry in entries
            if isinstance(entry, dict)
            and isinstance(entry.get("period"), str)
            and isinstance(entry.get("v"), (int, float))
        }
        if by_period:
            return by_period
    return {}


def _build_data_points(series_bucket: dict, limit: int) -> list[HistoricalDataPoint]:
    revenue_by_period = _extract_period_series(series_bucket, "salesPerShare", "revenuePerShare")
    net_margin_by_period = _extract_period_series(series_bucket, "netMargin")
    eps_by_period = _extract_period_series(series_bucket, "eps", "epsBasicExclExtraItems")

    all_periods = set(revenue_by_period) | set(net_margin_by_period) | set(eps_by_period)
    most_recent_periods = sorted(all_periods, reverse=True)[:limit]

    points = []
    for period in most_recent_periods:
        revenue = revenue_by_period.get(period)
        net_margin = net_margin_by_period.get(period)
        net_income = (
            revenue * net_margin if revenue is not None and net_margin is not None else None
        )
        points.append(
            HistoricalDataPoint(
                period=period,
                revenue_per_share=revenue,
                net_income_per_share=net_income,
                eps=eps_by_period.get(period),
            )
        )

    points.sort(key=lambda p: p.period)
    return points


def get_bist_historical_performance(symbol: str) -> HistoricalPerformance:
    return HistoricalPerformance(symbol=symbol.strip().upper(), exchange="BIST")


async def get_us_historical_performance(
    symbol: str, *, client: httpx.AsyncClient | None = None
) -> HistoricalPerformance:
    settings = get_settings()
    if not settings.finnhub_api_key:
        raise FundamentalsUnavailableError("FINNHUB_API_KEY is not configured")

    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=FINNHUB_TIMEOUT_SECONDS)
    try:
        response = await http_client.get(
            FINNHUB_METRIC_URL,
            params={"symbol": symbol, "metric": "all", "token": settings.finnhub_api_key},
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        raise FundamentalsUnavailableError(f"Finnhub request failed: {exc}") from exc
    finally:
        if owns_client:
            await http_client.aclose()

    series = payload.get("series")
    if not isinstance(series, dict):
        raise FundamentalsUnavailableError(f"No historical series for symbol {symbol}")

    annual = _build_data_points(series.get("annual") or {}, MAX_ANNUAL_PERIODS)
    quarterly = _build_data_points(series.get("quarterly") or {}, MAX_QUARTERLY_PERIODS)

    if not annual and not quarterly:
        raise FundamentalsUnavailableError(f"No historical data points for symbol {symbol}")

    return HistoricalPerformance(
        symbol=symbol.upper(), exchange="US", annual=annual, quarterly=quarterly
    )
