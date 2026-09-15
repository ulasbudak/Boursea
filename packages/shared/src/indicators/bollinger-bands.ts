import type { OhlcvPoint } from "./types";

export interface BollingerBandsPoint {
  time: number;
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

/** Bollinger Bands: SMA middle band, +/- `stdDevMultiplier` standard deviations for the outer bands. */
export function bollingerBands(
  candles: OhlcvPoint[],
  period = 20,
  stdDevMultiplier = 2
): BollingerBandsPoint[] {
  const result: BollingerBandsPoint[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push({ time: candles[i].time, upper: null, middle: null, lower: null });
      continue;
    }

    const window = candles.slice(i - period + 1, i + 1).map((c) => c.close);
    const mean = window.reduce((sum, v) => sum + v, 0) / period;
    const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);

    result.push({
      time: candles[i].time,
      upper: mean + stdDevMultiplier * stdDev,
      middle: mean,
      lower: mean - stdDevMultiplier * stdDev,
    });
  }

  return result;
}
