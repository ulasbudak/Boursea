"""Daily sector bulletin (premium). Picks a sector by deterministic day-of-year
rotation (no extra API cost to "discover" a good sector), scores that sector's
stocks with the existing rule-based engine (app/scoring.py), and asks Gemini to
write a short narrative grounded in those scores.

Unlike app/ai_reports.py's cache (one row per symbol, overwritten on refresh),
this is an APPEND-ONLY archive: one row per calendar day, never overwritten or
deleted (user requirement, 2026-09-18/19). `get_or_create_todays_bulletin()` is
the Story 9.1/9.2-style "generate on first request of the day" entry point.
"""

import asyncio
from datetime import date, datetime

from psycopg.rows import dict_row
from psycopg.types.json import Json
from pydantic import BaseModel

from app.ai_reports import AIReportUnavailableError, call_gemini
from app.db import get_connection
from app.scoring import compute_us_score
from app.screener import load_us_universe

# Keep in sync with packages/shared/src/i18n/sectors.ts ALL_SECTORS — same Finnhub
# taxonomy used by apps/api/app/data/us_universe.json.
SECTORS = [
    "Technology",
    "Energy",
    "Healthcare",
    "Financial Services",
    "Consumer Cyclical",
    "Consumer Defensive",
    "Industrials",
    "Basic Materials",
    "Real Estate",
    "Utilities",
    "Communication Services",
]

MAX_CONCURRENT_SCORING = 15
TOP_PICKS_COUNT = 5
LIST_LIMIT = 30

SYSTEM_PROMPT = (
    "Sen Borocean uygulaması için çalışan bir bülten editörüsün. Sana bir sektör adı ve "
    "o sektörde kural bazlı bir skor motoruyla (0-100, Al/Nötr/Sat) en yüksek puan alan "
    "birkaç hisse verilecek. Bu veriye dayanarak, Türkçe, 2-4 paragraflık bir sektör "
    "bülteni yaz: sektöre kısa bir bakış, ardından hisselerin neden öne çıktığını "
    "verilen skor/etiket bilgisine dayanarak anlat. Yalnızca sana verilen veriyi "
    "yorumla — verilmeyen bir sayıyı/haberi uydurma. Bülten sonunda ayrı bir satırda "
    "mutlaka şunu yaz: 'Bu bülten yapay zeka tarafından üretilmiştir, yatırım tavsiyesi "
    "değildir.'"
)


class Pick(BaseModel):
    symbol: str
    name: str
    score: int
    label: str


class Bulletin(BaseModel):
    bulletin_date: date
    sector: str
    picks: list[Pick]
    content: str
    created_at: datetime


def pick_sector_for_date(d: date) -> str:
    return SECTORS[d.timetuple().tm_yday % len(SECTORS)]


async def _score_sector_candidates(sector: str) -> list[Pick]:
    universe = load_us_universe()
    candidates = [e for e in universe if e.get("sector") == sector]
    if not candidates:
        return []

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_SCORING)

    async def score_one(entry: dict):
        async with semaphore:
            try:
                score = await compute_us_score(entry["symbol"])
            except Exception:
                return None
        if score is None:
            return None
        return Pick(
            symbol=entry["symbol"], name=entry["name"], score=score.value, label=score.label
        )

    results = await asyncio.gather(*(score_one(entry) for entry in candidates))
    scored = [p for p in results if p is not None]
    scored.sort(key=lambda p: p.score, reverse=True)
    return scored[:TOP_PICKS_COUNT]


def _build_bulletin_prompt(sector: str, picks: list[Pick]) -> str:
    lines = [f"Sektör: {sector}", "", "Öne çıkan hisseler (kural bazlı skor):"]
    for pick in picks:
        lines.append(f"- {pick.symbol} ({pick.name}): {pick.score}/100, {pick.label}")
    return "\n".join(lines)


def _row_to_bulletin(row: dict) -> Bulletin:
    return Bulletin(
        bulletin_date=row["bulletin_date"],
        sector=row["sector"],
        picks=[Pick(**p) for p in row["picks"]],
        content=row["content"],
        created_at=row["created_at"],
    )


def _get_bulletin_by_date(bulletin_date: date) -> Bulletin | None:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT bulletin_date, sector, picks, content, created_at "
            "FROM sector_bulletins WHERE bulletin_date = %s",
            (bulletin_date,),
        )
        row = cur.fetchone()
    return _row_to_bulletin(row) if row else None


def _save_bulletin(bulletin_date: date, sector: str, picks: list[Pick], content: str) -> Bulletin:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            INSERT INTO sector_bulletins (bulletin_date, sector, picks, content)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (bulletin_date) DO NOTHING
            RETURNING bulletin_date, sector, picks, content, created_at
            """,
            (bulletin_date, sector, Json([p.model_dump() for p in picks]), content),
        )
        row = cur.fetchone()
        if row is None:
            # Another request already inserted today's bulletin between our check
            # and this insert — read what they wrote instead of erroring.
            cur.execute(
                "SELECT bulletin_date, sector, picks, content, created_at "
                "FROM sector_bulletins WHERE bulletin_date = %s",
                (bulletin_date,),
            )
            row = cur.fetchone()
        conn.commit()
    return _row_to_bulletin(row)


def list_bulletins(limit: int = LIST_LIMIT) -> list[Bulletin]:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT bulletin_date, sector, picks, content, created_at "
            "FROM sector_bulletins ORDER BY bulletin_date DESC LIMIT %s",
            (limit,),
        )
        rows = cur.fetchall()
    return [_row_to_bulletin(row) for row in rows]


async def get_or_create_todays_bulletin() -> Bulletin:
    today = date.today()
    existing = _get_bulletin_by_date(today)
    if existing is not None:
        return existing

    sector = pick_sector_for_date(today)
    picks = await _score_sector_candidates(sector)
    if not picks:
        raise AIReportUnavailableError(f"{sector} sektörü için bugün yeterli veri yok.")

    user_prompt = _build_bulletin_prompt(sector, picks)
    content = await call_gemini(SYSTEM_PROMPT, user_prompt)

    return _save_bulletin(today, sector, picks, content)
