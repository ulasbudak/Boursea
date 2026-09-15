import { ema } from "../ema";
import type { IndicatorPoint, OhlcvPoint } from "../types";

/** Weighted moving average: linearly weights recent closes more heavily. */
export function wma(candles: OhlcvPoint[], period: number): IndicatorPoint[] {
  const weightSum = (period * (period + 1)) / 2;
  return candles.map((c, i) => {
    if (i < period - 1) return { time: c.time, value: null };
    let weighted = 0;
    for (let j = 0; j < period; j++) {
      weighted += candles[i - period + 1 + j].close * (j + 1);
    }
    return { time: c.time, value: weighted / weightSum };
  });
}

/** Hull moving average: WMA(2*WMA(n/2) - WMA(n)) over sqrt(n), reduces lag versus SMA/EMA. */
export function hma(candles: OhlcvPoint[], period: number): IndicatorPoint[] {
  const halfPeriod = Math.max(1, Math.round(period / 2));
  const sqrtPeriod = Math.max(1, Math.round(Math.sqrt(period)));

  const wmaHalf = wma(candles, halfPeriod);
  const wmaFull = wma(candles, period);

  const diffSeries: OhlcvPoint[] = candles.map((c, i) => {
    const half = wmaHalf[i].value;
    const full = wmaFull[i].value;
    const value = half != null && full != null ? 2 * half - full : 0;
    return { time: c.time, open: value, high: value, low: value, close: value, volume: null };
  });

  const hullValues = wma(diffSeries, sqrtPeriod);
  const warmup = period - 1 + (sqrtPeriod - 1);
  return candles.map((c, i) => ({ time: c.time, value: i < warmup ? null : hullValues[i].value }));
}

/** Double exponential moving average: 2*EMA - EMA(EMA), reduces lag versus a single EMA. */
export function dema(candles: OhlcvPoint[], period: number): IndicatorPoint[] {
  const ema1 = ema(candles, period);
  const ema1AsCandles: OhlcvPoint[] = candles.map((c, i) => {
    const value = ema1[i].value ?? 0;
    return { time: c.time, open: value, high: value, low: value, close: value, volume: null };
  });
  const ema2 = ema(ema1AsCandles, period);

  return candles.map((c, i) => {
    const first = ema1[i].value;
    const second = ema2[i].value;
    const value = first != null && second != null && i >= 2 * (period - 1) ? 2 * first - second : null;
    return { time: c.time, value };
  });
}

/** Triple exponential moving average: 3*EMA1 - 3*EMA2 + EMA3, reduces lag further than DEMA. */
export function tema(candles: OhlcvPoint[], period: number): IndicatorPoint[] {
  const ema1 = ema(candles, period);
  const ema1AsCandles: OhlcvPoint[] = candles.map((c, i) => {
    const value = ema1[i].value ?? 0;
    return { time: c.time, open: value, high: value, low: value, close: value, volume: null };
  });
  const ema2 = ema(ema1AsCandles, period);
  const ema2AsCandles: OhlcvPoint[] = candles.map((c, i) => {
    const value = ema2[i].value ?? 0;
    return { time: c.time, open: value, high: value, low: value, close: value, volume: null };
  });
  const ema3 = ema(ema2AsCandles, period);

  const warmup = 3 * (period - 1);
  return candles.map((c, i) => {
    const e1 = ema1[i].value;
    const e2 = ema2[i].value;
    const e3 = ema3[i].value;
    const value = e1 != null && e2 != null && e3 != null && i >= warmup ? 3 * e1 - 3 * e2 + e3 : null;
    return { time: c.time, value };
  });
}

/** Kaufman's Adaptive Moving Average: adapts its smoothing speed to market efficiency/noise. */
export function kama(candles: OhlcvPoint[], period = 10, fastPeriod = 2, slowPeriod = 30): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const fastSc = 2 / (fastPeriod + 1);
  const slowSc = 2 / (slowPeriod + 1);
  let prevKama: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      result.push({ time: candles[i].time, value: null });
      continue;
    }

    const change = Math.abs(candles[i].close - candles[i - period].close);
    let volatility = 0;
    for (let j = i - period + 1; j <= i; j++) {
      volatility += Math.abs(candles[j].close - candles[j - 1].close);
    }
    const efficiencyRatio = volatility === 0 ? 0 : change / volatility;
    const smoothingConstant = (efficiencyRatio * (fastSc - slowSc) + slowSc) ** 2;

    prevKama = prevKama == null ? candles[i].close : prevKama + smoothingConstant * (candles[i].close - prevKama);
    result.push({ time: candles[i].time, value: prevKama });
  }

  return result;
}
