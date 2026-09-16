import psycopg
from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.alerts import (
    AlertNotFoundError,
    PriceAlert,
    create_alert,
    delete_alert,
    evaluate_and_persist,
    list_alerts,
)
from app.auth import get_current_claims
from app.comparison import MAX_COMPARISON_SYMBOLS, ComparisonEntry, compare_symbols
from app.config import get_settings
from app.db import check_database_connection
from app.fundamentals import (
    FundamentalsSnapshot,
    FundamentalsUnavailableError,
    HistoricalPerformance,
    SectorComparison,
    get_bist_fundamentals,
    get_bist_historical_performance,
    get_us_fundamentals,
    get_us_historical_performance,
    get_us_sector_comparison,
)
from app.market_data import (
    TIMEFRAMES,
    CandlePoint,
    FinnhubError,
    MarketDataUnavailableError,
    StockOverview,
    SymbolResult,
    get_bist_candles,
    get_bist_overview,
    get_us_candles,
    get_us_overview,
    search_bist_symbols,
    search_us_symbols,
)
from app.notifications import NotificationSettings
from app.notifications import get_settings_for_user as get_notification_settings_for_user
from app.notifications import upsert_settings_for_user as upsert_notification_settings
from app.saved_screens import (
    SavedScreen,
    SavedScreenNotFoundError,
    create_saved_screen,
    delete_saved_screen,
    list_saved_screens,
    update_saved_screen,
)
from app.scoring import StockScore, compute_bist_score, compute_us_score
from app.screener import ScreenerCriteria, ScreenerResult, run_screener
from app.signal_alerts import SIGNAL_RULE_CATALOG, SIGNAL_RULE_IDS, SignalAlertNotFoundError
from app.signal_alerts import SignalAlert as SignalAlertModel
from app.signal_alerts import create_alert as create_signal_alert
from app.signal_alerts import delete_alert as delete_signal_alert
from app.signal_alerts import evaluate_and_persist as evaluate_signal_alerts
from app.signal_alerts import list_alerts as list_signal_alerts
from app.technical import SignalRecord, evaluate_signals
from app.watchlists import (
    Watchlist,
    WatchlistItem,
    WatchlistNotFoundError,
    add_item,
    create_watchlist,
    delete_watchlist,
    list_watchlists,
    remove_item,
)

app = FastAPI(title="Trendus API")

