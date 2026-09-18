"""Story 9.2 — technical analysis AI report.

Uses Omar-Karimov/ChartScanAI's pretrained YOLOv8 model (MIT licensed; see
docs/product-brief-epic9-ai.md §"2026-09-18 Güncellemesi" for the model-selection
rationale) to read a candlestick chart image rendered from our own candle data and
classify detected patterns as "Buy" or "Sell". This is a third-party, pretrained
model — not something we trained — so its output is presented as a clearly labeled
"model reading", separate from the deterministic score (app/scoring.py) and never as
investment advice.

The model is lazy-loaded (downloaded + loaded into memory once, on first request to
this module) so it never slows down application startup or unrelated endpoints.
"""

from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

import httpx
import matplotlib
import pandas as pd
from pydantic import BaseModel

# Must be set before mplfinance (which imports pyplot) is used: the default backend
# needs a display and cannot run off the main thread (we render inside
# asyncio.to_thread) or on a headless server (Railway has no display either).
matplotlib.use("Agg")

import mplfinance as mpf  # noqa: E402

from app.ai_reports import AIReportUnavailableError, get_cached_report, save_report
from app.market_data import CandlePoint

if TYPE_CHECKING:
    from ultralytics import YOLO

# Pinned to a specific commit (not a branch) so the weight file we download is
# reproducible and can't change under us — see docs/product-brief-epic9-ai.md.
MODEL_URL = (
    "https://raw.githubusercontent.com/Omar-Karimov/ChartScanAI/"
    "58f71206969d59b5ee8d6b5b90e5ffd8ba6039ec/weights/custom_yolov8.pt"
)
MODEL_LOCAL_PATH = Path(__file__).parent / "models" / "chartscan_yolov8.pt"
MODEL_DOWNLOAD_TIMEOUT_SECONDS = 60.0

# Matches ChartScanAI's own default confidence slider (30%) — see its app.py.
DETECTION_CONFIDENCE_THRESHOLD = 0.30
MAX_CANDLES = 180  # ChartScanAI's model was trained on 180-candle chart images.
CACHE_TTL_HOURS = 5.0

_model_cache: "YOLO | None" = None


def _ensure_model_downloaded() -> None:
    if MODEL_LOCAL_PATH.exists():
        return
    MODEL_LOCAL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with httpx.stream(
        "GET", MODEL_URL, timeout=MODEL_DOWNLOAD_TIMEOUT_SECONDS, follow_redirects=True
    ) as response:
        response.raise_for_status()
        tmp_path = MODEL_LOCAL_PATH.with_suffix(".tmp")
        with tmp_path.open("wb") as f:
            for chunk in response.iter_bytes():
                f.write(chunk)
        tmp_path.rename(MODEL_LOCAL_PATH)


def _load_model() -> "YOLO":
    global _model_cache
    if _model_cache is None:
        from ultralytics import YOLO

        _ensure_model_downloaded()
        _model_cache = YOLO(str(MODEL_LOCAL_PATH))
    return _model_cache


def _candles_to_dataframe(candles: list[CandlePoint]) -> pd.DataFrame:
    recent = candles[-MAX_CANDLES:]
    df = pd.DataFrame(
        {
            "Open": [c.open for c in recent],
            "High": [c.high for c in recent],
            "Low": [c.low for c in recent],
            "Close": [c.close for c in recent],
            "Volume": [c.volume or 0 for c in recent],
        },
        index=pd.to_datetime([c.time for c in recent], unit="s"),
    )
    return df


def _render_chart_image(candles: list[CandlePoint]):
    from io import BytesIO

    from PIL import Image

    df = _candles_to_dataframe(candles)
    fig, _ = mpf.plot(
        df,
        type="candle",
        style="yahoo",
        axisoff=True,
        ylabel="",
        volume=False,
        figsize=(18, 6.5),
        returnfig=True,
    )
    buffer = BytesIO()
    fig.savefig(buffer, format="png", dpi=100)
    buffer.seek(0)
    return Image.open(buffer)


class Detection(BaseModel):
    label: str
    confidence: float


class TechnicalAIReport(BaseModel):
    symbol: str
    exchange: str
    report: str
    detections: list[Detection]
    generated_at: datetime
    cached: bool


def _summarize_detections(detections: list[Detection]) -> str:
    if not detections:
        return (
            "Grafik modeli bu grafikte güvenilir bir Al/Sat örüntüsü tespit etmedi. "
            "Bu, üçüncü taraf, deneysel bir modelin okumasıdır — yatırım tavsiyesi değildir."
        )

    buy_count = sum(1 for d in detections if d.label == "Buy")
    sell_count = sum(1 for d in detections if d.label == "Sell")
    top = max(detections, key=lambda d: d.confidence)

    lines = [
        f"Grafik modeli, incelenen grafikte {buy_count} Al ve {sell_count} Sat "
        "örüntüsü tespit etti.",
        f"En yüksek güvenli bulgu: {top.label} (%{top.confidence * 100:.0f} güven).",
        "Bu, ChartScanAI adlı üçüncü taraf, açık kaynak bir modelin ikili (Al/Sat) "
        "sınıflandırmasıdır; isimli bir formasyon (üçgen, omuz-baş-omuz vb.) tespit etmiyor, "
        "resmi bir doğruluk metriği yayınlanmamış, görece küçük bir toplulukla destekleniyor. "
        "Deneysel/gösterge niteliğindedir — yatırım tavsiyesi değildir.",
    ]
    return "\n\n".join(lines)


def _run_inference(candles: list[CandlePoint]) -> list[Detection]:
    """Blocking (CPU-bound): chart rendering + model load + inference — run via
    asyncio.to_thread so it never blocks the event loop other endpoints share."""
    image = _render_chart_image(candles)
    model = _load_model()
    results = model.predict(image, conf=DETECTION_CONFIDENCE_THRESHOLD, verbose=False)
    boxes = results[0].boxes
    return [
        Detection(label=model.names[int(box.cls[0])], confidence=float(box.conf[0]))
        for box in boxes
    ]


async def get_technical_report(
    symbol: str, exchange: str, timeframe: str = "daily"
) -> TechnicalAIReport:
    import asyncio

    from app.market_data import MarketDataUnavailableError, get_us_candles

    symbol = symbol.strip().upper()
    exchange_filter = exchange.strip().upper()

    cached = get_cached_report(symbol, exchange_filter, "technical", CACHE_TTL_HOURS)
    if cached is not None:
        content, generated_at = cached
        return TechnicalAIReport(
            symbol=symbol,
            exchange=exchange_filter,
            report=content["report"],
            detections=[Detection(**d) for d in content["detections"]],
            generated_at=generated_at,
            cached=True,
        )

    if exchange_filter != "US":
        raise AIReportUnavailableError(
            f"Teknik analiz AI raporu {exchange_filter} borsası için henüz desteklenmiyor."
        )

    try:
        candles = await get_us_candles(symbol, timeframe)
    except MarketDataUnavailableError as exc:
        raise AIReportUnavailableError(str(exc)) from exc

    if len(candles) < 20:
        raise AIReportUnavailableError("Grafik modeli için yeterli mum verisi yok.")

    detections = await asyncio.to_thread(_run_inference, candles)

    report_text = _summarize_detections(detections)
    content = {"report": report_text, "detections": [d.model_dump() for d in detections]}
    generated_at = save_report(symbol, exchange_filter, "technical", content)

    return TechnicalAIReport(
        symbol=symbol,
        exchange=exchange_filter,
        report=report_text,
        detections=detections,
        generated_at=generated_at,
        cached=False,
    )
