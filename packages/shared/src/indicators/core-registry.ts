import { sma } from "./sma";
import { ema } from "./ema";
import { rsi } from "./rsi";
import { macd } from "./macd";
import { bollingerBands } from "./bollinger-bands";
import { stochastic } from "./stochastic";
import { INDICATOR_COLORS as COLORS, toPoints, type IndicatorDefinition } from "./registry-types";

export const CORE_INDICATORS: IndicatorDefinition[] = [
  {
    id: "sma",
    name: "SMA",
    category: "trend",
    tier: "core",
    defaultParams: { period: 20 },
    compute: (c, p) => ({
      kind: "series",
      overlay: true,
      lines: [{ key: "sma", color: COLORS.primary, points: toPoints(sma(c, p.period)) }],
    }),
  },
  {
    id: "ema",
    name: "EMA",
    category: "trend",
    tier: "core",
    defaultParams: { period: 20 },
    compute: (c, p) => ({
      kind: "series",
      overlay: true,
      lines: [{ key: "ema", color: COLORS.secondary, points: toPoints(ema(c, p.period)) }],
    }),
  },
  {
    id: "bollinger",
    name: "Bollinger Bands",
    category: "volatility",
    tier: "core",
    defaultParams: { period: 20 },
    compute: (c, p) => {
      const values = bollingerBands(c, p.period, 2).filter((v) => v.upper != null);
      return {
        kind: "series",
        overlay: true,
        lines: [
          { key: "upper", color: COLORS.tertiary, points: values.map((v) => ({ time: v.time, value: v.upper as number })) },
          { key: "middle", color: COLORS.tertiary, lineStyle: 2, points: values.map((v) => ({ time: v.time, value: v.middle as number })) },
          { key: "lower", color: COLORS.tertiary, points: values.map((v) => ({ time: v.time, value: v.lower as number })) },
        ],
      };
    },
  },
  {
    id: "volume",
    name: "Volume",
    category: "volume",
    tier: "core",
    defaultParams: {},
    compute: (c) => ({
      kind: "series",
      overlay: false,
      lines: [
        {
          key: "volume",
          color: "#90A4AE",
          seriesType: "Histogram",
          points: c.map((point) => ({ time: point.time, value: point.volume ?? 0 })),
        },
      ],
    }),
  },
  {
    id: "rsi",
    name: "RSI",
    category: "momentum",
    tier: "core",
    defaultParams: { period: 14 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "rsi", color: COLORS.primary, points: toPoints(rsi(c, p.period)) }],
    }),
  },
  {
    id: "macd",
    name: "MACD",
    category: "momentum",
    tier: "core",
    defaultParams: {},
    compute: (c) => {
      const values = macd(c);
      return {
        kind: "series",
        overlay: false,
        lines: [
          { key: "macd", color: COLORS.primary, points: toPoints(values.map((v) => ({ time: v.time, value: v.macd }))) },
          { key: "signal", color: COLORS.secondary, points: toPoints(values.map((v) => ({ time: v.time, value: v.signal }))) },
          {
            key: "histogram",
            color: "#90A4AE",
            seriesType: "Histogram",
            points: toPoints(values.map((v) => ({ time: v.time, value: v.histogram }))),
          },
        ],
      };
    },
  },
  {
    id: "stochastic",
    name: "Stochastic",
    category: "momentum",
    tier: "core",
    defaultParams: {},
    compute: (c) => {
      const values = stochastic(c, 14, 3);
      return {
        kind: "series",
        overlay: false,
        lines: [
          { key: "k", color: COLORS.primary, points: toPoints(values.map((v) => ({ time: v.time, value: v.k }))) },
          { key: "d", color: COLORS.secondary, points: toPoints(values.map((v) => ({ time: v.time, value: v.d }))) },
        ],
      };
    },
  },
];
