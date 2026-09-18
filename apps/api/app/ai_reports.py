"""Shared global (not per-user) cache for AI-generated reports — used by Story 9.1
(fundamental) and Story 9.2 (technical). Caching by symbol+exchange, not by user,
because the underlying LLM/CV output is the same for everyone looking at a given
symbol — this is what keeps per-call LLM API and CV inference cost bounded.

Also holds the shared Anthropic Messages API call (`call_anthropic`) — every AI
report module (fundamental, sector bulletin) uses the same request shape with its
own system prompt, so the HTTP plumbing lives here once."""

from datetime import UTC, datetime, timedelta

import httpx
from psycopg.rows import dict_row
from psycopg.types.json import Json

from app.config import get_settings
from app.db import get_connection

ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_API_VERSION = "2023-06-01"
ANTHROPIC_TIMEOUT_SECONDS = 30.0
ANTHROPIC_MAX_TOKENS = 1024


class AIReportUnavailableError(Exception):
    """Raised by app.ai_fundamental, app.ai_technical, and app.bulletins when a
    report cannot be produced (missing data, exchange not supported, provider/model
    error)."""


async def call_anthropic(
    system_prompt: str, user_prompt: str, *, client: httpx.AsyncClient | None = None
) -> str:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise AIReportUnavailableError("ANTHROPIC_API_KEY is not configured")

    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=ANTHROPIC_TIMEOUT_SECONDS)
    try:
        response = await http_client.post(
            ANTHROPIC_MESSAGES_URL,
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": ANTHROPIC_API_VERSION,
                "content-type": "application/json",
            },
            json={
                "model": settings.anthropic_model,
                "max_tokens": ANTHROPIC_MAX_TOKENS,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            },
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        raise AIReportUnavailableError(f"Anthropic request failed: {exc}") from exc
    finally:
        if owns_client:
            await http_client.aclose()

    content_blocks = payload.get("content")
    if not isinstance(content_blocks, list) or not content_blocks:
        raise AIReportUnavailableError("Anthropic response had no content")
    text = "".join(
        block.get("text", "") for block in content_blocks if isinstance(block, dict)
    ).strip()
    if not text:
        raise AIReportUnavailableError("Anthropic response had empty text")
    return text


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
