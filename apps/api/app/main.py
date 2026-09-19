import psycopg
from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.ai_combined import CombinedAIReport, get_combined_report
from app.ai_fundamental import AIReportUnavailableError, FundamentalAIReport, get_fundamental_report
from app.ai_technical import TechnicalAIReport, get_technical_report
from app.alerts import (
    AlertNotFoundError,
    PriceAlert,
    create_alert,
    delete_alert,
    evaluate_and_persist,
    list_alerts,
)
from app.auth import get_current_claims
from app.bulletins import Bulletin, get_or_create_todays_bulletin, list_bulletins
from app.comparison import MAX_COMPARISON_SYMBOLS, ComparisonEntry, compare_symbols
from app.config import get_settings
from app.db import check_database_connection
from app.entitlements import (
    Entitlement,
    EntitlementLimitError,
    enforce_ai_reports_access,
    enforce_alert_limit,
    enforce_portfolio_limit,
    enforce_signal_alert_limit,
    enforce_simulation_limit,
    enforce_watchlist_item_limit,
    get_entitlement,
)
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
from app.highlights import Highlight, get_highlights
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
from app.notes import StockNote, delete_note, get_note, upsert_note
from app.notifications import NotificationSettings
from app.notifications import get_settings_for_user as get_notification_settings_for_user
from app.notifications import upsert_settings_for_user as upsert_notification_settings
from app.portfolios import (
    InsufficientQuantityError,
    Portfolio,
    PortfolioNotFoundError,
    Position,
    PositionNotFoundError,
    add_transaction,
    create_portfolio,
    delete_portfolio,
    delete_position,
    list_portfolios,
    value_portfolios,
)
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
from app.simulations import (
    InsufficientFundsError,
    Simulation,
    SimulationNotFoundError,
    SimulationPosition,
    SnapshotPoint,
    create_simulation,
    delete_simulation,
    get_history,
    list_simulations,
    place_order,
    value_simulations,
)
from app.simulations import (
    InsufficientQuantityError as InsufficientSimulationQuantityError,
)
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


FundamentalAIReportResponse = dict[str, FundamentalAIReport | list[str] | None]


@app.get("/symbols/ai-report/fundamental")
async def get_fundamental_ai_report_endpoint(
    symbol: str, exchange: str, claims: dict = Depends(get_current_claims)
) -> FundamentalAIReportResponse:
    try:
        enforce_ai_reports_access(claims["sub"])
    except EntitlementLimitError as exc:
        raise HTTPException(status_code=403, detail=exc.message) from exc

    warnings: list[str] = []
    report: FundamentalAIReport | None = None
    try:
        report = await get_fundamental_report(symbol, exchange)
    except AIReportUnavailableError as exc:
        warnings.append(str(exc))
    except psycopg.Error:
        warnings.append("AI rapor verisi şu an sağlanamıyor.")

    return {"report": report, "warnings": warnings}


TechnicalAIReportResponse = dict[str, TechnicalAIReport | list[str] | None]


@app.get("/symbols/ai-report/technical")
async def get_technical_ai_report_endpoint(
    symbol: str, exchange: str, claims: dict = Depends(get_current_claims)
) -> TechnicalAIReportResponse:
    try:
        enforce_ai_reports_access(claims["sub"])
    except EntitlementLimitError as exc:
        raise HTTPException(status_code=403, detail=exc.message) from exc

    warnings: list[str] = []
    report: TechnicalAIReport | None = None
    try:
        report = await get_technical_report(symbol, exchange)
    except AIReportUnavailableError as exc:
        warnings.append(str(exc))
    except psycopg.Error:
        warnings.append("AI rapor verisi şu an sağlanamıyor.")

    return {"report": report, "warnings": warnings}


CombinedAIReportResponse = dict[str, CombinedAIReport | list[str] | None]


@app.get("/symbols/ai-report/combined")
async def get_combined_ai_report_endpoint(
    symbol: str, exchange: str, claims: dict = Depends(get_current_claims)
) -> CombinedAIReportResponse:
    try:
        enforce_ai_reports_access(claims["sub"])
    except EntitlementLimitError as exc:
        raise HTTPException(status_code=403, detail=exc.message) from exc

    warnings: list[str] = []
    report: CombinedAIReport | None = None
    try:
        report = await get_combined_report(symbol, exchange)
    except AIReportUnavailableError as exc:
        warnings.append(str(exc))
    except psycopg.Error:
        warnings.append("AI rapor verisi şu an sağlanamıyor.")

    return {"report": report, "warnings": warnings}


BulletinsResponse = dict[str, list[Bulletin] | list[str]]


