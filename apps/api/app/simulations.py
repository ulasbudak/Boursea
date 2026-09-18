from datetime import date, datetime

from psycopg.rows import dict_row
from pydantic import BaseModel

from app.db import get_connection
from app.market_data import MarketDataUnavailableError, get_us_overview

UNAVAILABLE_WARNING = (
    "Bazı pozisyonların güncel fiyatı alınamadığı için toplam değere dahil edilmedi."
)
BIST_UNSUPPORTED_MESSAGE = (
    "BIST hisseleri için canlı fiyat kaynağı yok, simülasyonda alım-satım yapılamıyor."
)

SNAPSHOT_HISTORY_LIMIT = 90


class SimulationNotFoundError(Exception):
    """Raised when a simulation does not exist or does not belong to the requesting user."""


class InsufficientFundsError(Exception):
    """Raised when a buy order would cost more than the simulation's cash balance."""


class InsufficientQuantityError(Exception):
    """Raised when a sell would reduce a position's quantity below zero."""


class SimulationPosition(BaseModel):
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


class Simulation(BaseModel):
    id: str
    name: str
    starting_budget: float
    cash_balance: float
    created_at: datetime
    positions: list[SimulationPosition] = []
    positions_value: float = 0.0
    total_equity: float = 0.0
    total_pnl_abs: float = 0.0
    total_pnl_pct: float | None = None


class SnapshotPoint(BaseModel):
    snapshot_date: date
    cash_balance: float
    positions_value: float
    total_equity: float
    pnl_abs: float
    pnl_pct: float | None = None


def _row_to_position(row: dict) -> SimulationPosition:
    quantity = float(row["quantity"])
    avg_cost = float(row["avg_cost"])
    return SimulationPosition(
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


def _row_to_simulation(row: dict) -> Simulation:
    return Simulation(
        id=str(row["id"]),
        name=row["name"],
        starting_budget=float(row["starting_budget"]),
        cash_balance=float(row["cash_balance"]),
        created_at=row["created_at"],
    )


def _row_to_snapshot(row: dict) -> SnapshotPoint:
    return SnapshotPoint(
        snapshot_date=row["snapshot_date"],
        cash_balance=float(row["cash_balance"]),
        positions_value=float(row["positions_value"]),
        total_equity=float(row["total_equity"]),
        pnl_abs=float(row["pnl_abs"]),
        pnl_pct=float(row["pnl_pct"]) if row["pnl_pct"] is not None else None,
    )


def list_simulations(user_id: str) -> list[Simulation]:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT id, name, starting_budget, cash_balance, created_at FROM simulations "
            "WHERE user_id = %s ORDER BY created_at ASC",
            (user_id,),
        )
        simulations = {str(row["id"]): _row_to_simulation(row) for row in cur.fetchall()}

        if not simulations:
            return []

        cur.execute(
            """
            SELECT p.id, p.simulation_id, p.symbol, p.exchange, p.name, p.quantity, p.avg_cost,
                   p.created_at, p.updated_at
            FROM simulation_positions p
            JOIN simulations s ON s.id = p.simulation_id
            WHERE s.user_id = %s
            ORDER BY p.created_at ASC
            """,
            (user_id,),
        )
        for row in cur.fetchall():
            simulation_id = str(row["simulation_id"])
            if simulation_id in simulations:
                simulations[simulation_id].positions.append(_row_to_position(row))

    return list(simulations.values())