_settings = get_settings()
_cors_origins = [origin.strip() for origin in _settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
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


FundamentalsResponse = dict[str, FundamentalsSnapshot | SectorComparison | list[str] | None]


@app.get("/fundamentals")
async def get_fundamentals(symbol: str, exchange: str) -> FundamentalsResponse:
    symbol = symbol.strip()
    exchange_filter = exchange.strip().upper()
    warnings: list[str] = []
    fundamentals: FundamentalsSnapshot | None = None
    sector_comparison: SectorComparison | None = None

    if exchange_filter == "BIST":
        fundamentals = get_bist_fundamentals(symbol)
        warnings.append("BIST hisseleri için temel analiz verisi bu sürümde sağlanmıyor.")
    elif exchange_filter == "US":
        try:
            fundamentals = await get_us_fundamentals(symbol)
        except FundamentalsUnavailableError:
            warnings.append("ABD hisse temel analiz verisi şu an güncellenemiyor.")
        if fundamentals is not None:
            sector_comparison = await get_us_sector_comparison(symbol, fundamentals)
    else:
        raise HTTPException(status_code=400, detail="exchange must be BIST or US")

    return {
        "fundamentals": fundamentals,
        "sector_comparison": sector_comparison,
        "warnings": warnings,
    }


HistoryResponse = dict[str, HistoricalPerformance | list[str] | None]


@app.get("/fundamentals/history")
async def get_fundamentals_history(symbol: str, exchange: str) -> HistoryResponse:
    symbol = symbol.strip()
    exchange_filter = exchange.strip().upper()
    warnings: list[str] = []
    history: HistoricalPerformance | None = None

    if exchange_filter == "BIST":
        history = get_bist_historical_performance(symbol)
        warnings.append("BIST hisseleri için geçmiş performans verisi bu sürümde sağlanmıyor.")
    elif exchange_filter == "US":
        try:
            history = await get_us_historical_performance(symbol)
        except FundamentalsUnavailableError:
            warnings.append("ABD hisse geçmiş performans verisi şu an güncellenemiyor.")
    else:
        raise HTTPException(status_code=400, detail="exchange must be BIST or US")

    return {"history": history, "warnings": warnings}


CandlesResponse = dict[str, list[CandlePoint] | list[str]]


@app.get("/symbols/candles")
async def get_symbol_candles(
    symbol: str, exchange: str, timeframe: str = "daily"
) -> CandlesResponse:
    symbol = symbol.strip()
    exchange_filter = exchange.strip().upper()
    timeframe_filter = timeframe.strip().lower()
    if timeframe_filter not in TIMEFRAMES:
        raise HTTPException(
            status_code=400,
            detail=f"timeframe must be one of {', '.join(TIMEFRAMES)}",
        )

    warnings: list[str] = []
    candles: list[CandlePoint] = []

    if exchange_filter == "BIST":
        candles = get_bist_candles(symbol, timeframe_filter)
        warnings.append("BIST hisseleri için grafik verisi bu sürümde sağlanmıyor.")
    elif exchange_filter == "US":
        try:
            candles = await get_us_candles(symbol, timeframe_filter)
        except MarketDataUnavailableError:
            warnings.append("ABD hisse grafik verisi şu an güncellenemiyor.")
    else:
        raise HTTPException(status_code=400, detail="exchange must be BIST or US")

    return {"candles": candles, "warnings": warnings}


SignalsResponse = dict[str, list[SignalRecord] | list[str]]


@app.get("/symbols/signals")
async def get_symbol_signals(
    symbol: str, exchange: str, timeframe: str = "daily"
) -> SignalsResponse:
    symbol = symbol.strip()
    exchange_filter = exchange.strip().upper()
    timeframe_filter = timeframe.strip().lower()
    if timeframe_filter not in TIMEFRAMES:
        raise HTTPException(
            status_code=400,
            detail=f"timeframe must be one of {', '.join(TIMEFRAMES)}",
        )

    warnings: list[str] = []
    signals: list[SignalRecord] = []

    if exchange_filter == "BIST":
        signals = evaluate_signals(get_bist_candles(symbol, timeframe_filter))
        warnings.append("BIST hisseleri için sinyal verisi bu sürümde sağlanmıyor.")
    elif exchange_filter == "US":
        try:
            candles = await get_us_candles(symbol, timeframe_filter)
            signals = evaluate_signals(candles)
        except MarketDataUnavailableError:
            warnings.append("ABD hisse sinyal verisi şu an güncellenemiyor.")
    else:
        raise HTTPException(status_code=400, detail="exchange must be BIST or US")

    return {"signals": signals, "warnings": warnings}


ScoreResponse = dict[str, StockScore | list[str] | None]


@app.get("/symbols/score")
async def get_symbol_score(symbol: str, exchange: str) -> ScoreResponse:
    symbol = symbol.strip()
    exchange_filter = exchange.strip().upper()
    warnings: list[str] = []
    score: StockScore | None = None

    if exchange_filter == "BIST":
        score = compute_bist_score()
        warnings.append("BIST hisseleri için özet skor bu sürümde sağlanmıyor.")
    elif exchange_filter == "US":
        score = await compute_us_score(symbol)
        if score is None:
            warnings.append("Skor hesaplamak için yeterli veri yok.")
    else:
        raise HTTPException(status_code=400, detail="exchange must be BIST or US")

    return {"score": score, "warnings": warnings}


ScreenerResponse = dict[str, list[ScreenerResult] | list[str]]


@app.get("/screener/run")
async def get_screener_results(
    exchange: str = "ALL",
    market_cap_min: float | None = None,
    market_cap_max: float | None = None,
    pe_min: float | None = None,
    pe_max: float | None = None,
    roe_min: float | None = None,
    debt_to_equity_max: float | None = None,
    sector: str | None = None,
    rsi_min: float | None = None,
    rsi_max: float | None = None,
    volume_min: float | None = None,
) -> ScreenerResponse:
    exchange_filter = exchange.strip().upper()
    if exchange_filter not in ("ALL", "BIST", "US"):
        raise HTTPException(status_code=400, detail="exchange must be ALL, BIST or US")

    criteria = ScreenerCriteria(
        exchange=exchange_filter,
        market_cap_min=market_cap_min,
        market_cap_max=market_cap_max,
        pe_min=pe_min,
        pe_max=pe_max,
        roe_min=roe_min,
        debt_to_equity_max=debt_to_equity_max,
        sector=sector,
        rsi_min=rsi_min,
        rsi_max=rsi_max,
        volume_min=volume_min,
    )
    results, warnings = await run_screener(criteria)
    return {"results": results, "warnings": warnings}


class CreateWatchlistRequest(BaseModel):
    name: str


class AddWatchlistItemRequest(BaseModel):
    symbol: str
    exchange: str
    name: str | None = None


def _watchlists_unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="İzleme listesi verisi şu an sağlanamıyor.")


