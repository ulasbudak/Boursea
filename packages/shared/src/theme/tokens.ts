// Borocean design tokens — single source of truth for web (Tailwind @theme) and mobile (RN StyleSheet).
// Dark is the primary/default surface for a trading app (long screen-time, chart-heavy); light is
// a fully-supported secondary. Keep web's globals.css and mobile's theme.ts numerically in sync with this file.

export const colorTokens = {
  dark: {
    canvas: "#0A0B0D",
    surface: "#121417",
    surfaceHover: "#1A1D21",
    surfaceElevated: "#1E2126",
    borderSubtle: "#23262B",
    borderDefault: "#2E3239",
    textPrimary: "#F4F5F7",
    textSecondary: "#9CA3AF",
    textTertiary: "#6B7280",
    textDisabled: "#4B5563",
    accent: "#3B82F6",
    accentText: "#EFF6FF",
    positive: "#34D399",
    negative: "#F87171",
    warning: "#F59E0B",
    info: "#38BDF8",
  },
  light: {
    canvas: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceHover: "#F1F5F9",
    surfaceElevated: "#FFFFFF",
    borderSubtle: "#E5E7EB",
    borderDefault: "#D1D5DB",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textTertiary: "#94A3B8",
    textDisabled: "#CBD5E1",
    accent: "#2563EB",
    accentText: "#FFFFFF",
    positive: "#16A34A",
    negative: "#DC2626",
    warning: "#D97706",
    info: "#0284C7",
  },
} as const;

export type ThemeMode = keyof typeof colorTokens;
export type ColorToken = keyof typeof colorTokens.dark;
export type ColorPalette = Record<ColorToken, string>;

// 4px base scale.
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  full: 9999,
} as const;

// font-size/line-height pairs, in px. Numeric UI (prices, %, RSI...) should also get tabular-nums.
export const typeScale = {
  display: { fontSize: 32, lineHeight: 40, weight: "700" },
  h1: { fontSize: 24, lineHeight: 32, weight: "600" },
  h2: { fontSize: 20, lineHeight: 28, weight: "600" },
  h3: { fontSize: 16, lineHeight: 24, weight: "600" },
  body: { fontSize: 14, lineHeight: 20, weight: "400" },
  bodyStrong: { fontSize: 14, lineHeight: 20, weight: "600" },
  caption: { fontSize: 12, lineHeight: 16, weight: "400" },
  label: { fontSize: 12, lineHeight: 16, weight: "500" },
} as const;

/** Positive/negative/neutral color for a signed financial value, given the active theme. */
export function signColor(value: number | null | undefined, mode: ThemeMode = "dark"): string {
  const tokens = colorTokens[mode];
  if (value == null || value === 0) return tokens.textSecondary;
  return value > 0 ? tokens.positive : tokens.negative;
}