def create_simulation(user_id: str, name: str, starting_budget: float) -> Simulation:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            INSERT INTO simulations (user_id, name, starting_budget, cash_balance)
            VALUES (%s, %s, %s, %s)
            RETURNING id, name, starting_budget, cash_balance, created_at
            """,
            (user_id, name, starting_budget, starting_budget),
        )
        row = cur.fetchone()
        conn.commit()
    return _row_to_simulation(row)


def delete_simulation(user_id: str, simulation_id: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM simulations WHERE id = %s AND user_id = %s",
            (simulation_id, user_id),
        )
        deleted = cur.rowcount
        conn.commit()
    if deleted == 0:
        raise SimulationNotFoundError(simulation_id)


async def place_order(
    user_id: str,
    simulation_id: str,
    *,
    symbol: str,
    exchange: str,
    name: str | None,
    quantity: float,
    side: str,
) -> SimulationPosition:
    """Buy/sell executed at the current real market price (fetched here, not client-supplied)
    — unlike Portfolio's manual price entry, this is what makes it an actual simulation of
    real-data trading rather than a self-reported ledger. Buy is rejected if it would cost
    more than the simulation's cash balance; sell is rejected if it exceeds the held quantity.
    Only US symbols are tradable — no live BIST price source exists to execute against.
    """
    symbol = symbol.upper()
    exchange = exchange.upper()

    if exchange != "US":
        raise MarketDataUnavailableError(BIST_UNSUPPORTED_MESSAGE)

    overview = await get_us_overview(symbol)
    price = overview.price
    if price is None:
        raise MarketDataUnavailableError(f"No live price available for {symbol}")

    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT cash_balance FROM simulations WHERE id = %s AND user_id = %s",
            (simulation_id, user_id),
        )
        simulation_row = cur.fetchone()
        if simulation_row is None:
            raise SimulationNotFoundError(simulation_id)
        cash_balance = float(simulation_row["cash_balance"])

        cur.execute(
            """
            SELECT id, quantity, avg_cost FROM simulation_positions
            WHERE simulation_id = %s AND symbol = %s AND exchange = %s
            """,
            (simulation_id, symbol, exchange),
        )
        existing = cur.fetchone()

        if side == "buy":
            cost = quantity * price
            if cost > cash_balance:
                raise InsufficientFundsError(symbol)
            new_cash = cash_balance - cost

            if existing is None:
                cur.execute(
                    """
                    INSERT INTO simulation_positions
                        (simulation_id, symbol, exchange, name, quantity, avg_cost)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, symbol, exchange, name, quantity, avg_cost, created_at, updated_at
                    """,
                    (simulation_id, symbol, exchange, name, quantity, price),
                )
            else:
                old_qty = float(existing["quantity"])
                old_avg_cost = float(existing["avg_cost"])
                new_qty = old_qty + quantity
                new_avg_cost = (old_qty * old_avg_cost + quantity * price) / new_qty
                cur.execute(
                    """
                    UPDATE simulation_positions
                    SET quantity = %s, avg_cost = %s, name = %s, updated_at = now()
                    WHERE id = %s
                    RETURNING id, symbol, exchange, name, quantity, avg_cost, created_at, updated_at
                    """,
                    (new_qty, new_avg_cost, name, existing["id"]),
                )
        else:
            if existing is None or float(existing["quantity"]) < quantity:
                raise InsufficientQuantityError(symbol)
            new_cash = cash_balance + quantity * price
            remaining = float(existing["quantity"]) - quantity

            if remaining == 0:
                cur.execute(
                    "DELETE FROM simulation_positions WHERE id = %s "
                    "RETURNING id, symbol, exchange, name, quantity, avg_cost, "
                    "created_at, updated_at",
                    (existing["id"],),
                )
            else:
                cur.execute(
                    """
                    UPDATE simulation_positions SET quantity = %s, updated_at = now() WHERE id = %s
                    RETURNING id, symbol, exchange, name, quantity, avg_cost, created_at, updated_at
                    """,
                    (remaining, existing["id"]),
                )

        position_row = cur.fetchone()
        cur.execute(
            "UPDATE simulations SET cash_balance = %s WHERE id = %s", (new_cash, simulation_id)
        )
        conn.commit()

    position = _row_to_position(position_row)
    position.current_price = price
    position.market_value = position.quantity * price
    position.pnl_abs = position.market_value - position.cost_basis
    position.pnl_pct = (
        (position.pnl_abs / position.cost_basis * 100) if position.cost_basis else None
    )
    return position


async def value_simulations(simulations: list[Simulation]) -> tuple[list[Simulation], list[str]]:
    """Attach live price/market-value/P&L to every position and roll up simulation totals.
    All simulation positions are US (place_order rejects BIST), so this is simpler than
    Portfolio's value_portfolios(): only a "price temporarily unavailable" case to handle."""
    warnings: list[str] = []
    price_cache: dict[str, float | None] = {}
    saw_unavailable = False

    for simulation in simulations:
        positions_value = 0.0
        for position in simulation.positions:
            if position.symbol not in price_cache:
                try:
                    overview = await get_us_overview(position.symbol)
                    price_cache[position.symbol] = overview.price
                except MarketDataUnavailableError:
                    price_cache[position.symbol] = None

            price = price_cache[position.symbol]
            if price is None:
                position.price_unavailable = True
                saw_unavailable = True
                continue

            position.current_price = price
            position.market_value = position.quantity * price
            position.pnl_abs = position.market_value - position.cost_basis
            position.pnl_pct = (
                (position.pnl_abs / position.cost_basis * 100) if position.cost_basis else None
            )
            positions_value += position.market_value

        simulation.positions_value = positions_value
        simulation.total_equity = simulation.cash_balance + positions_value
        simulation.total_pnl_abs = simulation.total_equity - simulation.starting_budget
        simulation.total_pnl_pct = (
            (simulation.total_pnl_abs / simulation.starting_budget * 100)
            if simulation.starting_budget
            else None
        )

    if saw_unavailable:
        warnings.append(UNAVAILABLE_WARNING)

    return simulations, warnings


