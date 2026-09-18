"""Shared global (not per-user) cache for AI-generated reports — used by Story 9.1
(fundamental) and Story 9.2 (technical). Caching by symbol+exchange, not by user,
because the underlying LLM/CV output is the same for everyone looking at a given
symbol — this is what keeps per-call LLM API and CV inference cost bounded."""

from datetime import UTC, datetime, timedelta

from psycopg.rows import dict_row
from psycopg.types.json import Json

from app.db import get_connection


class AIReportUnavailableError(Exception):
    """Raised by both app.ai_fundamental and app.ai_technical when a report cannot
    be produced (missing data, exchange not supported, provider/model error)."""


def get_cached_report(
    symbol: str, exchange: str, report_type: str, ttl_hours: float
) -> tuple[dict, datetime] | None:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT content, generated_at FROM ai_reports
            WHERE symbol = %s AND exchange = %s AND report_type = %s
            """,
            (symbol.upper(), exchange.upper(), report_type),
        )
        row = cur.fetchone()

    if row is None:
        return None
    if row["generated_at"] < datetime.now(UTC) - timedelta(hours=ttl_hours):
        return None
    return row["content"], row["generated_at"]


def save_report(symbol: str, exchange: str, report_type: str, content: dict) -> datetime:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            INSERT INTO ai_reports (symbol, exchange, report_type, content)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (symbol, exchange, report_type)
            DO UPDATE SET content = EXCLUDED.content, generated_at = now()
            RETURNING generated_at
            """,
            (symbol.upper(), exchange.upper(), report_type, Json(content)),
        )
        row = cur.fetchone()
        conn.commit()
    return row["generated_at"]
