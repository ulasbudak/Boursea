from datetime import datetime

from psycopg.rows import dict_row
from pydantic import BaseModel

from app.db import get_connection
from app.market_data import MarketDataUnavailableError, get_us_overview

UNAVAILABLE_WARNING = (
    "Bazı pozisyonların güncel fiyatı alınamadığı için toplam değere dahil edilmedi."
)
BIST_UNAVAILABLE_WARNING = "BIST pozisyonları için canlı fiyat verisi henüz yok."


class PortfolioNotFoundError(Exception):
    """Raised when a portfolio does not exist or does not belong to the requesting user."""


class PositionNotFoundError(Exception):
    """Raised when a position does not exist or does not belong to the requesting portfolio."""


class InsufficientQuantityError(Exception):
    """Raised when a sell would reduce a position's quantity below zero."""


class Position(BaseModel):
    id: str
    symbol: str
    exchange: str
    name: str | None = None
    quantity: float
    avg_cost: float
    created_at: datetime
    updated_at: datetime
    current_price: float | None = None
    market_value: float | None = None
    cost_basis: float
    pnl_abs: float | None = None
    pnl_pct: float | None = None
    price_unavailable: bool = False


class Portfolio(BaseModel):
    id: str
    name: str
    created_at: datetime
    positions: list[Position] = []
    total_market_value: float = 0.0
    total_cost_basis: float = 0.0
    total_pnl_abs: float = 0.0
    total_pnl_pct: float | None = None


def _row_to_position(row: dict) -> Position:
    quantity = float(row["quantity"])
    avg_cost = float(row["avg_cost"])
    return Position(
        id=str(row["id"]),
        symbol=row["symbol"],
        exchange=row["exchange"],
        name=row["name"],
        quantity=quantity,
        avg_cost=avg_cost,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        cost_basis=quantity * avg_cost,
    )


def _row_to_portfolio(row: dict) -> Portfolio:
    return Portfolio(id=str(row["id"]), name=row["name"], created_at=row["created_at"])


def list_portfolios(user_id: str) -> list[Portfolio]:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT id, name, created_at FROM portfolios "
            "WHERE user_id = %s ORDER BY created_at ASC",
            (user_id,),
        )
        portfolios = {str(row["id"]): _row_to_portfolio(row) for row in cur.fetchall()}

        if not portfolios:
            return []

        cur.execute(
            """
            SELECT p.id, p.portfolio_id, p.symbol, p.exchange, p.name, p.quantity, p.avg_cost,
                   p.created_at, p.updated_at
            FROM positions p
            JOIN portfolios f ON f.id = p.portfolio_id
            WHERE f.user_id = %s
            ORDER BY p.created_at ASC
            """,
            (user_id,),
        )
        for row in cur.fetchall():
            portfolio_id = str(row["portfolio_id"])
            if portfolio_id in portfolios:
                portfolios[portfolio_id].positions.append(_row_to_position(row))

    return list(portfolios.values())


def create_portfolio(user_id: str, name: str) -> Portfolio:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "INSERT INTO portfolios (user_id, name) VALUES (%s, %s) RETURNING id, name, created_at",
            (user_id, name),
        )
        row = cur.fetchone()
        conn.commit()
    return _row_to_portfolio(row)


def delete_portfolio(user_id: str, portfolio_id: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM portfolios WHERE id = %s AND user_id = %s",
            (portfolio_id, user_id),
        )
        deleted = cur.rowcount
        conn.commit()
    if deleted == 0:
        raise PortfolioNotFoundError(portfolio_id)


