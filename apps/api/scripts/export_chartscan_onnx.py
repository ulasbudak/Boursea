"""One-time export of ChartScanAI's YOLOv8 weights to the ONNX file app/ai_technical.py
serves (published as the `chartscan-yolov8-onnx-v1` GitHub release asset).

Needs ultralytics, which is deliberately not an API dependency (it pulls in torch):

    pip install ultralytics==8.4.155 onnx onnxslim
    python scripts/export_chartscan_onnx.py

Then compare `shasum -a 256` of the output with MODEL_SHA256 in app/ai_technical.py.
"""

from pathlib import Path

import httpx
from ultralytics import YOLO

WEIGHTS_URL = (
    "https://raw.githubusercontent.com/Omar-Karimov/ChartScanAI/"
    "58f71206969d59b5ee8d6b5b90e5ffd8ba6039ec/weights/custom_yolov8.pt"
)
WEIGHTS_PATH = Path("chartscan_yolov8.pt")

if not WEIGHTS_PATH.exists():
    WEIGHTS_PATH.write_bytes(httpx.get(WEIGHTS_URL, follow_redirects=True, timeout=60).content)

# dynamic=True: the chart is letterboxed to 640x256, not a square 640x640.
YOLO(str(WEIGHTS_PATH)).export(format="onnx", dynamic=True, simplify=True)
