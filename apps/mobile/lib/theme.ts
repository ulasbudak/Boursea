import { useColorScheme } from "react-native";
import {
  colorTokens,
  radius,
  spacing,
  typeScale,
  type ColorPalette,
  type ThemeMode,
} from "@trendus/shared";

export { spacing, radius, typeScale };
export type { ThemeMode };

/** Dark is the default when the OS reports no preference (matches web's dark-first default). */
export function useTheme(): { mode: ThemeMode; colors: ColorPalette } {
  const scheme = useColorScheme();
  const mode: ThemeMode = scheme === "light" ? "light" : "dark";
  return { mode, colors: colorTokens[mode] };
}

export type ThemeColors = ColorPalette;
