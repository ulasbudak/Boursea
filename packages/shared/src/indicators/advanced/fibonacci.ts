import type { OhlcvPoint } from "../types";

export interface FibonacciLevel {
  ratio: number;
  price: number;
}

export interface FibonacciRetracement {
  high: number;
  low: number;
  levels: FibonacciLevel[];
}

const RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/**
 * Automatic Fibonacci Retracement: horizontal levels between the highest high and lowest low of
 * the loaded candle range. A true two-point interactive version belongs to the manual drawing
 * tools (Story 3.4); this is a read-only "auto" variant so Fibonacci can appear in the indicator
 * library (FR-022) without that interaction model.
 */
export function fibonacciRetracement(candles: OhlcvPoint[]): FibonacciRetracement | null {
  if (candles.length === 0) return null;

  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  const range = high - low;

  const levels = RATIOS.map((ratio) => ({ ratio, price: high - range * ratio }));

  return { high, low, levels };
}