def save_todays_snapshot(simulation: Simulation) -> SnapshotPoint:
    """Upsert today's row — unlike Story 9.3's bulletins (write-once), a simulation's cash/
    positions value can change repeatedly through the day (every order, every page view), so
    today's snapshot is recomputed each time. Past days are never touched again once written."""
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            INSERT INTO simulation_snapshots
                (simulation_id, snapshot_date, cash_balance, positions_value, total_equity,
                 pnl_abs, pnl_pct)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (simulation_id, snapshot_date) DO UPDATE SET
                cash_balance = EXCLUDED.cash_balance,
                positions_value = EXCLUDED.positions_value,
                total_equity = EXCLUDED.total_equity,
                pnl_abs = EXCLUDED.pnl_abs,
                pnl_pct = EXCLUDED.pnl_pct
            RETURNING snapshot_date, cash_balance, positions_value, total_equity, pnl_abs, pnl_pct
            """,
            (
                simulation.id,
                date.today(),
                simulation.cash_balance,
                simulation.positions_value,
                simulation.total_equity,
                simulation.total_pnl_abs,
                simulation.total_pnl_pct,
            ),
        )
        row = cur.fetchone()
        conn.commit()
    return _row_to_snapshot(row)


def list_snapshots(simulation_id: str, limit: int = SNAPSHOT_HISTORY_LIMIT) -> list[SnapshotPoint]:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT snapshot_date, cash_balance, positions_value, total_equity, pnl_abs, pnl_pct
            FROM simulation_snapshots
            WHERE simulation_id = %s
            ORDER BY snapshot_date ASC
            LIMIT %s
            """,
            (simulation_id, limit),
        )
        rows = cur.fetchall()
    return [_row_to_snapshot(row) for row in rows]


async def get_history(user_id: str, simulation_id: str) -> list[SnapshotPoint]:
    simulations = [s for s in list_simulations(user_id) if s.id == simulation_id]
    if not simulations:
        raise SimulationNotFoundError(simulation_id)

    valued, _ = await value_simulations(simulations)
    save_todays_snapshot(valued[0])
    return list_snapshots(simulation_id)
