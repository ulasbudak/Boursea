import { LOCALE_TAGS, type Locale } from "./locale";

export function formatPrice(value: number, currency: string | null, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatChange(
  changeAbs: number,
  changePct: number,
  currency: string | null,
  locale: Locale
): string {
  const sign = changeAbs >= 0 ? "+" : "";
  return `${sign}${formatPrice(changeAbs, currency, locale)} (${sign}${changePct.toFixed(2)}%)`;
}

export function formatMarketCap(marketCap: number, currency: string | null, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "currency",
    currency: currency ?? "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(marketCap);
}

/** Plain decimal formatting for unitless ratios (P/E, margins, growth, …) with unknown currency/percent scale. */
export function formatRatio(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], { maximumFractionDigits: 2 }).format(value);
}

/** Compact large-number formatting (e.g. free cash flow) without a currency symbol. */
export function formatCompactNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Formats a percentage-point difference (e.g. 12.3 -> "+12.3%") with an explicit sign. */
export function formatSignedPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "percent",
    signDisplay: "exceptZero",
    maximumFractionDigits: 1,
  }).format(value / 100);
}