@app.get("/watchlists")
def get_watchlists(claims: dict = Depends(get_current_claims)) -> list[Watchlist]:
    try:
        return list_watchlists(claims["sub"])
    except psycopg.Error as exc:
        raise _watchlists_unavailable() from exc


@app.post("/watchlists", status_code=201)
def post_watchlist(
    body: CreateWatchlistRequest, claims: dict = Depends(get_current_claims)
) -> Watchlist:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    try:
        return create_watchlist(claims["sub"], name)
    except psycopg.Error as exc:
        raise _watchlists_unavailable() from exc


@app.delete("/watchlists/{watchlist_id}", status_code=204)
def delete_watchlist_endpoint(
    watchlist_id: str, claims: dict = Depends(get_current_claims)
) -> Response:
    try:
        delete_watchlist(claims["sub"], watchlist_id)
    except WatchlistNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Watchlist not found") from exc
    except psycopg.Error as exc:
        raise _watchlists_unavailable() from exc
    return Response(status_code=204)


@app.post("/watchlists/{watchlist_id}/items", status_code=201)
def post_watchlist_item(
    watchlist_id: str, body: AddWatchlistItemRequest, claims: dict = Depends(get_current_claims)
) -> WatchlistItem:
    exchange = body.exchange.strip().upper()
    if exchange not in ("US", "BIST"):
        raise HTTPException(status_code=400, detail="exchange must be US or BIST")
    symbol = body.symbol.strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    try:
        return add_item(
            claims["sub"], watchlist_id, symbol=symbol, exchange=exchange, name=body.name
        )
    except WatchlistNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Watchlist not found") from exc
    except psycopg.Error as exc:
        raise _watchlists_unavailable() from exc


@app.delete("/watchlists/{watchlist_id}/items/{item_id}", status_code=204)
def delete_watchlist_item(
    watchlist_id: str, item_id: str, claims: dict = Depends(get_current_claims)
) -> Response:
    try:
        remove_item(claims["sub"], watchlist_id, item_id)
    except WatchlistNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Watchlist item not found") from exc
    except psycopg.Error as exc:
        raise _watchlists_unavailable() from exc
    return Response(status_code=204)


class CreatePriceAlertRequest(BaseModel):
    symbol: str
    exchange: str
    name: str | None = None
    direction: str
    threshold: float


def _alerts_unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="Alarm verisi şu an sağlanamıyor.")


