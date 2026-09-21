from psycopg.rows import dict_row
from pydantic import BaseModel

from app.alerts import list_alerts
from app.db import get_connection
from app.portfolios import list_portfolios
from app.signal_alerts import list_alerts as list_signal_alerts
from app.simulations import list_simulations
from app.watchlists import list_watchlists

# Story 8.2 (RevenueCat/Stripe purchase flow) hasn't shipped yet — every user without a row
# in `entitlements` defaults to "free" (see get_tier). No endpoint currently writes this
# table; a future webhook handler will upsert it once real billing exists.
FREE_WATCHLIST_ITEM_LIMIT = 10
FREE_ALERT_LIMIT = 3
FREE_SIGNAL_ALERT_LIMIT = 3
FREE_PORTFOLIO_LIMIT = 1
FREE_SIMULATION_LIMIT = 1

# Temporary product decision (2026-09-21): launch with every feature unlocked for every
# user, deferring Story 8.2 (real purchase flow) until there's a user base worth
# monetizing. get_entitlement() below short-circuits on this before ever consulting the
# DB tier. Flip to False (or delete this branch entirely, along with the "promo" tier in
# Entitlement.tier and its frontend handling) once real billing ships.
ALL_FEATURES_FREE = True


class Entitlement(BaseModel):
    tier: str
    watchlist_item_limit: int | None
    alert_limit: int | None
    signal_alert_limit: int | None
    portfolio_limit: int | None
    simulation_limit: int | None
    advanced_indicators: bool
    realtime_data: bool
    ai_reports: bool


class EntitlementLimitError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def get_tier(user_id: str) -> str:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("SELECT tier FROM entitlements WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
    return row["tier"] if row else "free"


def get_entitlement(user_id: str) -> Entitlement:
    if ALL_FEATURES_FREE:
        return Entitlement(
            tier="promo",
            watchlist_item_limit=None,
            alert_limit=None,
            signal_alert_limit=None,
            portfolio_limit=None,
            simulation_limit=None,
            advanced_indicators=True,
            realtime_data=True,
            ai_reports=True,
        )
    if get_tier(user_id) == "premium":
        return Entitlement(
            tier="premium",
            watchlist_item_limit=None,
            alert_limit=None,
            signal_alert_limit=None,
            portfolio_limit=None,
            simulation_limit=None,
            advanced_indicators=True,
            realtime_data=True,
            ai_reports=True,
        )
    return Entitlement(
        tier="free",
        watchlist_item_limit=FREE_WATCHLIST_ITEM_LIMIT,
        alert_limit=FREE_ALERT_LIMIT,
        signal_alert_limit=FREE_SIGNAL_ALERT_LIMIT,
        portfolio_limit=FREE_PORTFOLIO_LIMIT,
        simulation_limit=FREE_SIMULATION_LIMIT,
        advanced_indicators=False,
        realtime_data=False,
        ai_reports=False,
    )


def enforce_watchlist_item_limit(user_id: str) -> None:
    entitlement = get_entitlement(user_id)
    if entitlement.watchlist_item_limit is None:
        return
    total_items = sum(len(w.items) for w in list_watchlists(user_id))
    if total_items >= entitlement.watchlist_item_limit:
        raise EntitlementLimitError(
            f"Ücretsiz katmanda en fazla {entitlement.watchlist_item_limit} izleme listesi "
            "öğesi ekleyebilirsin. Sınırsız için premium'a geç."
        )


def enforce_alert_limit(user_id: str) -> None:
    entitlement = get_entitlement(user_id)
    if entitlement.alert_limit is None:
        return
    active = sum(1 for a in list_alerts(user_id) if a.status == "active")
    if active >= entitlement.alert_limit:
        raise EntitlementLimitError(
            f"Ücretsiz katmanda en fazla {entitlement.alert_limit} aktif fiyat alarmı "
            "kurabilirsin. Sınırsız için premium'a geç."
        )


def enforce_signal_alert_limit(user_id: str) -> None:
    entitlement = get_entitlement(user_id)
    if entitlement.signal_alert_limit is None:
        return
    active = sum(1 for a in list_signal_alerts(user_id) if a.status == "active")
    if active >= entitlement.signal_alert_limit:
        raise EntitlementLimitError(
            f"Ücretsiz katmanda en fazla {entitlement.signal_alert_limit} aktif sinyal "
            "alarmı kurabilirsin. Sınırsız için premium'a geç."
        )


def enforce_portfolio_limit(user_id: str) -> None:
    entitlement = get_entitlement(user_id)
    if entitlement.portfolio_limit is None:
        return
    if len(list_portfolios(user_id)) >= entitlement.portfolio_limit:
        raise EntitlementLimitError(
            f"Ücretsiz katmanda en fazla {entitlement.portfolio_limit} portföy "
            "oluşturabilirsin. Sınırsız için premium'a geç."
        )


def enforce_simulation_limit(user_id: str) -> None:
    entitlement = get_entitlement(user_id)
    if entitlement.simulation_limit is None:
        return
    if len(list_simulations(user_id)) >= entitlement.simulation_limit:
        raise EntitlementLimitError(
            f"Ücretsiz katmanda en fazla {entitlement.simulation_limit} simülasyon "
            "oluşturabilirsin. Sınırsız için premium'a geç."
        )


def enforce_ai_reports_access(user_id: str) -> None:
    if not get_entitlement(user_id).ai_reports:
        raise EntitlementLimitError(
            "AI analiz raporları yalnızca premium katmanda kullanılabilir. Premium'a geç."
        )
