from datetime import datetime

from psycopg.rows import dict_row
from pydantic import BaseModel

from app.db import get_connection


class StockNote(BaseModel):
    id: str
    symbol: str
    exchange: str
    note: str
    created_at: datetime
    updated_at: datetime


def _row_to_note(row: dict) -> StockNote:
    return StockNote(
        id=str(row["id"]),
        symbol=row["symbol"],
        exchange=row["exchange"],
        note=row["note"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def get_note(user_id: str, symbol: str, exchange: str) -> StockNote | None:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT id, symbol, exchange, note, created_at, updated_at
            FROM stock_notes
            WHERE user_id = %s AND symbol = %s AND exchange = %s
            """,
            (user_id, symbol.upper(), exchange.upper()),
        )
        row = cur.fetchone()
    return _row_to_note(row) if row else None


def upsert_note(user_id: str, symbol: str, exchange: str, note: str) -> StockNote:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            INSERT INTO stock_notes (user_id, symbol, exchange, note)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_id, symbol, exchange)
            DO UPDATE SET note = EXCLUDED.note, updated_at = now()
            RETURNING id, symbol, exchange, note, created_at, updated_at
            """,
            (user_id, symbol.upper(), exchange.upper(), note),
        )
        row = cur.fetchone()
        conn.commit()
    return _row_to_note(row)


def delete_note(user_id: str, symbol: str, exchange: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM stock_notes WHERE user_id = %s AND symbol = %s AND exchange = %s",
            (user_id, symbol.upper(), exchange.upper()),
        )
        conn.commit()
