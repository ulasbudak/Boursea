import type { OhlcvPoint } from "./types";

export type IndicatorCategory = "trend" | "momentum" | "volatility" | "volume" | "other";
export type IndicatorTier = "core" | "advanced";

export interface IndicatorLineOutput {
  key: string;
  color: string;
  lineStyle?: number;
  seriesType?: "Line" | "Histogram";
  points: { time: number; value: number }[];
}

export interface SeriesIndicatorResult {
  kind: "series";
  overlay: boolean;
  lines: IndicatorLineOutput[];
}

export interface PriceLinesIndicatorResult {
  kind: "priceLines";
  lines: { price: number; title: string }[];
}

export type IndicatorComputeResult = SeriesIndicatorResult | PriceLinesIndicatorResult;

export interface IndicatorDefinition {
  id: string;
  name: string;
  category: IndicatorCategory;
  tier: IndicatorTier;
  defaultParams: Record<string, number>;
  compute: (candles: OhlcvPoint[], params: Record<string, number>) => IndicatorComputeResult;
}

export function toPoints(values: { time: number; value: number | null }[]): { time: number; value: number }[] {
  return values.filter((v): v is { time: number; value: number } => v.value != null);
}

export const INDICATOR_COLORS = {
  primary: "#2962FF",
  secondary: "#FF6D00",
  tertiary: "#9C27B0",
  quaternary: "#00897B",
};
