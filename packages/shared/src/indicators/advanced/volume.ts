import { ema } from "../ema";
import type { IndicatorPoint, OhlcvPoint } from "../types";

function vol(c: OhlcvPoint): number {
  return c.volume ?? 0;
}

function moneyFlowMultiplier(c: OhlcvPoint): number {
  const range = c.high - c.low;
  return range === 0 ? 0 : (c.close - c.low - (c.high - c.close)) / range;
}

/** On Balance Volume: cumulative volume, added on up closes and subtracted on down closes. */
export function obv(candles: OhlcvPoint[]): IndicatorPoint[] {
  if (candles.length === 0) return [];
  const result: IndicatorPoint[] = [{ time: candles[0].time, value: 0 }];
  let running = 0;

  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) running += vol(candles[i]);
    else if (change < 0) running -= vol(candles[i]);
    result.push({ time: candles[i].time, value: running });
  }

  return result;
}

/** Chaikin Money Flow: volume-weighted average of the money flow multiplier over `period` bars. */
export function chaikinMoneyFlow(candles: OhlcvPoint[], period = 20): IndicatorPoint[] {
  return candles.map((c, i) => {
    if (i < period - 1) return { time: c.time, value: null };
    let sumMfv = 0;
    let sumVolume = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumMfv += moneyFlowMultiplier(candles[j]) * vol(candles[j]);
      sumVolume += vol(candles[j]);
    }
    return { time: c.time, value: sumVolume === 0 ? null : sumMfv / sumVolume };
  });
}

/** Money Flow Index: volume-weighted RSI variant using typical price, 0-100. */
export function moneyFlowIndex(candles: OhlcvPoint[], period = 14): IndicatorPoint[] {
  const typicalPrices = candles.map((c) => (c.high + c.low + c.close) / 3);
  const rawFlow = candles.map((c, i) => typicalPrices[i] * vol(c));

  return candles.map((c, i) => {
    if (i < period) return { time: c.time, value: null };
    let positiveFlow = 0;
    let negativeFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (typicalPrices[j] > typicalPrices[j - 1]) positiveFlow += rawFlow[j];
      else if (typicalPrices[j] < typicalPrices[j - 1]) negativeFlow += rawFlow[j];
    }
    if (negativeFlow === 0) return { time: c.time, value: 100 };
    const moneyRatio = positiveFlow / negativeFlow;
    return { time: c.time, value: 100 - 100 / (1 + moneyRatio) };
  });
}

/** Accumulation/Distribution Line: cumulative money flow volume. */
export function accumulationDistribution(candles: OhlcvPoint[]): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  let running = 0;
  for (const c of candles) {
    running += moneyFlowMultiplier(c) * vol(c);
    result.push({ time: c.time, value: running });
  }
  return result;
}

/** Cumulative Volume Weighted Average Price over the full loaded series (no session reset). */
export function vwap(candles: OhlcvPoint[]): IndicatorPoint[] {
  let cumulativeTpv = 0;
  let cumulativeVolume = 0;
  return candles.map((c) => {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTpv += typicalPrice * vol(c);
    cumulativeVolume += vol(c);
    return { time: c.time, value: cumulativeVolume === 0 ? null : cumulativeTpv / cumulativeVolume };
  });
}

/** Force Index: price change x volume, smoothed with a 13-period EMA by default. */
export function forceIndex(candles: OhlcvPoint[], smoothingPeriod = 13): IndicatorPoint[] {
  if (candles.length === 0) return [];
  const raw: OhlcvPoint[] = [{ ...candles[0], open: 0, high: 0, low: 0, close: 0 }];
  for (let i = 1; i < candles.length; i++) {
    const value = (candles[i].close - candles[i - 1].close) * vol(candles[i]);
    raw.push({ time: candles[i].time, open: value, high: value, low: value, close: value, volume: null });
  }
  return ema(raw, smoothingPeriod);
}
