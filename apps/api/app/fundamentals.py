import httpx
from pydantic import BaseModel

from app.config import get_settings

FINNHUB_METRIC_URL = "https://finnhub.io/api/v1/stock/metric"
FINNHUB_TIMEOUT_SECONDS = 3.0


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
        pe_ratio=_first_present(metric, "peBasicExclExtraTTM", "peExclExtraTTM", "peNormalizedAnnual"),
        pb_ratio=_first_present(metric, "pbAnnual", "pbQuarterly", "pb"),
        roe=_first_present(metric, "roeTTM", "roeRfy", "roeAnnual", "roe"),
        roa=_first_present(metric, "roaTTM", "roaRfy", "roaAnnual", "roa"),
        eps=_first_present(metric, "epsInclExtraItemsTTM", "epsExclExtraItemsTTM", "eps"),
        eps_growth=_first_present(metric, "epsGrowthTTMYoy", "epsGrowth5Y"),
        dividend_yield=_first_present(
            metric, "currentDividendYieldTTM", "dividendYieldIndicatedAnnual", "dividendYield5Y"
        ),
        debt_to_equity=_first_present(
            metric, "totalDebt/totalEquityAnnual", "totalDebt/totalEquityQuarterly", "totalDebtToEquity"
        ),
        gross_margin=_first_present(metric, "grossMarginTTM", "grossMarginAnnual", "grossMargin"),
        net_margin=_first_present(metric, "netProfitMarginTTM", "netProfitMarginAnnual", "netMargin"),
        ebitda_margin=_first_present(metric, "ebitdaMarginTTM", "ebitdaMargin"),
        free_cash_flow=_first_present(metric, "freeCashFlowTTM", "freeCashFlowAnnual"),
        market_cap=market_cap * 1_000_000 if market_cap else None,
    )
