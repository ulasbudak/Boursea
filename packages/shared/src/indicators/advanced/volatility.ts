import { sma } from "../sma";
import type { IndicatorPoint, OhlcvPoint } from "../types";

function trueRange(current: OhlcvPoint, previous: OhlcvPoint | undefined): number {
  if (!previous) return current.high - current.low;
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close)
  );
}

/** Wilder's Average True Range: smoothed average of the true range over `period` bars. */
export function atr(candles: OhlcvPoint[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  let sum = 0;
  let prevAtr: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    const tr = trueRange(candles[i], candles[i - 1]);

    if (i < period) {
      sum += tr;
      if (i === period - 1) {
        prevAtr = sum / period;
        result.push({ time: candles[i].time, value: prevAtr });
      } else {
        result.push({ time: candles[i].time, value: null });
      }
      continue;
    }

    prevAtr = ((prevAtr as number) * (period - 1) + tr) / period;
    result.push({ time: candles[i].time, value: prevAtr });
  }

  return result;
}

/** Standard deviation of closing prices over a rolling window. */
export function standardDeviation(candles: OhlcvPoint[], period = 20): IndicatorPoint[] {
  return candles.map((c, i) => {
    if (i < period - 1) return { time: c.time, value: null };
    const window = candles.slice(i - period + 1, i + 1).map((p) => p.close);
    const mean = window.reduce((s, v) => s + v, 0) / period;
    const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    return { time: c.time, value: Math.sqrt(variance) };
  });
}

export interface ChannelPoint {
  time: number;
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

/** Keltner Channels: EMA middle line +/- `atrMultiplier` x ATR. */
export function keltnerChannels(
  candles: OhlcvPoint[],
  period = 20,
  atrMultiplier = 2,
  atrPeriod = 10
): ChannelPoint[] {
  const emaMiddle = smaBasedMiddle(candles, period);
  const atrValues = atr(candles, atrPeriod);

  return candles.map((c, i) => {
    const middle = emaMiddle[i].value;
    const atrValue = atrValues[i].value;
    if (middle == null || atrValue == null) return { time: c.time, upper: null, middle: null, lower: null };
    return {
      time: c.time,
      upper: middle + atrMultiplier * atrValue,
      middle,
      lower: middle - atrMultiplier * atrValue,
    };
  });
}

function smaBasedMiddle(candles: OhlcvPoint[], period: number): IndicatorPoint[] {
  return sma(candles, period);
}

/** Donchian Channels: highest high / lowest low over `period` bars, with their midline. */
export function donchianChannels(candles: OhlcvPoint[], period = 20): ChannelPoint[] {
  return candles.map((c, i) => {
    if (i < period - 1) return { time: c.time, upper: null, middle: null, lower: null };
    const window = candles.slice(i - period + 1, i + 1);
    const upper = Math.max(...window.map((p) => p.high));
    const lower = Math.min(...window.map((p) => p.low));
    return { time: c.time, upper, middle: (upper + lower) / 2, lower };
  });
}

export { trueRange };
