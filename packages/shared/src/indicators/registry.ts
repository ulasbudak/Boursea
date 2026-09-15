import { CORE_INDICATORS } from "./core-registry";
import { ADVANCED_INDICATORS } from "./advanced/registry";
import type { IndicatorDefinition } from "./registry-types";

export const ALL_INDICATORS: IndicatorDefinition[] = [...CORE_INDICATORS, ...ADVANCED_INDICATORS];

export function findIndicator(id: string): IndicatorDefinition | undefined {
  return ALL_INDICATORS.find((d) => d.id === id);
}
