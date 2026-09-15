import type { OhlcvPoint } from "./types";

export interface StochasticPoint {
  time: number;
  k: number | null;
  d: number | null;
}

/** Stochastic oscillator: %K over `kPeriod`, %D as an `dPeriod`-period SMA of %K. */
export function stochastic(candles: OhlcvPoint[], kPeriod = 14, dPeriod = 3): StochasticPoint[] {
  const kValues: (number | null)[] = candles.map((_, i) => {
    if (i < kPeriod - 1) return null;
    const window = candles.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...window.map((c) => c.high));
    const lowestLow = Math.min(...window.map((c) => c.low));
    const range = highestHigh - lowestLow;
    if (range === 0) return 50;
    return ((candles[i].close - lowestLow) / range) * 100;
  });

  return candles.map((c, i) => {
    const k = kValues[i];
    let d: number | null = null;
    if (i >= kPeriod - 1 + dPeriod - 1) {
      const window = kValues.slice(i - dPeriod + 1, i + 1);
      if (window.every((v): v is number => v != null)) {
        d = window.reduce((sum, v) => sum + v, 0) / dPeriod;
      }
    }
    return { time: c.time, k, d };
  });
}
