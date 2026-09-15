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