@app.get("/bulletins")
async def get_bulletins_endpoint(claims: dict = Depends(get_current_claims)) -> BulletinsResponse:
    try:
        enforce_ai_reports_access(claims["sub"])
    except EntitlementLimitError as exc:
        raise HTTPException(status_code=403, detail=exc.message) from exc

    warnings: list[str] = []
    try:
        await get_or_create_todays_bulletin()
    except AIReportUnavailableError as exc:
        warnings.append(str(exc))
    except psycopg.Error:
        warnings.append("Bülten verisi şu an sağlanamıyor.")

    try:
        bulletins = list_bulletins()
    except psycopg.Error:
        bulletins = []
        if not warnings:
            warnings.append("Bülten verisi şu an sağlanamıyor.")

    return {"bulletins": bulletins, "warnings": warnings}


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
        enforce_watchlist_item_limit(claims["sub"])
        return add_item(
            claims["sub"], watchlist_id, symbol=symbol, exchange=exchange, name=body.name
        )
    except EntitlementLimitError as exc:
        raise HTTPException(status_code=403, detail=exc.message) from exc
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
        enforce_alert_limit(claims["sub"])
        return create_alert(
            claims["sub"],
            symbol=symbol,
            exchange=exchange,
            name=body.name,
            direction=direction,
            threshold=body.threshold,
        )
    except EntitlementLimitError as exc:
        raise HTTPException(status_code=403, detail=exc.message) from exc
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
        enforce_signal_alert_limit(claims["sub"])
        return create_signal_alert(
            claims["sub"],
            symbol=symbol,
            exchange=exchange,
            name=body.name,
            rule_id=rule_id,
            timeframe=timeframe,
        )
    except EntitlementLimitError as exc:
        raise HTTPException(status_code=403, detail=exc.message) from exc
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


class CreatePortfolioRequest(BaseModel):
    name: str


class AddTransactionRequest(BaseModel):
    symbol: str
    exchange: str
    name: str | None = None
    quantity: float
    price: float
    side: str


def _portfolios_unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="Portföy verisi şu an sağlanamıyor.")


PortfoliosResponse = dict[str, list[Portfolio] | list[str]]


@app.get("/portfolios")
async def get_portfolios(claims: dict = Depends(get_current_claims)) -> PortfoliosResponse:
    try:
        portfolios = list_portfolios(claims["sub"])
    except psycopg.Error as exc:
        raise _portfolios_unavailable() from exc
    valued, warnings = await value_portfolios(portfolios)
    return {"portfolios": valued, "warnings": warnings}


@app.post("/portfolios", status_code=201)
def post_portfolio(
    body: CreatePortfolioRequest, claims: dict = Depends(get_current_claims)
) -> Portfolio:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    try:
        enforce_portfolio_limit(claims["sub"])
        return create_portfolio(claims["sub"], name)
    except EntitlementLimitError as exc:
        raise HTTPException(status_code=403, detail=exc.message) from exc
    except psycopg.Error as exc:
        raise _portfolios_unavailable() from exc


@app.delete("/portfolios/{portfolio_id}", status_code=204)
def delete_portfolio_endpoint(
    portfolio_id: str, claims: dict = Depends(get_current_claims)
) -> Response:
    try:
        delete_portfolio(claims["sub"], portfolio_id)
    except PortfolioNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Portfolio not found") from exc
    except psycopg.Error as exc:
        raise _portfolios_unavailable() from exc
    return Response(status_code=204)


@app.post("/portfolios/{portfolio_id}/positions", status_code=201)
def post_position(
    portfolio_id: str, body: AddTransactionRequest, claims: dict = Depends(get_current_claims)
) -> Position:
    exchange = body.exchange.strip().upper()
    if exchange not in ("US", "BIST"):
        raise HTTPException(status_code=400, detail="exchange must be US or BIST")
    side = body.side.strip().lower()
    if side not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="side must be buy or sell")
    symbol = body.symbol.strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    if body.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be positive")
    if body.price <= 0:
        raise HTTPException(status_code=400, detail="price must be positive")
    try:
        return add_transaction(
            claims["sub"],
            portfolio_id,
            symbol=symbol,
            exchange=exchange,
            name=body.name,
            quantity=body.quantity,
            price=body.price,
            side=side,
        )
    except PortfolioNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Portfolio not found") from exc
    except InsufficientQuantityError as exc:
        raise HTTPException(
            status_code=400, detail="cannot sell more than the current position quantity"
        ) from exc
    except psycopg.Error as exc:
        raise _portfolios_unavailable() from exc


@app.delete("/portfolios/{portfolio_id}/positions/{position_id}", status_code=204)
def delete_position_endpoint(
    portfolio_id: str, position_id: str, claims: dict = Depends(get_current_claims)
) -> Response:
    try:
        delete_position(claims["sub"], portfolio_id, position_id)
    except PositionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Position not found") from exc
    except psycopg.Error as exc:
        raise _portfolios_unavailable() from exc
    return Response(status_code=204)


def _simulations_unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="Simülasyon verisi şu an sağlanamıyor.")


class CreateSimulationRequest(BaseModel):
    name: str
    starting_budget: float


class PlaceOrderRequest(BaseModel):
    symbol: str
    exchange: str
    name: str | None = None
    quantity: float
    side: str


SimulationsResponse = dict[str, list[Simulation] | list[str]]


@app.get("/simulations")
async def get_simulations(claims: dict = Depends(get_current_claims)) -> SimulationsResponse:
    try:
        simulations = list_simulations(claims["sub"])
    except psycopg.Error as exc:
        raise _simulations_unavailable() from exc
    valued, warnings = await value_simulations(simulations)
    return {"simulations": valued, "warnings": warnings}


