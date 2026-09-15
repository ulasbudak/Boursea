import { ema } from "../ema";
import { sma } from "../sma";
import type { IndicatorPoint, OhlcvPoint } from "../types";

/** Williams %R: position of the close within the `period`-bar high/low range, -100 to 0. */
export function williamsR(candles: OhlcvPoint[], period = 14): IndicatorPoint[] {
  return candles.map((c, i) => {
    if (i < period - 1) return { time: c.time, value: null };
    const window = candles.slice(i - period + 1, i + 1);
    const highestHigh = Math.max(...window.map((p) => p.high));
    const lowestLow = Math.min(...window.map((p) => p.low));
    const range = highestHigh - lowestLow;
    if (range === 0) return { time: c.time, value: 0 };
    return { time: c.time, value: (-100 * (highestHigh - c.close)) / range };
  });
}

/** Commodity Channel Index: deviation of typical price from its moving average, scaled by mean deviation. */
export function cci(candles: OhlcvPoint[], period = 20): IndicatorPoint[] {
  const typicalPrices = candles.map((c) => (c.high + c.low + c.close) / 3);

  return candles.map((c, i) => {
    if (i < period - 1) return { time: c.time, value: null };
    const window = typicalPrices.slice(i - period + 1, i + 1);
    const meanTp = window.reduce((s, v) => s + v, 0) / period;
    const meanDeviation = window.reduce((s, v) => s + Math.abs(v - meanTp), 0) / period;
    if (meanDeviation === 0) return { time: c.time, value: 0 };
    return { time: c.time, value: (typicalPrices[i] - meanTp) / (0.015 * meanDeviation) };
  });
}

/** Rate of Change: percentage price change versus `period` bars ago. */
export function roc(candles: OhlcvPoint[], period = 12): IndicatorPoint[] {
  return candles.map((c, i) => {
    if (i < period) return { time: c.time, value: null };
    const past = candles[i - period].close;
    if (past === 0) return { time: c.time, value: null };
    return { time: c.time, value: ((c.close - past) / past) * 100 };
  });
}

/** Momentum: absolute price change versus `period` bars ago. */
export function momentum(candles: OhlcvPoint[], period = 10): IndicatorPoint[] {
  return candles.map((c, i) => {
    if (i < period) return { time: c.time, value: null };
    return { time: c.time, value: c.close - candles[i - period].close };
  });
}

/** Ultimate Oscillator: weighted buying-pressure average across three lookback periods (7/14/28). */
export function ultimateOscillator(
  candles: OhlcvPoint[],
  shortPeriod = 7,
  mediumPeriod = 14,
  longPeriod = 28
): IndicatorPoint[] {
  if (candles.length === 0) return [];
  const bp: number[] = [0];
  const tr: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].close;
    bp.push(candles[i].close - Math.min(candles[i].low, prevClose));
    tr.push(Math.max(candles[i].high, prevClose) - Math.min(candles[i].low, prevClose));
  }

  function averageRatio(index: number, period: number): number | null {
    if (index < period - 1) return null;
    let sumBp = 0;
    let sumTr = 0;
    for (let j = index - period + 1; j <= index; j++) {
      sumBp += bp[j];
      sumTr += tr[j];
    }
    return sumTr === 0 ? null : sumBp / sumTr;
  }

  return candles.map((c, i) => {
    const avgShort = averageRatio(i, shortPeriod);
    const avgMedium = averageRatio(i, mediumPeriod);
    const avgLong = averageRatio(i, longPeriod);
    if (avgShort == null || avgMedium == null || avgLong == null) return { time: c.time, value: null };
    return { time: c.time, value: (100 * (4 * avgShort + 2 * avgMedium + avgLong)) / 7 };
  });
}

/** Awesome Oscillator: SMA(5) - SMA(34) of the median price (Bill Williams). */
export function awesomeOscillator(candles: OhlcvPoint[], fastPeriod = 5, slowPeriod = 34): IndicatorPoint[] {
  const medianCandles: OhlcvPoint[] = candles.map((c) => {
    const mid = (c.high + c.low) / 2;
    return { time: c.time, open: mid, high: mid, low: mid, close: mid, volume: null };
  });
  const fastSma = sma(medianCandles, fastPeriod);
  const slowSma = sma(medianCandles, slowPeriod);

  return candles.map((c, i) => {
    const fast = fastSma[i].value;
    const slow = slowSma[i].value;
    return { time: c.time, value: fast != null && slow != null ? fast - slow : null };
  });
}

/** Chande Momentum Oscillator: net momentum as a percentage of total absolute movement, -100 to 100. */
export function cmo(candles: OhlcvPoint[], period = 14): IndicatorPoint[] {
  return candles.map((c, i) => {
    if (i < period) return { time: c.time, value: null };
    let sumUp = 0;
    let sumDown = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const change = candles[j].close - candles[j - 1].close;
      if (change > 0) sumUp += change;
      else sumDown += -change;
    }
    const total = sumUp + sumDown;
    if (total === 0) return { time: c.time, value: 0 };
    return { time: c.time, value: (100 * (sumUp - sumDown)) / total };
  });
}

/** True Strength Index: double-smoothed momentum normalized by double-smoothed absolute momentum. */
export function tsi(candles: OhlcvPoint[], longPeriod = 25, shortPeriod = 13): IndicatorPoint[] {
  if (candles.length === 0) return [];
  const momentumValues: OhlcvPoint[] = [{ ...candles[0], open: 0, high: 0, low: 0, close: 0 }];
  const absMomentumValues: OhlcvPoint[] = [{ ...candles[0], open: 0, high: 0, low: 0, close: 0 }];

  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    momentumValues.push({ time: candles[i].time, open: change, high: change, low: change, close: change, volume: null });
    absMomentumValues.push({
      time: candles[i].time,
      open: Math.abs(change),
      high: Math.abs(change),
      low: Math.abs(change),
      close: Math.abs(change),
      volume: null,
    });
  }

  const smoothMomentum = ema(momentumValues, longPeriod);
  const smoothMomentumAsCandles: OhlcvPoint[] = candles.map((c, i) => {
    const v = smoothMomentum[i].value ?? 0;
    return { time: c.time, open: v, high: v, low: v, close: v, volume: null };
  });
  const doubleSmoothMomentum = ema(smoothMomentumAsCandles, shortPeriod);

  const smoothAbs = ema(absMomentumValues, longPeriod);
  const smoothAbsAsCandles: OhlcvPoint[] = candles.map((c, i) => {
    const v = smoothAbs[i].value ?? 0;
    return { time: c.time, open: v, high: v, low: v, close: v, volume: null };
  });
  const doubleSmoothAbs = ema(smoothAbsAsCandles, shortPeriod);

  return candles.map((c, i) => {
    const numerator = doubleSmoothMomentum[i].value;
    const denominator = doubleSmoothAbs[i].value;
    if (numerator == null || denominator == null || denominator === 0) return { time: c.time, value: null };
    return { time: c.time, value: (100 * numerator) / denominator };
  });
}
