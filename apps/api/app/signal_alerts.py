from datetime import UTC, datetime

from psycopg.rows import dict_row
from pydantic import BaseModel

from app.db import get_connection
from app.market_data import MarketDataUnavailableError, get_us_candles
from app.technical import SIGNAL_RULE_CATALOG, SIGNAL_RULE_IDS, evaluate_signals

UNAVAILABLE_WARNING = "ABD sinyal alarmları şu an değerlendirilemiyor."
BIST_UNAVAILABLE_WARNING = "BIST hisseleri için sinyal verisi bu sürümde sağlanmıyor."

RULE_NAMES_BY_ID = {rule["rule_id"]: rule["rule_name"] for rule in SIGNAL_RULE_CATALOG}


class SignalAlertNotFoundError(Exception):
    """Raised when a signal alert does not exist or does not belong to the requesting user."""


class SignalAlert(BaseModel):
    id: str
    symbol: str
    exchange: str
    name: str | None = None
    rule_id: str
    rule_name: str
    timeframe: str
    status: str
    created_at: datetime
    triggered_at: datetime | None = None
    unavailable: bool = False


def _row_to_alert(row: dict) -> SignalAlert:
    return SignalAlert(
        id=str(row["id"]),
        symbol=row["symbol"],
        exchange=row["exchange"],
        name=row["name"],
        rule_id=row["rule_id"],
        rule_name=RULE_NAMES_BY_ID.get(row["rule_id"], row["rule_id"]),
        timeframe=row["timeframe"],
        status=row["status"],
        created_at=row["created_at"],
        triggered_at=row["triggered_at"],
    )


def list_alerts(user_id: str) -> list[SignalAlert]:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT id, symbol, exchange, name, rule_id, timeframe, status, created_at, "
            "triggered_at FROM signal_alerts WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,),
        )
        return [_row_to_alert(row) for row in cur.fetchall()]


def create_alert(
    user_id: str,
    *,
    symbol: str,
    exchange: str,
    name: str | None,
    rule_id: str,
    timeframe: str,
) -> SignalAlert:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            INSERT INTO signal_alerts (user_id, symbol, exchange, name, rule_id, timeframe)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, symbol, exchange, name, rule_id, timeframe, status, created_at,
                      triggered_at
            """,
            (user_id, symbol.upper(), exchange.upper(), name, rule_id, timeframe),
        )
        row = cur.fetchone()
        conn.commit()
    return _row_to_alert(row)


def delete_alert(user_id: str, alert_id: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM signal_alerts WHERE id = %s AND user_id = %s",
            (alert_id, user_id),
        )
        deleted = cur.rowcount
        conn.commit()
    if deleted == 0:
        raise SignalAlertNotFoundError(alert_id)


def _mark_triggered(alert_id: str, triggered_at: datetime) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE signal_alerts SET status = 'triggered', triggered_at = %s WHERE id = %s",
            (triggered_at, alert_id),
        )
        conn.commit()


async def evaluate_and_persist(
    alerts: list[SignalAlert],
) -> tuple[list[SignalAlert], list[str]]:
    """Check active US signal alerts against the latest evaluated signals and persist any
    that just fired. Mirrors app/alerts.py's price-alert evaluation shape (on-read, no
    background job — see docs/stories/story-5.2.md for the rationale, unchanged here).

    BIST alerts are never evaluated (get_bist_candles() always returns [] until a live BIST
    data source is chosen, see docs/architecture.md §11) and come back flagged
    `unavailable=True` rather than silently staying "active" forever.
    """
    warnings: list[str] = []
    signal_cache: dict[tuple[str, str], list | None] = {}
    updated: list[SignalAlert] = []

    for alert in alerts:
        if alert.exchange == "BIST":
            updated.append(alert.model_copy(update={"unavailable": True}))
            if BIST_UNAVAILABLE_WARNING not in warnings:
                warnings.append(BIST_UNAVAILABLE_WARNING)
            continue

        if alert.status != "active":
            updated.append(alert)
            continue

        cache_key = (alert.symbol, alert.timeframe)
        if cache_key not in signal_cache:
            try:
                candles = await get_us_candles(alert.symbol, alert.timeframe)
                signal_cache[cache_key] = evaluate_signals(candles)
            except MarketDataUnavailableError:
                signal_cache[cache_key] = None

        signals = signal_cache[cache_key]
        if signals is None:
            updated.append(alert.model_copy(update={"unavailable": True}))
            if UNAVAILABLE_WARNING not in warnings:
                warnings.append(UNAVAILABLE_WARNING)
            continue

        match = next((s for s in signals if s.rule_id == alert.rule_id), None)
        if match is not None:
            triggered_at = datetime.fromtimestamp(match.triggered_at, tz=UTC)
            _mark_triggered(alert.id, triggered_at)
            updated.append(
                alert.model_copy(update={"status": "triggered", "triggered_at": triggered_at})
            )
        else:
            updated.append(alert)

    return updated, warnings


__all__ = [
    "SIGNAL_RULE_CATALOG",
    "SIGNAL_RULE_IDS",
    "SignalAlert",
    "SignalAlertNotFoundError",
    "create_alert",
    "delete_alert",
    "evaluate_and_persist",
    "list_alerts",
]
