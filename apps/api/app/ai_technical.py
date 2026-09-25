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

It runs through ONNX Runtime rather than ultralytics/PyTorch: importing torch alone pushed
the process past the 512 MB memory limit of our Render instance (~800 MB peak vs ~410 MB
with ONNX Runtime). The ONNX file is a one-time export of ChartScanAI's weights — see
scripts/export_chartscan_onnx.py — and the pre/post-processing below reproduces
ultralytics' predict() (rect letterbox + class-aware NMS) so detections match exactly.
"""

import hashlib
import threading
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

import httpx
import numpy as np
from pydantic import BaseModel

from app.ai_reports import AIReportUnavailableError, get_cached_report, save_report
from app.market_data import CandlePoint

if TYPE_CHECKING:
    import onnxruntime
    import pandas as pd

# pandas, matplotlib/mplfinance and cv2 are imported inside the functions that use them:
# at module level they were over half of the API's import time (slower Render cold
# starts) and ~90 MB of idle memory, for an endpoint most requests never touch.

# ONNX export of ChartScanAI's weights pinned at commit 58f71206 (see
# docs/product-brief-epic9-ai.md), hosted as a release asset because it exceeds GitHub's
# 100 MB per-file limit. The SHA-256 pin means the file can't change under us.
MODEL_URL = (
    "https://github.com/ulasbudak/trendus/releases/download/"
    "chartscan-yolov8-onnx-v1/chartscan_yolov8.onnx"
)
MODEL_SHA256 = "f57623db970b7bb31133618aedd2ad3dad3cacbdffb8ab33aca0f23eedd84d07"
MODEL_LOCAL_PATH = Path(__file__).parent / "models" / "chartscan_yolov8.onnx"
MODEL_DOWNLOAD_TIMEOUT_SECONDS = 60.0
MODEL_CLASS_NAMES = {0: "Buy", 1: "Sell"}

# Matches ChartScanAI's own default confidence slider (30%) — see its app.py.
DETECTION_CONFIDENCE_THRESHOLD = 0.30
# ultralytics' predict() defaults, reproduced so ONNX detections match the original model.
MODEL_INPUT_SIZE = 640
MODEL_STRIDE = 32
NMS_IOU_THRESHOLD = 0.7
LETTERBOX_PAD_VALUE = 114
MAX_CANDLES = 180  # ChartScanAI's model was trained on 180-candle chart images.
CACHE_TTL_HOURS = 5.0

_model_cache: "onnxruntime.InferenceSession | None" = None
# One inference at a time: each holds a rendered chart plus model activations, and two
# overlapping ones (e.g. technical + combined reports clicked back to back) could push
# the 512 MB instance over its limit.
_inference_lock = threading.Lock()


def _ensure_model_downloaded() -> None:
    if MODEL_LOCAL_PATH.exists():
        return
    MODEL_LOCAL_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = MODEL_LOCAL_PATH.with_suffix(".tmp")
    digest = hashlib.sha256()
    with httpx.stream(
        "GET", MODEL_URL, timeout=MODEL_DOWNLOAD_TIMEOUT_SECONDS, follow_redirects=True
    ) as response:
        response.raise_for_status()
        with tmp_path.open("wb") as f:
            for chunk in response.iter_bytes():
                digest.update(chunk)
                f.write(chunk)
    if digest.hexdigest() != MODEL_SHA256:
        tmp_path.unlink()
        raise RuntimeError("Downloaded chart model does not match the pinned SHA-256.")
    tmp_path.rename(MODEL_LOCAL_PATH)


def _load_model() -> "onnxruntime.InferenceSession":
    global _model_cache
    if _model_cache is None:
        import onnxruntime

        _ensure_model_downloaded()
        options = onnxruntime.SessionOptions()
        # Both keep activation buffers reserved between runs; turning them off measured
        # ~30 MB lower steady-state RSS, which matters on a 512 MB instance.
        options.enable_cpu_mem_arena = False
        options.intra_op_num_threads = 1
        _model_cache = onnxruntime.InferenceSession(
            str(MODEL_LOCAL_PATH), options, providers=["CPUExecutionProvider"]
        )
    return _model_cache


def _candles_to_dataframe(candles: list[CandlePoint]) -> "pd.DataFrame":
    import pandas as pd

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

    import matplotlib

    # Must be set before mplfinance (which imports pyplot) is used: the default backend
    # needs a display and cannot run off the main thread (we render inside
    # asyncio.to_thread) or on a headless server.
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import mplfinance as mpf
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
    # pyplot keeps every figure alive until closed — without this each report leaked one.
    plt.close(fig)
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


def _letterbox(image) -> np.ndarray:
    """ultralytics' rect letterbox: scale the long side to MODEL_INPUT_SIZE, then pad each
    side only up to the next stride multiple (an 1800x650 chart becomes 640x256)."""
    import cv2

    pixels = np.asarray(image.convert("RGB"))
    height, width = pixels.shape[:2]
    ratio = min(MODEL_INPUT_SIZE / height, MODEL_INPUT_SIZE / width)
    new_width, new_height = round(width * ratio), round(height * ratio)
    pad_w = (MODEL_INPUT_SIZE - new_width) % MODEL_STRIDE / 2
    pad_h = (MODEL_INPUT_SIZE - new_height) % MODEL_STRIDE / 2
    pixels = cv2.resize(pixels, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
    pixels = cv2.copyMakeBorder(
        pixels,
        round(pad_h - 0.1),
        round(pad_h + 0.1),
        round(pad_w - 0.1),
        round(pad_w + 0.1),
        cv2.BORDER_CONSTANT,
        value=(LETTERBOX_PAD_VALUE,) * 3,
    )
    return np.ascontiguousarray(pixels.transpose(2, 0, 1)[None], dtype=np.float32) / 255.0


def _non_max_suppression(boxes: np.ndarray, scores: np.ndarray) -> list[int]:
    x1, y1, x2, y2 = boxes.T
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep: list[int] = []
    while order.size:
        best, rest = order[0], order[1:]
        keep.append(int(best))
        overlap_w = np.minimum(x2[best], x2[rest]) - np.maximum(x1[best], x1[rest])
        overlap_h = np.minimum(y2[best], y2[rest]) - np.maximum(y1[best], y1[rest])
        intersection = np.clip(overlap_w, 0, None) * np.clip(overlap_h, 0, None)
        iou = intersection / (areas[best] + areas[rest] - intersection)
        order = rest[iou <= NMS_IOU_THRESHOLD]
    return keep


def _decode_detections(output: np.ndarray) -> list[Detection]:
    """output: YOLOv8 head, shape (1, 4 + num_classes, num_anchors) as center-xywh + scores."""
    predictions = output[0].T
    class_scores = predictions[:, 4:]
    class_ids = class_scores.argmax(axis=1)
    confidences = class_scores.max(axis=1)
    mask = confidences > DETECTION_CONFIDENCE_THRESHOLD
    xywh, class_ids, confidences = predictions[mask, :4], class_ids[mask], confidences[mask]
    xyxy = np.column_stack(
        (
            xywh[:, 0] - xywh[:, 2] / 2,
            xywh[:, 1] - xywh[:, 3] / 2,
            xywh[:, 0] + xywh[:, 2] / 2,
            xywh[:, 1] + xywh[:, 3] / 2,
        )
    )
    # Offsetting boxes per class makes a single NMS pass class-aware (ultralytics' trick).
    keep = _non_max_suppression(xyxy + class_ids[:, None] * 7680, confidences)
    return [
        Detection(label=MODEL_CLASS_NAMES[int(class_ids[i])], confidence=float(confidences[i]))
        for i in keep
    ]


def _run_inference(candles: list[CandlePoint]) -> list[Detection]:
    """Blocking (CPU-bound): chart rendering + model load + inference — run via
    asyncio.to_thread so it never blocks the event loop other endpoints share."""
    with _inference_lock:
        image = _render_chart_image(candles)
        session = _load_model()
        (output,) = session.run(None, {session.get_inputs()[0].name: _letterbox(image)})
    return _decode_detections(output)


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
