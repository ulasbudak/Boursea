import { ema } from "./ema";
import type { OhlcvPoint } from "./types";

export interface MacdPoint {
  time: number;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

/** MACD: fast EMA - slow EMA, with an EMA of that difference as the signal line. */
export function macd(
  candles: OhlcvPoint[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdPoint[] {
  const fastEma = ema(candles, fastPeriod);
  const slowEma = ema(candles, slowPeriod);

  const macdLine: OhlcvPoint[] = candles.map((c, i) => {
    const fast = fastEma[i].value;
    const slow = slowEma[i].value;
    const value = fast != null && slow != null ? fast - slow : 0;
    return { time: c.time, open: value, high: value, low: value, close: value, volume: null };
  });

  const firstValidIndex = candles.findIndex((_, i) => fastEma[i].value != null && slowEma[i].value != null);
  const signalInput = firstValidIndex === -1 ? [] : macdLine.slice(firstValidIndex);
  const signalEma = ema(signalInput, signalPeriod);
  const signalByTime = new Map(signalEma.map((p) => [p.time, p.value]));

  return candles.map((c, i) => {
    const fast = fastEma[i].value;
    const slow = slowEma[i].value;
    const macdValue = fast != null && slow != null ? fast - slow : null;
    const signalValue = signalByTime.get(c.time) ?? null;
    const histogram = macdValue != null && signalValue != null ? macdValue - signalValue : null;
    return { time: c.time, macd: macdValue, signal: signalValue, histogram };
  });
}
