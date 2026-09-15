import type { IndicatorPoint, OhlcvPoint } from "./types";

/** Exponential moving average of closing prices, seeded with the SMA of the first `period` points. */
export function ema(candles: OhlcvPoint[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);
  let previous: number | null = null;
  let seedSum = 0;

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;

    if (i < period - 1) {
      seedSum += close;
      result.push({ time: candles[i].time, value: null });
      continue;
    }

    if (i === period - 1) {
      seedSum += close;
      previous = seedSum / period;
      result.push({ time: candles[i].time, value: previous });
      continue;
    }

    previous = (close - (previous as number)) * multiplier + (previous as number);
    result.push({ time: candles[i].time, value: previous });
  }

  return result;
}
