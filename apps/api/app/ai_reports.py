"""Shared global (not per-user) cache for AI-generated reports — used by Story 9.1
(fundamental) and Story 9.2 (technical). Caching by symbol+exchange, not by user,
because the underlying LLM/CV output is the same for everyone looking at a given
symbol — this is what keeps per-call LLM API and CV inference cost bounded.

Also holds the shared Gemini API call (`call_gemini`) — every AI report module
(fundamental, sector bulletin) uses the same request shape with its own system
prompt, so the HTTP plumbing lives here once. Uses a Google AI Studio API key
(https://aistudio.google.com/apikey), not Vertex AI."""

from datetime import UTC, datetime, timedelta

import httpx
from psycopg.rows import dict_row
from psycopg.types.json import Json

from app.config import get_settings
from app.db import get_connection

GEMINI_TIMEOUT_SECONDS = 30.0
GEMINI_MAX_OUTPUT_TOKENS = 1024


class AIReportUnavailableError(Exception):
    """Raised by app.ai_fundamental, app.ai_technical, and app.bulletins when a
    report cannot be produced (missing data, exchange not supported, provider/model
    error)."""


async def call_gemini(
    system_prompt: str, user_prompt: str, *, client: httpx.AsyncClient | None = None
) -> str:
    settings = get_settings()
    if not settings.google_api_key:
        raise AIReportUnavailableError("GOOGLE_API_KEY is not configured")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )

    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=GEMINI_TIMEOUT_SECONDS)
    try:
        response = await http_client.post(
            url,
            headers={
                "x-goog-api-key": settings.google_api_key,
                "content-type": "application/json",
            },
            json={
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                "generationConfig": {
                    "maxOutputTokens": GEMINI_MAX_OUTPUT_TOKENS,
                    # gemini-3.6-flash reasons by default, which burns most of
                    # maxOutputTokens on invisible "thoughts" before writing any
                    # report text — disable it, these reports don't need it.
                    "thinkingConfig": {"thinkingBudget": 0},
                },
            },
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        raise AIReportUnavailableError(f"Gemini request failed: {exc}") from exc
    finally:
        if owns_client:
            await http_client.aclose()

    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise AIReportUnavailableError("Gemini response had no candidates")
    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
    if not text:
        raise AIReportUnavailableError("Gemini response had empty text")
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
