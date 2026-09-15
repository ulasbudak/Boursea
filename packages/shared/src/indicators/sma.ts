import type { IndicatorPoint, OhlcvPoint } from "./types";

/** Simple moving average of closing prices. */
export function sma(candles: OhlcvPoint[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  let windowSum = 0;

  for (let i = 0; i < candles.length; i++) {
    windowSum += candles[i].close;
    if (i >= period) {
      windowSum -= candles[i - period].close;
    }
    const value = i >= period - 1 ? windowSum / period : null;
    result.push({ time: candles[i].time, value });
  }

  return result;
}
