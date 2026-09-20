from pydantic import BaseModel

from app.market_data import CandlePoint

MAX_SIGNALS = 20

# Mirrors the rule_id/rule_name pairs produced by evaluate_signals() below — kept as a
# standalone catalog (rather than derived from evaluate_signals) so callers like
# app/signal_alerts.py can validate/list rule_ids without running a full evaluation.
SIGNAL_RULE_CATALOG: list[dict[str, str]] = [
    {"rule_id": "rsi_oversold", "rule_name": "RSI 30 altına düştü", "direction": "bearish"},
    {"rule_id": "rsi_overbought", "rule_name": "RSI 70 üstüne çıktı", "direction": "bullish"},
    {
        "rule_id": "macd_bullish_cross",
        "rule_name": "MACD sinyal çizgisini yukarı kesti",
        "direction": "bullish",
    },
    {
        "rule_id": "macd_bearish_cross",
        "rule_name": "MACD sinyal çizgisini aşağı kesti",
        "direction": "bearish",
    },
    {
        "rule_id": "golden_cross",
        "rule_name": "SMA50, SMA200'ü yukarı kesti (Golden Cross)",
        "direction": "bullish",
    },
    {
        "rule_id": "death_cross",
        "rule_name": "SMA50, SMA200'ü aşağı kesti (Death Cross)",
        "direction": "bearish",
    },
    {
        "rule_id": "sma20_50_golden_cross",
        "rule_name": "SMA20, SMA50'yi yukarı kesti",
        "direction": "bullish",
    },
    {
        "rule_id": "sma20_50_death_cross",
        "rule_name": "SMA20, SMA50'yi aşağı kesti",
        "direction": "bearish",
    },
    {
        "rule_id": "bollinger_breakout_up",
        "rule_name": "Fiyat Bollinger üst bandını yukarı kırdı",
        "direction": "bullish",
    },
    {
        "rule_id": "bollinger_breakout_down",
        "rule_name": "Fiyat Bollinger alt bandını aşağı kırdı",
        "direction": "bearish",
    },
    {
        "rule_id": "stochastic_bullish_cross",
        "rule_name": "Stokastik %K, %D'yi aşırı satım bölgesinde yukarı kesti",
        "direction": "bullish",
    },
    {
        "rule_id": "stochastic_bearish_cross",
        "rule_name": "Stokastik %K, %D'yi aşırı alım bölgesinde aşağı kesti",
        "direction": "bearish",
    },
]
SIGNAL_RULE_IDS = {rule["rule_id"] for rule in SIGNAL_RULE_CATALOG}


class SignalRecord(BaseModel):
    rule_id: str
    rule_name: str
    direction: str
    triggered_at: int


def _sma(closes: list[float], period: int) -> list[float | None]:
    result: list[float | None] = []
    window_sum = 0.0
    for i, close in enumerate(closes):
        window_sum += close
        if i >= period:
            window_sum -= closes[i - period]
        result.append(window_sum / period if i >= period - 1 else None)
    return result


def _ema(closes: list[float], period: int) -> list[float | None]:
    result: list[float | None] = []
    multiplier = 2 / (period + 1)
    previous: float | None = None
    seed_sum = 0.0

    for i, close in enumerate(closes):
        if i < period - 1:
            seed_sum += close
            result.append(None)
            continue
        if i == period - 1:
            seed_sum += close
            previous = seed_sum / period
            result.append(previous)
            continue
        previous = (close - previous) * multiplier + previous  # type: ignore[operator]
        result.append(previous)

    return result


def _rsi(closes: list[float], period: int = 14) -> list[float | None]:
    if not closes:
        return []

    result: list[float | None] = [None]
    avg_gain = 0.0
    avg_loss = 0.0

    for i in range(1, len(closes)):
        change = closes[i] - closes[i - 1]
        gain = change if change > 0 else 0.0
        loss = -change if change < 0 else 0.0

        if i <= period:
            avg_gain += gain
            avg_loss += loss
            if i == period:
                avg_gain /= period
                avg_loss /= period
                result.append(_rsi_from_averages(avg_gain, avg_loss))
            else:
                result.append(None)
            continue

        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        result.append(_rsi_from_averages(avg_gain, avg_loss))

    return result


def _rsi_from_averages(avg_gain: float, avg_loss: float) -> float:
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - 100 / (1 + rs)