@app.post("/simulations", status_code=201)
def post_simulation(
    body: CreateSimulationRequest, claims: dict = Depends(get_current_claims)
) -> Simulation:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if body.starting_budget <= 0:
        raise HTTPException(status_code=400, detail="starting_budget must be positive")
    try:
        enforce_simulation_limit(claims["sub"])
        return create_simulation(claims["sub"], name, body.starting_budget)
    except EntitlementLimitError as exc:
        raise HTTPException(status_code=403, detail=exc.message) from exc
    except psycopg.Error as exc:
        raise _simulations_unavailable() from exc


@app.delete("/simulations/{simulation_id}", status_code=204)
def delete_simulation_endpoint(
    simulation_id: str, claims: dict = Depends(get_current_claims)
) -> Response:
    try:
        delete_simulation(claims["sub"], simulation_id)
    except SimulationNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Simulation not found") from exc
    except psycopg.Error as exc:
        raise _simulations_unavailable() from exc
    return Response(status_code=204)


@app.post("/simulations/{simulation_id}/orders", status_code=201)
async def post_order(
    simulation_id: str, body: PlaceOrderRequest, claims: dict = Depends(get_current_claims)
) -> SimulationPosition:
    symbol = body.symbol.strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    exchange = body.exchange.strip().upper()
    if exchange not in ("US", "BIST"):
        raise HTTPException(status_code=400, detail="exchange must be US or BIST")
    side = body.side.strip().lower()
    if side not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="side must be buy or sell")
    if body.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be positive")
    try:
        return await place_order(
            claims["sub"],
            simulation_id,
            symbol=symbol,
            exchange=exchange,
            name=body.name,
            quantity=body.quantity,
            side=side,
        )
    except SimulationNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Simulation not found") from exc
    except InsufficientFundsError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Yetersiz bakiye: {exc} için bu miktarda alım yapmaya nakit yetmiyor.",
        ) from exc
    except InsufficientSimulationQuantityError as exc:
        raise HTTPException(
            status_code=400, detail="cannot sell more than the current position quantity"
        ) from exc
    except MarketDataUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _simulations_unavailable() from exc


SimulationHistoryResponse = dict[str, list[SnapshotPoint] | list[str]]


@app.get("/simulations/{simulation_id}/history")
async def get_simulation_history(
    simulation_id: str, claims: dict = Depends(get_current_claims)
) -> SimulationHistoryResponse:
    try:
        snapshots = await get_history(claims["sub"], simulation_id)
    except SimulationNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Simulation not found") from exc
    except psycopg.Error as exc:
        raise _simulations_unavailable() from exc
    return {"history": snapshots, "warnings": []}


HighlightsResponse = dict[str, list[Highlight] | list[str]]


@app.get("/highlights")
async def get_highlights_endpoint(claims: dict = Depends(get_current_claims)) -> HighlightsResponse:
    interest_sectors = (claims.get("user_metadata") or {}).get("interest_sectors") or []
    highlights, warnings = await get_highlights(interest_sectors)
    return {"highlights": highlights, "warnings": warnings}


class UpsertNoteRequest(BaseModel):
    symbol: str
    exchange: str
    note: str


def _notes_unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="Not verisi şu an sağlanamıyor.")


@app.get("/notes")
def get_note_endpoint(
    symbol: str, exchange: str, claims: dict = Depends(get_current_claims)
) -> StockNote | None:
    exchange_filter = exchange.strip().upper()
    if exchange_filter not in ("US", "BIST"):
        raise HTTPException(status_code=400, detail="exchange must be US or BIST")
    try:
        return get_note(claims["sub"], symbol, exchange_filter)
    except psycopg.Error as exc:
        raise _notes_unavailable() from exc


@app.put("/notes")
def put_note_endpoint(
    body: UpsertNoteRequest, claims: dict = Depends(get_current_claims)
) -> StockNote:
    exchange = body.exchange.strip().upper()
    if exchange not in ("US", "BIST"):
        raise HTTPException(status_code=400, detail="exchange must be US or BIST")
    note = body.note.strip()
    if not note:
        raise HTTPException(status_code=400, detail="note is required")
    try:
        return upsert_note(claims["sub"], body.symbol, exchange, note)
    except psycopg.Error as exc:
        raise _notes_unavailable() from exc


@app.delete("/notes", status_code=204)
def delete_note_endpoint(
    symbol: str, exchange: str, claims: dict = Depends(get_current_claims)
) -> Response:
    exchange_filter = exchange.strip().upper()
    if exchange_filter not in ("US", "BIST"):
        raise HTTPException(status_code=400, detail="exchange must be US or BIST")
    try:
        delete_note(claims["sub"], symbol, exchange_filter)
    except psycopg.Error as exc:
        raise _notes_unavailable() from exc
    return Response(status_code=204)


@app.get("/entitlements")
def get_entitlements_endpoint(claims: dict = Depends(get_current_claims)) -> Entitlement:
    return get_entitlement(claims["sub"])
