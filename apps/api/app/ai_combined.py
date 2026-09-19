"""Combined AI analysis report — synthesizes app.ai_fundamental's and app.ai_technical's
reports into one short verdict, so the AI Analysis tab leads with a single takeaway instead
of making the user read two separate reports and reconcile them itself.

Reuses get_fundamental_report/get_technical_report as-is (each already handles its own
cache-or-generate + BIST/US restriction) — this module only adds the synthesis step on top,
so "generate the combined report" transparently generates the underlying two first if either
isn't cached yet."""

import asyncio
from datetime import datetime

from pydantic import BaseModel

from app.ai_fundamental import FundamentalAIReport, get_fundamental_report
from app.ai_reports import call_gemini, get_cached_report, save_report
from app.ai_technical import TechnicalAIReport, get_technical_report

CACHE_TTL_HOURS = 5.0  # matches technical's TTL — the more volatile of the two inputs

SYSTEM_PROMPT = (
    "Sen Trendus uygulaması için çalışan bir finansal analistsin. Sana bir hissenin temel "
    "analiz raporu ile grafik örüntü modelinin (teknik) okuması verilecek. Bu ikisini "
    "birleştirerek, Türkçe, 2-3 paragraflık kısa bir özet değerlendirme yaz: temel ve "
    "teknik görünüm aynı yönü mü işaret ediyor yoksa çelişiyor mu, kullanıcının nelere "
    "dikkat etmesi gerektiğini vurgula. Yalnızca sana verilen iki rapora dayan, yeni bir "
    "sayı veya veri uydurma. Raporun sonunda ayrı bir satırda mutlaka şunu yaz: "
    "'Bu rapor yapay zeka tarafından üretilmiştir, yatırım tavsiyesi değildir.'"
)


class CombinedAIReport(BaseModel):
    symbol: str
    exchange: str
    report: str
    generated_at: datetime
    cached: bool


def _build_user_prompt(fundamental: FundamentalAIReport, technical: TechnicalAIReport) -> str:
    return (
        f"Sembol: {fundamental.symbol} ({fundamental.exchange})\n\n"
        f"Temel Analiz Raporu:\n{fundamental.report}\n\n"
        f"Teknik Analiz (Grafik Modeli) Raporu:\n{technical.report}"
    )


async def get_combined_report(symbol: str, exchange: str) -> CombinedAIReport:
    symbol = symbol.strip().upper()
    exchange_filter = exchange.strip().upper()

    cached = get_cached_report(symbol, exchange_filter, "combined", CACHE_TTL_HOURS)
    if cached is not None:
        content, generated_at = cached
        return CombinedAIReport(
            symbol=symbol,
            exchange=exchange_filter,
            report=content["report"],
            generated_at=generated_at,
            cached=True,
        )

    fundamental, technical = await asyncio.gather(
        get_fundamental_report(symbol, exchange_filter),
        get_technical_report(symbol, exchange_filter),
    )

    user_prompt = _build_user_prompt(fundamental, technical)
    report_text = await call_gemini(SYSTEM_PROMPT, user_prompt)

    generated_at = save_report(symbol, exchange_filter, "combined", {"report": report_text})
    return CombinedAIReport(
        symbol=symbol,
        exchange=exchange_filter,
        report=report_text,
        generated_at=generated_at,
        cached=False,
    )