@app.get("/alerts")
async def get_alerts(claims: dict = Depends(get_current_claims)) -> dict[str, object]:
    try:
        alerts = list_alerts(claims["sub"])
    except psycopg.Error as exc:
        raise _alerts_unavailable() from exc
    updated, warnings = await evaluate_and_persist(
        alerts, user_id=claims["sub"], email=claims.get("email")
    )
    return {"alerts": updated, "warnings": warnings}


@app.post("/alerts", status_code=201)
def post_alert(
    body: CreatePriceAlertRequest, claims: dict = Depends(get_current_claims)
) -> PriceAlert:
    exchange = body.exchange.strip().upper()
    if exchange not in ("US", "BIST"):
        raise HTTPException(status_code=400, detail="exchange must be US or BIST")
    direction = body.direction.strip().lower()
    if direction not in ("above", "below"):
        raise HTTPException(status_code=400, detail="direction must be above or below")
    symbol = body.symbol.strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    if body.threshold <= 0:
        raise HTTPException(status_code=400, detail="threshold must be positive")
    try:
        return create_alert(
            claims["sub"],
            symbol=symbol,
            exchange=exchange,
            name=body.name,
            direction=direction,
            threshold=body.threshold,
        )
    except psycopg.Error as exc:
        raise _alerts_unavailable() from exc


@app.delete("/alerts/{alert_id}", status_code=204)
def delete_alert_endpoint(alert_id: str, claims: dict = Depends(get_current_claims)) -> Response:
    try:
        delete_alert(claims["sub"], alert_id)
    except AlertNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Alert not found") from exc
    except psycopg.Error as exc:
        raise _alerts_unavailable() from exc
    return Response(status_code=204)


@app.get("/technical/rules")
def get_signal_rules() -> list[dict[str, str]]:
    return SIGNAL_RULE_CATALOG


class CreateSignalAlertRequest(BaseModel):
    symbol: str
    exchange: str
    name: str | None = None
    rule_id: str
    timeframe: str = "daily"


def _signal_alerts_unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="Sinyal alarmı verisi şu an sağlanamıyor.")


@app.get("/signal-alerts")
async def get_signal_alerts(
    claims: dict = Depends(get_current_claims),
) -> dict[str, object]:
    try:
        alerts = list_signal_alerts(claims["sub"])
    except psycopg.Error as exc:
        raise _signal_alerts_unavailable() from exc
    updated, warnings = await evaluate_signal_alerts(
        alerts, user_id=claims["sub"], email=claims.get("email")
    )
    return {"alerts": updated, "warnings": warnings}


class UpdateNotificationSettingsRequest(BaseModel):
    expo_push_token: str | None = None
    push_enabled: bool | None = None
    email_enabled: bool | None = None


@app.get("/notification-settings")
def get_notification_settings(
    claims: dict = Depends(get_current_claims),
) -> NotificationSettings:
    return get_notification_settings_for_user(claims["sub"])


@app.put("/notification-settings")
def put_notification_settings(
    body: UpdateNotificationSettingsRequest, claims: dict = Depends(get_current_claims)
) -> NotificationSettings:
    return upsert_notification_settings(
        claims["sub"],
        expo_push_token=body.expo_push_token,
        push_enabled=body.push_enabled,
        email_enabled=body.email_enabled,
    )


@app.post("/signal-alerts", status_code=201)
def post_signal_alert(
    body: CreateSignalAlertRequest, claims: dict = Depends(get_current_claims)
) -> SignalAlertModel:
    exchange = body.exchange.strip().upper()
    if exchange not in ("US", "BIST"):
        raise HTTPException(status_code=400, detail="exchange must be US or BIST")
    rule_id = body.rule_id.strip()
    if rule_id not in SIGNAL_RULE_IDS:
        raise HTTPException(
            status_code=400, detail=f"rule_id must be one of {sorted(SIGNAL_RULE_IDS)}"
        )
    timeframe = body.timeframe.strip().lower()
    if timeframe not in TIMEFRAMES:
        raise HTTPException(
            status_code=400, detail=f"timeframe must be one of {', '.join(TIMEFRAMES)}"
        )
    symbol = body.symbol.strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    try:
        return create_signal_alert(
            claims["sub"],
            symbol=symbol,
            exchange=exchange,
            name=body.name,
            rule_id=rule_id,
            timeframe=timeframe,
        )
    except psycopg.Error as exc:
        raise _signal_alerts_unavailable() from exc


