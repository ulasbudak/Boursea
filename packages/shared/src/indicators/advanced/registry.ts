import {
  INDICATOR_COLORS as COLORS,
  toPoints,
  type IndicatorDefinition,
} from "../registry-types";
import { adx, aroon, aroonOscillator, ichimoku, parabolicSar, superTrend, trix, vortex } from "./trend";
import { dema, hma, kama, tema, wma } from "./moving-averages";
import {
  awesomeOscillator,
  cci,
  cmo,
  momentum,
  roc,
  tsi,
  ultimateOscillator,
  williamsR,
} from "./momentum";
import { atr, donchianChannels, keltnerChannels, standardDeviation } from "./volatility";
import {
  accumulationDistribution,
  chaikinMoneyFlow,
  forceIndex,
  moneyFlowIndex,
  obv,
  vwap,
} from "./volume";
import { fibonacciRetracement } from "./fibonacci";

export const ADVANCED_INDICATORS: IndicatorDefinition[] = [
  {
    id: "wma",
    name: "WMA",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 20 },
    compute: (c, p) => ({
      kind: "series",
      overlay: true,
      lines: [{ key: "wma", color: COLORS.primary, points: toPoints(wma(c, p.period)) }],
    }),
  },
  {
    id: "hma",
    name: "HMA",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 20 },
    compute: (c, p) => ({
      kind: "series",
      overlay: true,
      lines: [{ key: "hma", color: COLORS.primary, points: toPoints(hma(c, p.period)) }],
    }),
  },
  {
    id: "dema",
    name: "DEMA",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 20 },
    compute: (c, p) => ({
      kind: "series",
      overlay: true,
      lines: [{ key: "dema", color: COLORS.primary, points: toPoints(dema(c, p.period)) }],
    }),
  },
  {
    id: "tema",
    name: "TEMA",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 20 },
    compute: (c, p) => ({
      kind: "series",
      overlay: true,
      lines: [{ key: "tema", color: COLORS.primary, points: toPoints(tema(c, p.period)) }],
    }),
  },
  {
    id: "kama",
    name: "KAMA",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 10 },
    compute: (c, p) => ({
      kind: "series",
      overlay: true,
      lines: [{ key: "kama", color: COLORS.primary, points: toPoints(kama(c, p.period)) }],
    }),
  },
  {
    id: "parabolicSar",
    name: "Parabolic SAR",
    category: "trend",
    tier: "advanced",
    defaultParams: {},
    compute: (c) => ({
      kind: "series",
      overlay: true,
      lines: [{ key: "sar", color: COLORS.tertiary, points: toPoints(parabolicSar(c)) }],
    }),
  },
  {
    id: "superTrend",
    name: "SuperTrend",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 10 },
    compute: (c, p) => ({
      kind: "series",
      overlay: true,
      lines: [{ key: "superTrend", color: COLORS.quaternary, points: toPoints(superTrend(c, p.period)) }],
    }),
  },
  {
    id: "ichimoku",
    name: "Ichimoku",
    category: "trend",
    tier: "advanced",
    defaultParams: {},
    compute: (c) => {
      const values = ichimoku(c);
      return {
        kind: "series",
        overlay: true,
        lines: [
          { key: "tenkan", color: COLORS.primary, points: toPoints(values.map((v) => ({ time: v.time, value: v.tenkanSen }))) },
          { key: "kijun", color: COLORS.secondary, points: toPoints(values.map((v) => ({ time: v.time, value: v.kijunSen }))) },
          { key: "spanA", color: COLORS.tertiary, points: toPoints(values.map((v) => ({ time: v.time, value: v.senkouSpanA }))) },
          { key: "spanB", color: COLORS.quaternary, points: toPoints(values.map((v) => ({ time: v.time, value: v.senkouSpanB }))) },
          { key: "chikou", color: "#607D8B", points: toPoints(values.map((v) => ({ time: v.time, value: v.chikouSpan }))) },
        ],
      };
    },
  },
  {
    id: "adx",
    name: "ADX",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 14 },
    compute: (c, p) => {
      const values = adx(c, p.period);
      return {
        kind: "series",
        overlay: false,
        lines: [
          { key: "adx", color: COLORS.primary, points: toPoints(values.map((v) => ({ time: v.time, value: v.adx }))) },
          { key: "plusDi", color: COLORS.quaternary, points: toPoints(values.map((v) => ({ time: v.time, value: v.plusDi }))) },
          { key: "minusDi", color: COLORS.secondary, points: toPoints(values.map((v) => ({ time: v.time, value: v.minusDi }))) },
        ],
      };
    },
  },
  {
    id: "aroon",
    name: "Aroon",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 25 },
    compute: (c, p) => {
      const values = aroon(c, p.period);
      return {
        kind: "series",
        overlay: false,
        lines: [
          { key: "up", color: COLORS.quaternary, points: toPoints(values.map((v) => ({ time: v.time, value: v.up }))) },
          { key: "down", color: COLORS.secondary, points: toPoints(values.map((v) => ({ time: v.time, value: v.down }))) },
        ],
      };
    },
  },
  {
    id: "aroonOscillator",
    name: "Aroon Oscillator",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 25 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(aroonOscillator(c, p.period)) }],
    }),
  },
  {
    id: "vortex",
    name: "Vortex",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 14 },
    compute: (c, p) => {
      const values = vortex(c, p.period);
      return {
        kind: "series",
        overlay: false,
        lines: [
          { key: "plusVi", color: COLORS.quaternary, points: toPoints(values.map((v) => ({ time: v.time, value: v.plusVi }))) },
          { key: "minusVi", color: COLORS.secondary, points: toPoints(values.map((v) => ({ time: v.time, value: v.minusVi }))) },
        ],
      };
    },
  },
  {
    id: "trix",
    name: "TRIX",
    category: "trend",
    tier: "advanced",
    defaultParams: { period: 15 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(trix(c, p.period)) }],
    }),
  },
  {
    id: "williamsR",
    name: "Williams %R",
    category: "momentum",
    tier: "advanced",
    defaultParams: { period: 14 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(williamsR(c, p.period)) }],
    }),
  },
  {
    id: "cci",
    name: "CCI",
    category: "momentum",
    tier: "advanced",
    defaultParams: { period: 20 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(cci(c, p.period)) }],
    }),
  },
  {
    id: "roc",
    name: "ROC",
    category: "momentum",
    tier: "advanced",
    defaultParams: { period: 12 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(roc(c, p.period)) }],
    }),
  },
  {
    id: "momentum",
    name: "Momentum",
    category: "momentum",
    tier: "advanced",
    defaultParams: { period: 10 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(momentum(c, p.period)) }],
    }),
  },
  {
    id: "ultimateOscillator",
    name: "Ultimate Oscillator",
    category: "momentum",
    tier: "advanced",
    defaultParams: {},
    compute: (c) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(ultimateOscillator(c)) }],
    }),
  },
  {
    id: "awesomeOscillator",
    name: "Awesome Oscillator",
    category: "momentum",
    tier: "advanced",
    defaultParams: {},
    compute: (c) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(awesomeOscillator(c)) }],
    }),
  },
  {
    id: "cmo",
    name: "CMO",
    category: "momentum",
    tier: "advanced",
    defaultParams: { period: 14 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(cmo(c, p.period)) }],
    }),
  },
  {
    id: "tsi",
    name: "TSI",
    category: "momentum",
    tier: "advanced",
    defaultParams: {},
    compute: (c) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(tsi(c)) }],
    }),
  },
  {
    id: "atr",
    name: "ATR",
    category: "volatility",
    tier: "advanced",
    defaultParams: { period: 14 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(atr(c, p.period)) }],
    }),
  },
  {
    id: "standardDeviation",
    name: "Standard Deviation",
    category: "volatility",
    tier: "advanced",
    defaultParams: { period: 20 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(standardDeviation(c, p.period)) }],
    }),
  },
  {
    id: "keltnerChannels",
    name: "Keltner Channels",
    category: "volatility",
    tier: "advanced",
    defaultParams: { period: 20 },
    compute: (c, p) => {
      const values = keltnerChannels(c, p.period);
      return {
        kind: "series",
        overlay: true,
        lines: [
          { key: "upper", color: COLORS.tertiary, points: toPoints(values.map((v) => ({ time: v.time, value: v.upper }))) },
          { key: "middle", color: COLORS.tertiary, lineStyle: 2, points: toPoints(values.map((v) => ({ time: v.time, value: v.middle }))) },
          { key: "lower", color: COLORS.tertiary, points: toPoints(values.map((v) => ({ time: v.time, value: v.lower }))) },
        ],
      };
    },
  },
  {
    id: "donchianChannels",
    name: "Donchian Channels",
    category: "volatility",
    tier: "advanced",
    defaultParams: { period: 20 },
    compute: (c, p) => {
      const values = donchianChannels(c, p.period);
      return {
        kind: "series",
        overlay: true,
        lines: [
          { key: "upper", color: COLORS.quaternary, points: toPoints(values.map((v) => ({ time: v.time, value: v.upper }))) },
          { key: "middle", color: COLORS.quaternary, lineStyle: 2, points: toPoints(values.map((v) => ({ time: v.time, value: v.middle }))) },
          { key: "lower", color: COLORS.quaternary, points: toPoints(values.map((v) => ({ time: v.time, value: v.lower }))) },
        ],
      };
    },
  },
  {
    id: "obv",
    name: "OBV",
    category: "volume",
    tier: "advanced",
    defaultParams: {},
    compute: (c) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(obv(c)) }],
    }),
  },
  {
    id: "chaikinMoneyFlow",
    name: "Chaikin Money Flow",
    category: "volume",
    tier: "advanced",
    defaultParams: { period: 20 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(chaikinMoneyFlow(c, p.period)) }],
    }),
  },
  {
    id: "moneyFlowIndex",
    name: "Money Flow Index",
    category: "volume",
    tier: "advanced",
    defaultParams: { period: 14 },
    compute: (c, p) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(moneyFlowIndex(c, p.period)) }],
    }),
  },
  {
    id: "accumulationDistribution",
    name: "Accumulation/Distribution",
    category: "volume",
    tier: "advanced",
    defaultParams: {},
    compute: (c) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(accumulationDistribution(c)) }],
    }),
  },
  {
    id: "vwap",
    name: "VWAP",
    category: "volume",
    tier: "advanced",
    defaultParams: {},
    compute: (c) => ({
      kind: "series",
      overlay: true,
      lines: [{ key: "value", color: COLORS.quaternary, points: toPoints(vwap(c)) }],
    }),
  },
  {
    id: "forceIndex",
    name: "Force Index",
    category: "volume",
    tier: "advanced",
    defaultParams: {},
    compute: (c) => ({
      kind: "series",
      overlay: false,
      lines: [{ key: "value", color: COLORS.primary, points: toPoints(forceIndex(c)) }],
    }),
  },
  {
    id: "fibonacciRetracement",
    name: "Fibonacci Retracement",
    category: "other",
    tier: "advanced",
    defaultParams: {},
    compute: (c) => {
      const result = fibonacciRetracement(c);
      if (!result) return { kind: "priceLines", lines: [] };
      return {
        kind: "priceLines",
        lines: result.levels.map((l) => ({ price: l.price, title: `Fib ${(l.ratio * 100).toFixed(1)}%` })),
      };
    },
  },
];