def add_transaction(
    user_id: str,
    portfolio_id: str,
    *,
    symbol: str,
    exchange: str,
    name: str | None,
    quantity: float,
    price: float,
    side: str,
) -> Position:
    """Buy adds to the position, weighted-averaging `avg_cost`. Sell reduces quantity
    (average cost is unchanged by a sell — that's standard cost-basis accounting); selling
    the full quantity removes the position. Selling more than held raises
    InsufficientQuantityError.
    """
    symbol = symbol.upper()
    exchange = exchange.upper()

    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT 1 FROM portfolios WHERE id = %s AND user_id = %s", (portfolio_id, user_id)
        )
        if cur.fetchone() is None:
            raise PortfolioNotFoundError(portfolio_id)

        cur.execute(
            """
            SELECT id, quantity, avg_cost FROM positions
            WHERE portfolio_id = %s AND symbol = %s AND exchange = %s
            """,
            (portfolio_id, symbol, exchange),
        )
        existing = cur.fetchone()

        if side == "buy":
            if existing is None:
                cur.execute(
                    """
                    INSERT INTO positions (portfolio_id, symbol, exchange, name, quantity, avg_cost)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, symbol, exchange, name, quantity, avg_cost, created_at, updated_at
                    """,
                    (portfolio_id, symbol, exchange, name, quantity, price),
                )
            else:
                old_qty = float(existing["quantity"])
                old_avg_cost = float(existing["avg_cost"])
                new_qty = old_qty + quantity
                new_avg_cost = (old_qty * old_avg_cost + quantity * price) / new_qty
                cur.execute(
                    """
                    UPDATE positions
                    SET quantity = %s, avg_cost = %s, name = %s, updated_at = now()
                    WHERE id = %s
                    RETURNING id, symbol, exchange, name, quantity, avg_cost, created_at, updated_at
                    """,
                    (new_qty, new_avg_cost, name, existing["id"]),
                )
        else:
            if existing is None or float(existing["quantity"]) < quantity:
                raise InsufficientQuantityError(symbol)
            remaining = float(existing["quantity"]) - quantity
            if remaining == 0:
                cur.execute(
                    "DELETE FROM positions WHERE id = %s "
                    "RETURNING id, symbol, exchange, name, quantity, avg_cost, "
                    "created_at, updated_at",
                    (existing["id"],),
                )
            else:
                cur.execute(
                    """
                    UPDATE positions SET quantity = %s, updated_at = now() WHERE id = %s
                    RETURNING id, symbol, exchange, name, quantity, avg_cost, created_at, updated_at
                    """,
                    (remaining, existing["id"]),
                )

        row = cur.fetchone()
        conn.commit()
    return _row_to_position(row)


def delete_position(user_id: str, portfolio_id: str, position_id: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM positions po
            USING portfolios f
            WHERE po.portfolio_id = f.id AND f.user_id = %s AND po.id = %s AND po.portfolio_id = %s
            """,
            (user_id, position_id, portfolio_id),
        )
        deleted = cur.rowcount
        conn.commit()
    if deleted == 0:
        raise PositionNotFoundError(position_id)


async def value_portfolios(portfolios: list[Portfolio]) -> tuple[list[Portfolio], list[str]]:
    """Attach live price/market-value/P&L to every position and roll up portfolio totals.

    BIST positions have no live price source (see docs/architecture.md) and are always
    flagged `price_unavailable`; US positions are flagged the same way if Finnhub fails.
    Positions without a price are excluded from the portfolio totals rather than treated
    as zero, so a stale/missing quote never silently understates the portfolio's value.
    """
    warnings: list[str] = []
    price_cache: dict[str, float | None] = {}
    saw_bist = False
    saw_unavailable_us = False

    for portfolio in portfolios:
        total_market_value = 0.0
        total_cost_basis = 0.0
        for position in portfolio.positions:
            if position.exchange == "BIST":
                position.price_unavailable = True
                saw_bist = True
                continue

            if position.symbol not in price_cache:
                try:
                    overview = await get_us_overview(position.symbol)
                    price_cache[position.symbol] = overview.price
                except MarketDataUnavailableError:
                    price_cache[position.symbol] = None

            price = price_cache[position.symbol]
            if price is None:
                position.price_unavailable = True
                saw_unavailable_us = True
                continue

            position.current_price = price
            position.market_value = position.quantity * price
            position.pnl_abs = position.market_value - position.cost_basis
            position.pnl_pct = (
                (position.pnl_abs / position.cost_basis * 100) if position.cost_basis else None
            )
            total_market_value += position.market_value
            total_cost_basis += position.cost_basis

        portfolio.total_market_value = total_market_value
        portfolio.total_cost_basis = total_cost_basis
        portfolio.total_pnl_abs = total_market_value - total_cost_basis
        portfolio.total_pnl_pct = (
            (portfolio.total_pnl_abs / total_cost_basis * 100) if total_cost_basis else None
        )

    if saw_bist:
        warnings.append(BIST_UNAVAILABLE_WARNING)
    if saw_unavailable_us:
        warnings.append(UNAVAILABLE_WARNING)

    return portfolios, warnings
