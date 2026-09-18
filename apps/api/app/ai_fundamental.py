from datetime import datetime

import httpx
from pydantic import BaseModel

from app.ai_reports import AIReportUnavailableError, call_anthropic, get_cached_report, save_report
from app.fundamentals import (
    FundamentalsSnapshot,
    FundamentalsUnavailableError,
    HistoricalPerformance,
    SectorComparison,
    get_us_fundamentals,
    get_us_historical_performance,
    get_us_sector_comparison,
)

CACHE_TTL_HOURS = 24.0

SYSTEM_PROMPT = (
    "Sen Trendus uygulaması için çalışan bir finansal analistsin. Sana verilen sayısal "
    "temel analiz verisine (F/K, ROE, borç/özsermaye, sektör kıyaslaması, geçmiş finansal "
    "performans) dayanarak, Türkçe, 3-5 paragraflık kısa bir temel analiz raporu yaz. "
    "Yalnızca sana verilen veriyi yorumla — verilmeyen bir sayıyı uydurma, dışarıdan "
    "haber/fiyat bilgisi ekleme. Raporun sonunda ayrı bir satırda mutlaka şunu yaz: "
    "'Bu rapor yapay zeka tarafından üretilmiştir, yatırım tavsiyesi değildir.'"
)


class FundamentalAIReport(BaseModel):
    symbol: str
    exchange: str
    report: str
    generated_at: datetime
    cached: bool


def _format_metric_comparison(label: str, comparison) -> str | None:
    if comparison is None or comparison.value is None:
        return None
    line = f"{label}: {comparison.value:.2f}"
    if comparison.sector_average is not None:
        line += f" (sektör ortalaması: {comparison.sector_average:.2f}"
        if comparison.diff_pct is not None:
            line += f", fark: {comparison.diff_pct:+.1f}%"
        line += ")"
    return line


def _build_user_prompt(
    fundamentals: FundamentalsSnapshot,
    sector_comparison: SectorComparison | None,
    history: HistoricalPerformance | None,
) -> str:
    lines = [f"Sembol: {fundamentals.symbol} ({fundamentals.exchange})", "", "Temel Veriler:"]

    metric_labels = {
        "pe_ratio": "F/K oranı",
        "pb_ratio": "PD/DD oranı",
        "roe": "Özsermaye kârlılığı (ROE)",
        "roa": "Aktif kârlılığı (ROA)",
        "eps": "Hisse başına kâr (EPS)",
        "eps_growth": "EPS büyümesi",
        "dividend_yield": "Temettü verimi",
        "debt_to_equity": "Borç/özsermaye",
        "gross_margin": "Brüt marj",
        "net_margin": "Net marj",
        "ebitda_margin": "FAVÖK marjı",
        "free_cash_flow": "Serbest nakit akışı",
        "market_cap": "Piyasa değeri",
    }
    for field, label in metric_labels.items():
        comparison = getattr(sector_comparison, field, None) if sector_comparison else None
        if comparison is not None:
            formatted = _format_metric_comparison(label, comparison)
            if formatted:
                lines.append(f"- {formatted}")
                continue
        value = getattr(fundamentals, field, None)
        if value is not None:
            lines.append(f"- {label}: {value:.2f}")

    if history and (history.annual or history.quarterly):
        lines.append("")
        lines.append("Geçmiş Finansal Performans (dönem, hisse başına gelir, EPS):")
        for point in history.annual[-5:]:
            lines.append(
                f"- {point.period}: gelir/hisse={point.revenue_per_share}, EPS={point.eps}"
            )

    return "\n".join(lines)


async def get_fundamental_report(
    symbol: str, exchange: str, *, client: httpx.AsyncClient | None = None
) -> FundamentalAIReport:
    symbol = symbol.strip().upper()
    exchange_filter = exchange.strip().upper()

    cached = get_cached_report(symbol, exchange_filter, "fundamental", CACHE_TTL_HOURS)
    if cached is not None:
        content, generated_at = cached
        return FundamentalAIReport(
            symbol=symbol,
            exchange=exchange_filter,
            report=content["report"],
            generated_at=generated_at,
            cached=True,
        )

    if exchange_filter != "US":
        raise AIReportUnavailableError(
            f"Temel analiz AI raporu {exchange_filter} borsası için henüz desteklenmiyor."
        )

    try:
        fundamentals = await get_us_fundamentals(symbol, client=client)
    except FundamentalsUnavailableError as exc:
        raise AIReportUnavailableError(str(exc)) from exc

    sector_comparison = await get_us_sector_comparison(symbol, fundamentals, client=client)
    try:
        history = await get_us_historical_performance(symbol, client=client)
    except FundamentalsUnavailableError:
        history = None

    user_prompt = _build_user_prompt(fundamentals, sector_comparison, history)
    report_text = await call_anthropic(SYSTEM_PROMPT, user_prompt, client=client)

    generated_at = save_report(symbol, exchange_filter, "fundamental", {"report": report_text})
    return FundamentalAIReport(
        symbol=symbol,
        exchange=exchange_filter,
        report=report_text,
        generated_at=generated_at,
        cached=False,
    )
