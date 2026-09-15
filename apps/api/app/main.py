from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_claims
from app.config import get_settings
from app.db import check_database_connection
from app.market_data import (
    FinnhubError,
    MarketDataUnavailableError,
    StockOverview,
    SymbolResult,
    get_bist_overview,
    get_us_overview,
    search_bist_symbols,
    search_us_symbols,
)

app = FastAPI(title="Trendus API")

_settings = get_settings()
_cors_origins = [origin.strip() for origin in _settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def health_db(response: Response) -> dict[str, str]:
    if check_database_connection():
        return {"status": "ok"}
    response.status_code = 503
    return {"status": "unavailable"}


@app.get("/me")
def me(claims: dict = Depends(get_current_claims)) -> dict[str, str | None]:
    return {"id": claims.get("sub"), "email": claims.get("email")}


SearchResponse = dict[str, list[SymbolResult] | list[str]]


@app.get("/symbols/search")
async def search_symbols(q: str, exchange: str = "ALL") -> SearchResponse:
    query = q.strip()
    exchange_filter = exchange.strip().upper()
    results: list[SymbolResult] = []
    warnings: list[str] = []

    if not query:
        return {"results": results, "warnings": warnings}

    if exchange_filter in ("ALL", "BIST"):
        results.extend(search_bist_symbols(query))

    if exchange_filter in ("ALL", "US"):
        try:
            results.extend(await search_us_symbols(query))
        except FinnhubError:
            warnings.append("ABD hisse sonuçları şu an getirilemiyor.")

    return {"results": results, "warnings": warnings}


OverviewResponse = dict[str, StockOverview | list[str] | None]


@app.get("/symbols/overview")
async def get_symbol_overview(symbol: str, exchange: str) -> OverviewResponse:
    symbol = symbol.strip()
    exchange_filter = exchange.strip().upper()
    warnings: list[str] = []
    overview: StockOverview | None = None

    if exchange_filter == "BIST":
        overview = get_bist_overview(symbol)
        warnings.append("BIST hisseleri için gerçek zamanlı fiyat verisi bu sürümde sağlanmıyor.")
    elif exchange_filter == "US":
        try:
            overview = await get_us_overview(symbol)
        except MarketDataUnavailableError:
            warnings.append("ABD hisse verisi şu an güncellenemiyor.")
    else:
        raise HTTPException(status_code=400, detail="exchange must be BIST or US")

    return {"overview": overview, "warnings": warnings}
