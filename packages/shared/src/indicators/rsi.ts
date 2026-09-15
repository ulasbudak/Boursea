import type { IndicatorPoint, OhlcvPoint } from "./types";

/** Wilder's RSI (Relative Strength Index) over the given period, default 14. */
export function rsi(candles: OhlcvPoint[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length === 0) return result;

  result.push({ time: candles[0].time, value: null });

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        result.push({ time: candles[i].time, value: rsiFromAverages(avgGain, avgLoss) });
      } else {
        result.push({ time: candles[i].time, value: null });
      }
      continue;
    }

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push({ time: candles[i].time, value: rsiFromAverages(avgGain, avgLoss) });
  }

  return result;
}

function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
