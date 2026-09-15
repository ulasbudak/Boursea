import { atr, trueRange } from "./volatility";
import { ema } from "../ema";
import type { IndicatorPoint, OhlcvPoint } from "../types";

export interface AdxPoint {
  time: number;
  adx: number | null;
  plusDi: number | null;
  minusDi: number | null;
}

function wilderSmooth(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;
  let prev: number | null = null;

  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      sum += values[i];
      if (i === period - 1) {
        prev = sum;
        result.push(prev);
      } else {
        result.push(null);
      }
      continue;
    }
    prev = (prev as number) - (prev as number) / period + values[i];
    result.push(prev);
  }
  return result;
}

/** Wilder's ADX with +DI/-DI, measuring trend strength (ADX) and direction (+DI vs -DI). */
export function adx(candles: OhlcvPoint[], period = 14): AdxPoint[] {
  if (candles.length === 0) return [];
  const plusDm: number[] = [0];
  const minusDm: number[] = [0];
  const tr: number[] = [trueRange(candles[0], undefined)];

  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDm.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(trueRange(candles[i], candles[i - 1]));
  }

  const smoothedPlusDm = wilderSmooth(plusDm, period);
  const smoothedMinusDm = wilderSmooth(minusDm, period);
  const smoothedTr = wilderSmooth(tr, period);

  const plusDi: (number | null)[] = [];
  const minusDi: (number | null)[] = [];
  const dx: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const trValue = smoothedTr[i];
    const pDm = smoothedPlusDm[i];
    const mDm = smoothedMinusDm[i];
    if (trValue == null || pDm == null || mDm == null || trValue === 0) {
      plusDi.push(null);
      minusDi.push(null);
      dx.push(null);
      continue;
    }
    const pDi = (100 * pDm) / trValue;
    const mDi = (100 * mDm) / trValue;
    plusDi.push(pDi);
    minusDi.push(mDi);
    const diSum = pDi + mDi;
    dx.push(diSum === 0 ? 0 : (100 * Math.abs(pDi - mDi)) / diSum);
  }

  const dxValues = dx.filter((v): v is number => v != null);
  const firstDxIndex = dx.findIndex((v) => v != null);
  const smoothedDx = wilderSmooth(dxValues, period).map((v) => (v == null ? null : v / period));

  return candles.map((c, i) => {
    const dxIndex = firstDxIndex === -1 ? -1 : i - firstDxIndex;
    const adxValue = dxIndex >= 0 && dxIndex < smoothedDx.length ? smoothedDx[dxIndex] : null;
    return { time: c.time, adx: adxValue, plusDi: plusDi[i], minusDi: minusDi[i] };
  });
}

/** Parabolic SAR: trailing stop/reversal indicator with an accelerating step factor. */
export function parabolicSar(
  candles: OhlcvPoint[],
  step = 0.02,
  maxStep = 0.2
): IndicatorPoint[] {
  if (candles.length < 2) return candles.map((c) => ({ time: c.time, value: null }));

  const result: IndicatorPoint[] = [{ time: candles[0].time, value: null }];
  let isUpTrend = candles[1].close >= candles[0].close;
  let extremePoint = isUpTrend ? candles[0].high : candles[0].low;
  let af = step;
  let sar = isUpTrend ? candles[0].low : candles[0].high;

  for (let i = 1; i < candles.length; i++) {
    let nextSar = sar + af * (extremePoint - sar);

    if (isUpTrend) {
      nextSar = Math.min(nextSar, candles[i - 1].low, i >= 2 ? candles[i - 2].low : candles[i - 1].low);
      if (candles[i].low < nextSar) {
        isUpTrend = false;
        nextSar = extremePoint;
        extremePoint = candles[i].low;
        af = step;
      } else if (candles[i].high > extremePoint) {
        extremePoint = candles[i].high;
        af = Math.min(af + step, maxStep);
      }
    } else {
      nextSar = Math.max(nextSar, candles[i - 1].high, i >= 2 ? candles[i - 2].high : candles[i - 1].high);
      if (candles[i].high > nextSar) {
        isUpTrend = true;
        nextSar = extremePoint;
        extremePoint = candles[i].high;
        af = step;
      } else if (candles[i].low < extremePoint) {
        extremePoint = candles[i].low;
        af = Math.min(af + step, maxStep);
      }
    }

    sar = nextSar;
    result.push({ time: candles[i].time, value: sar });
  }

  return result;
}

