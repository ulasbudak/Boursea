from datetime import datetime

from psycopg.rows import dict_row
from pydantic import BaseModel

from app.db import get_connection


class WatchlistNotFoundError(Exception):
    """Raised when a watchlist does not exist or does not belong to the requesting user."""


class WatchlistItem(BaseModel):
    id: str
    symbol: str
    exchange: str
    name: str | None = None
    note: str | None = None
    added_at: datetime


class Watchlist(BaseModel):
    id: str
    name: str
    created_at: datetime
    items: list[WatchlistItem] = []


def _row_to_watchlist(row: dict) -> Watchlist:
    return Watchlist(id=str(row["id"]), name=row["name"], created_at=row["created_at"], items=[])


def _row_to_item(row: dict) -> WatchlistItem:
    return WatchlistItem(
        id=str(row["id"]),
        symbol=row["symbol"],
        exchange=row["exchange"],
        name=row["name"],
        note=row["note"],
        added_at=row["added_at"],
    )


def list_watchlists(user_id: str) -> list[Watchlist]:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT id, name, created_at FROM watchlists "
            "WHERE user_id = %s ORDER BY created_at ASC",
            (user_id,),
        )
        watchlists = {str(row["id"]): _row_to_watchlist(row) for row in cur.fetchall()}

        if not watchlists:
            return []

        cur.execute(
            """
            SELECT wi.id, wi.watchlist_id, wi.symbol, wi.exchange, wi.name, wi.note, wi.added_at
            FROM watchlist_items wi
            JOIN watchlists w ON w.id = wi.watchlist_id
            WHERE w.user_id = %s
            ORDER BY wi.added_at DESC
            """,
            (user_id,),
        )
        for row in cur.fetchall():
            watchlist_id = str(row["watchlist_id"])
            if watchlist_id in watchlists:
                watchlists[watchlist_id].items.append(_row_to_item(row))

    return list(watchlists.values())


def create_watchlist(user_id: str, name: str) -> Watchlist:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "INSERT INTO watchlists (user_id, name) VALUES (%s, %s) RETURNING id, name, created_at",
            (user_id, name),
        )
        row = cur.fetchone()
        conn.commit()
    return _row_to_watchlist(row)


def delete_watchlist(user_id: str, watchlist_id: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM watchlists WHERE id = %s AND user_id = %s",
            (watchlist_id, user_id),
        )
        deleted = cur.rowcount
        conn.commit()
    if deleted == 0:
        raise WatchlistNotFoundError(watchlist_id)


def add_item(
    user_id: str,
    watchlist_id: str,
    *,
    symbol: str,
    exchange: str,
    name: str | None,
) -> WatchlistItem:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT 1 FROM watchlists WHERE id = %s AND user_id = %s", (watchlist_id, user_id)
        )
        if cur.fetchone() is None:
            raise WatchlistNotFoundError(watchlist_id)

        cur.execute(
            """
            INSERT INTO watchlist_items (watchlist_id, symbol, exchange, name)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (watchlist_id, symbol, exchange) DO UPDATE SET name = EXCLUDED.name
            RETURNING id, symbol, exchange, name, note, added_at
            """,
            (watchlist_id, symbol.upper(), exchange.upper(), name),
        )
        row = cur.fetchone()
        conn.commit()
    return _row_to_item(row)


def remove_item(user_id: str, watchlist_id: str, item_id: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM watchlist_items wi
            USING watchlists w
            WHERE wi.watchlist_id = w.id AND w.user_id = %s AND wi.id = %s AND wi.watchlist_id = %s
            """,
            (user_id, item_id, watchlist_id),
        )
        deleted = cur.rowcount
        conn.commit()
    if deleted == 0:
        raise WatchlistNotFoundError(watchlist_id)