def _macd_histogram(
    closes: list[float], fast_period: int = 12, slow_period: int = 26, signal_period: int = 9
) -> list[float | None]:
    fast_ema = _ema(closes, fast_period)
    slow_ema = _ema(closes, slow_period)

    macd_line: list[float] = [
        (f - s) if f is not None and s is not None else 0.0 for f, s in zip(fast_ema, slow_ema)
    ]

    first_valid = next(
        (i for i, (f, s) in enumerate(zip(fast_ema, slow_ema)) if f is not None and s is not None),
        None,
    )
    if first_valid is None:
        return [None] * len(closes)

    signal_input = macd_line[first_valid:]
    signal_ema = _ema(signal_input, signal_period)

    result: list[float | None] = []
    for i in range(len(closes)):
        if i < first_valid:
            result.append(None)
            continue
        macd_value = (
            fast_ema[i] - slow_ema[i]
            if fast_ema[i] is not None and slow_ema[i] is not None
            else None
        )  # type: ignore[operator]
        signal_value = signal_ema[i - first_valid]
        if macd_value is None or signal_value is None:
            result.append(None)
        else:
            result.append(macd_value - signal_value)
    return result


def _bollinger_bands(
    closes: list[float], period: int = 20, std_dev_multiplier: float = 2.0
) -> list[tuple[float, float, float] | None]:
    """Returns (upper, middle, lower) per bar; None before the warmup period."""
    result: list[tuple[float, float, float] | None] = []
    for i in range(len(closes)):
        if i < period - 1:
            result.append(None)
            continue
        window = closes[i - period + 1 : i + 1]
        mean = sum(window) / period
        variance = sum((v - mean) ** 2 for v in window) / period
        std_dev = variance**0.5
        result.append(
            (mean + std_dev_multiplier * std_dev, mean, mean - std_dev_multiplier * std_dev)
        )
    return result


def _stochastic(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    k_period: int = 14,
    d_period: int = 3,
) -> list[tuple[float, float] | None]:
    """Returns (%K, %D) per bar; None before the warmup period or while %D isn't defined yet."""
    k_values: list[float | None] = []
    for i in range(len(closes)):
        if i < k_period - 1:
            k_values.append(None)
            continue
        window_highs = highs[i - k_period + 1 : i + 1]
        window_lows = lows[i - k_period + 1 : i + 1]
        highest_high = max(window_highs)
        lowest_low = min(window_lows)
        value_range = highest_high - lowest_low
        k_values.append(
            50.0 if value_range == 0 else ((closes[i] - lowest_low) / value_range) * 100
        )

    result: list[tuple[float, float] | None] = []
    for i in range(len(closes)):
        k = k_values[i]
        if k is None:
            result.append(None)
            continue
        if i < k_period - 1 + d_period - 1:
            result.append(None)
            continue
        window = k_values[i - d_period + 1 : i + 1]
        if any(v is None for v in window):
            result.append(None)
            continue
        d = sum(window) / d_period  # type: ignore[arg-type]
        result.append((k, d))
    return result


def _crossings(values: list[float | None], *, above: bool, threshold: float = 0.0) -> list[int]:
    """Indices where `values` crosses the threshold in the given direction between i-1 and i."""
    indices = []
    for i in range(1, len(values)):
        prev, curr = values[i - 1], values[i]
        if prev is None or curr is None:
            continue
        if above and prev <= threshold < curr:
            indices.append(i)
        elif not above and prev >= threshold > curr:
            indices.append(i)
    return indices