export interface IchimokuPoint {
  time: number;
  tenkanSen: number | null;
  kijunSen: number | null;
  senkouSpanA: number | null;
  senkouSpanB: number | null;
  chikouSpan: number | null;
}

function highLowMid(candles: OhlcvPoint[], index: number, period: number): number | null {
  if (index < period - 1) return null;
  const window = candles.slice(index - period + 1, index + 1);
  const high = Math.max(...window.map((c) => c.high));
  const low = Math.min(...window.map((c) => c.low));
  return (high + low) / 2;
}

/**
 * Ichimoku Kinko Hyo (standard 9/26/52 periods). Senkou spans are displaced 26 bars into the
 * future (synthetic timestamps extrapolated from the average bar interval) and Chikou Span is
 * displaced 26 bars into the past, matching the indicator's standard visual convention.
 */
export function ichimoku(
  candles: OhlcvPoint[],
  conversionPeriod = 9,
  basePeriod = 26,
  laggingSpan2Period = 52,
  displacement = 26
): IchimokuPoint[] {
  const points: IchimokuPoint[] = candles.map((c, i) => ({
    time: c.time,
    tenkanSen: highLowMid(candles, i, conversionPeriod),
    kijunSen: highLowMid(candles, i, basePeriod),
    senkouSpanA: null,
    senkouSpanB: null,
    chikouSpan: null,
  }));

  const interval = candles.length >= 2 ? candles[1].time - candles[0].time : 86400;

  for (let i = 0; i < candles.length; i++) {
    const tenkan = points[i].tenkanSen;
    const kijun = points[i].kijunSen;
    const spanA = tenkan != null && kijun != null ? (tenkan + kijun) / 2 : null;
    const spanB = highLowMid(candles, i, laggingSpan2Period);

    const targetIndex = i + displacement;
    if (targetIndex < points.length) {
      points[targetIndex].senkouSpanA = spanA;
      points[targetIndex].senkouSpanB = spanB;
    } else if (spanA != null || spanB != null) {
      const time = candles[i].time + displacement * interval;
      points.push({ time, tenkanSen: null, kijunSen: null, senkouSpanA: spanA, senkouSpanB: spanB, chikouSpan: null });
    }

    const laggingIndex = i - displacement;
    if (laggingIndex >= 0) {
      points[laggingIndex].chikouSpan = candles[i].close;
    }
  }

  return points;
}

export interface AroonPoint {
  time: number;
  up: number | null;
  down: number | null;
}

/** Aroon Up/Down: time since the most recent `period`-bar high/low, as a percentage. */
export function aroon(candles: OhlcvPoint[], period = 25): AroonPoint[] {
  return candles.map((c, i) => {
    if (i < period) return { time: c.time, up: null, down: null };
    const window = candles.slice(i - period, i + 1);
    let highestIndex = 0;
    let lowestIndex = 0;
    for (let j = 1; j < window.length; j++) {
      if (window[j].high >= window[highestIndex].high) highestIndex = j;
      if (window[j].low <= window[lowestIndex].low) lowestIndex = j;
    }
    const up = (100 * (period - (period - highestIndex))) / period;
    const down = (100 * (period - (period - lowestIndex))) / period;
    return { time: c.time, up, down };
  });
}