@app.delete("/signal-alerts/{alert_id}", status_code=204)
def delete_signal_alert_endpoint(
    alert_id: str, claims: dict = Depends(get_current_claims)
) -> Response:
    try:
        delete_signal_alert(claims["sub"], alert_id)
    except SignalAlertNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Signal alert not found") from exc
    except psycopg.Error as exc:
        raise _signal_alerts_unavailable() from exc
    return Response(status_code=204)


def _saved_screens_unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="Kayıtlı tarama verisi şu an sağlanamıyor.")


class CreateSavedScreenRequest(BaseModel):
    name: str
    criteria: dict


class UpdateSavedScreenRequest(BaseModel):
    name: str | None = None
    criteria: dict | None = None


@app.get("/saved-screens")
def get_saved_screens(claims: dict = Depends(get_current_claims)) -> list[SavedScreen]:
    try:
        return list_saved_screens(claims["sub"])
    except psycopg.Error as exc:
        raise _saved_screens_unavailable() from exc


@app.post("/saved-screens", status_code=201)
def post_saved_screen(
    body: CreateSavedScreenRequest, claims: dict = Depends(get_current_claims)
) -> SavedScreen:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    try:
        return create_saved_screen(claims["sub"], name, body.criteria)
    except psycopg.Error as exc:
        raise _saved_screens_unavailable() from exc


@app.put("/saved-screens/{saved_screen_id}")
def put_saved_screen(
    saved_screen_id: str,
    body: UpdateSavedScreenRequest,
    claims: dict = Depends(get_current_claims),
) -> SavedScreen:
    name = body.name.strip() if body.name is not None else None
    if name is not None and not name:
        raise HTTPException(status_code=400, detail="name cannot be empty")
    try:
        return update_saved_screen(
            claims["sub"], saved_screen_id, name=name, criteria=body.criteria
        )
    except SavedScreenNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Saved screen not found") from exc
    except psycopg.Error as exc:
        raise _saved_screens_unavailable() from exc


@app.delete("/saved-screens/{saved_screen_id}", status_code=204)
def delete_saved_screen_endpoint(
    saved_screen_id: str, claims: dict = Depends(get_current_claims)
) -> Response:
    try:
        delete_saved_screen(claims["sub"], saved_screen_id)
    except SavedScreenNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Saved screen not found") from exc
    except psycopg.Error as exc:
        raise _saved_screens_unavailable() from exc
    return Response(status_code=204)


ComparisonResponse = dict[str, list[ComparisonEntry] | list[str]]


@app.get("/compare")
async def get_comparison(symbols: str) -> ComparisonResponse:
    raw_entries = [item.strip() for item in symbols.split(",") if item.strip()]
    entries: list[tuple[str, str]] = []
    for item in raw_entries:
        if ":" not in item:
            raise HTTPException(
                status_code=400, detail="each symbol must be formatted as SYMBOL:EXCHANGE"
            )
        symbol, _, exchange = item.partition(":")
        exchange = exchange.strip().upper()
        if exchange not in ("US", "BIST"):
            raise HTTPException(status_code=400, detail="exchange must be US or BIST")
        entries.append((symbol.strip().upper(), exchange))

    if not 2 <= len(entries) <= MAX_COMPARISON_SYMBOLS:
        raise HTTPException(
            status_code=400, detail=f"provide between 2 and {MAX_COMPARISON_SYMBOLS} symbols"
        )

    results = await compare_symbols(entries)
    warnings = [warning for entry in results for warning in entry.warnings]
    return {"results": results, "warnings": warnings}