def evaluate_signals(candles: list[CandlePoint]) -> list[SignalRecord]:
    if len(candles) < 2:
        return []

    closes = [c.close for c in candles]
    highs = [c.high for c in candles]
    lows = [c.low for c in candles]
    times = [c.time for c in candles]

    rsi = _rsi(closes, 14)
    macd_hist = _macd_histogram(closes)
    sma20 = _sma(closes, 20)
    sma50 = _sma(closes, 50)
    sma200 = _sma(closes, 200)
    ma_diff: list[float | None] = [
        (s50 - s200) if s50 is not None and s200 is not None else None
        for s50, s200 in zip(sma50, sma200)
    ]
    ma_diff_short: list[float | None] = [
        (s20 - s50) if s20 is not None and s50 is not None else None
        for s20, s50 in zip(sma20, sma50)
    ]
    bands = _bollinger_bands(closes, 20, 2.0)
    diff_upper: list[float | None] = [
        (c - b[0]) if b is not None else None for c, b in zip(closes, bands)
    ]
    diff_lower: list[float | None] = [
        (c - b[2]) if b is not None else None for c, b in zip(closes, bands)
    ]
    stoch = _stochastic(highs, lows, closes, 14, 3)

    signals: list[SignalRecord] = []

    for i in range(1, len(rsi)):
        prev, curr = rsi[i - 1], rsi[i]
        if prev is None or curr is None:
            continue
        if prev >= 30 > curr:
            signals.append(
                SignalRecord(
                    rule_id="rsi_oversold",
                    rule_name="RSI 30 altına düştü",
                    direction="bearish",
                    triggered_at=times[i],
                )
            )
        if prev <= 70 < curr:
            signals.append(
                SignalRecord(
                    rule_id="rsi_overbought",
                    rule_name="RSI 70 üstüne çıktı",
                    direction="bullish",
                    triggered_at=times[i],
                )
            )

    for i in _crossings(macd_hist, above=True):
        signals.append(
            SignalRecord(
                rule_id="macd_bullish_cross",
                rule_name="MACD sinyal çizgisini yukarı kesti",
                direction="bullish",
                triggered_at=times[i],
            )
        )
    for i in _crossings(macd_hist, above=False):
        signals.append(
            SignalRecord(
                rule_id="macd_bearish_cross",
                rule_name="MACD sinyal çizgisini aşağı kesti",
                direction="bearish",
                triggered_at=times[i],
            )
        )

    for i in _crossings(ma_diff, above=True):
        signals.append(
            SignalRecord(
                rule_id="golden_cross",
                rule_name="SMA50, SMA200'ü yukarı kesti (Golden Cross)",
                direction="bullish",
                triggered_at=times[i],
            )
        )
    for i in _crossings(ma_diff, above=False):
        signals.append(
            SignalRecord(
                rule_id="death_cross",
                rule_name="SMA50, SMA200'ü aşağı kesti (Death Cross)",
                direction="bearish",
                triggered_at=times[i],
            )
        )

    for i in _crossings(ma_diff_short, above=True):
        signals.append(
            SignalRecord(
                rule_id="sma20_50_golden_cross",
                rule_name="SMA20, SMA50'yi yukarı kesti",
                direction="bullish",
                triggered_at=times[i],
            )
        )
    for i in _crossings(ma_diff_short, above=False):
        signals.append(
            SignalRecord(
                rule_id="sma20_50_death_cross",
                rule_name="SMA20, SMA50'yi aşağı kesti",
                direction="bearish",
                triggered_at=times[i],
            )
        )

    for i in _crossings(diff_upper, above=True):
        signals.append(
            SignalRecord(
                rule_id="bollinger_breakout_up",
                rule_name="Fiyat Bollinger üst bandını yukarı kırdı",
                direction="bullish",
                triggered_at=times[i],
            )
        )
    for i in _crossings(diff_lower, above=False):
        signals.append(
            SignalRecord(
                rule_id="bollinger_breakout_down",
                rule_name="Fiyat Bollinger alt bandını aşağı kırdı",
                direction="bearish",
                triggered_at=times[i],
            )
        )

    # Stochastic %K/%D crossovers are read as mean-reversion signals (standard TA convention):
    # a cross while both lines sit in the oversold/overbought extreme is treated as a potential
    # reversal, not a momentum-continuation event like the MACD/SMA/Bollinger rules above.
    for i in range(1, len(stoch)):
        prev, curr = stoch[i - 1], stoch[i]
        if prev is None or curr is None:
            continue
        prev_k, prev_d = prev
        curr_k, curr_d = curr
        if prev_k <= prev_d and curr_k > curr_d and curr_k < 20:
            signals.append(
                SignalRecord(
                    rule_id="stochastic_bullish_cross",
                    rule_name="Stokastik %K, %D'yi aşırı satım bölgesinde yukarı kesti",
                    direction="bullish",
                    triggered_at=times[i],
                )
            )
        if prev_k >= prev_d and curr_k < curr_d and curr_k > 80:
            signals.append(
                SignalRecord(
                    rule_id="stochastic_bearish_cross",
                    rule_name="Stokastik %K, %D'yi aşırı alım bölgesinde aşağı kesti",
                    direction="bearish",
                    triggered_at=times[i],
                )
            )

    signals.sort(key=lambda s: s.triggered_at, reverse=True)
    return signals[:MAX_SIGNALS]