/** Aroon Oscillator: Aroon Up - Aroon Down, ranging from -100 to +100. */
export function aroonOscillator(candles: OhlcvPoint[], period = 25): IndicatorPoint[] {
  return aroon(candles, period).map((p) => ({
    time: p.time,
    value: p.up != null && p.down != null ? p.up - p.down : null,
  }));
}

export interface VortexPoint {
  time: number;
  plusVi: number | null;
  minusVi: number | null;
}

/** Vortex Indicator: +VI/-VI compare directional price movement against the true range. */
export function vortex(candles: OhlcvPoint[], period = 14): VortexPoint[] {
  if (candles.length === 0) return [];
  const plusVm: number[] = [0];
  const minusVm: number[] = [0];
  const tr: number[] = [trueRange(candles[0], undefined)];

  for (let i = 1; i < candles.length; i++) {
    plusVm.push(Math.abs(candles[i].high - candles[i - 1].low));
    minusVm.push(Math.abs(candles[i].low - candles[i - 1].high));
    tr.push(trueRange(candles[i], candles[i - 1]));
  }

  return candles.map((c, i) => {
    if (i < period) return { time: c.time, plusVi: null, minusVi: null };
    let sumPlusVm = 0;
    let sumMinusVm = 0;
    let sumTr = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumPlusVm += plusVm[j];
      sumMinusVm += minusVm[j];
      sumTr += tr[j];
    }
    if (sumTr === 0) return { time: c.time, plusVi: null, minusVi: null };
    return { time: c.time, plusVi: sumPlusVm / sumTr, minusVi: sumMinusVm / sumTr };
  });
}

/** TRIX: rate of change of a triple-smoothed EMA, filters out short-term noise. */
export function trix(candles: OhlcvPoint[], period = 15): IndicatorPoint[] {
  const asCandles = (values: (number | null)[]): OhlcvPoint[] =>
    candles.map((c, i) => {
      const v = values[i] ?? 0;
      return { time: c.time, open: v, high: v, low: v, close: v, volume: null };
    });

  const ema1 = ema(candles, period);
  const ema2 = ema(asCandles(ema1.map((p) => p.value)), period);
  const ema3 = ema(asCandles(ema2.map((p) => p.value)), period);

  return candles.map((c, i) => {
    if (i === 0) return { time: c.time, value: null };
    const current = ema3[i].value;
    const previous = ema3[i - 1].value;
    if (current == null || previous == null || previous === 0) return { time: c.time, value: null };
    return { time: c.time, value: ((current - previous) / previous) * 100 };
  });
}

/** SuperTrend: ATR-based trailing trend line that flips above/below price on trend reversal. */
export function superTrend(candles: OhlcvPoint[], period = 10, multiplier = 3): IndicatorPoint[] {
  const atrValues = atr(candles, period);
  const result: IndicatorPoint[] = [];

  let finalUpper: number | null = null;
  let finalLower: number | null = null;
  let trendUp = true;

  for (let i = 0; i < candles.length; i++) {
    const atrValue = atrValues[i].value;
    if (atrValue == null) {
      result.push({ time: candles[i].time, value: null });
      continue;
    }

    const mid = (candles[i].high + candles[i].low) / 2;
    const basicUpper = mid + multiplier * atrValue;
    const basicLower = mid - multiplier * atrValue;

    if (finalUpper == null || finalLower == null) {
      finalUpper = basicUpper;
      finalLower = basicLower;
    } else {
      finalUpper = basicUpper < finalUpper || candles[i - 1].close > finalUpper ? basicUpper : finalUpper;
      finalLower = basicLower > finalLower || candles[i - 1].close < finalLower ? basicLower : finalLower;
    }

    if (candles[i].close > finalUpper) {
      trendUp = true;
    } else if (candles[i].close < finalLower) {
      trendUp = false;
    }

    result.push({ time: candles[i].time, value: trendUp ? finalLower : finalUpper });
  }

  return result;
}
