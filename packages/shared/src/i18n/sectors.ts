import type { Locale } from "./locale";

// Sector values as they appear in apps/api/app/data/us_universe.json (Finnhub's taxonomy) —
// used verbatim as the API filter value; only the *display* label is localized.
const SECTOR_LABELS_TR: Record<string, string> = {
  Technology: "Teknoloji",
  Energy: "Enerji",
  Healthcare: "Sağlık",
  "Financial Services": "Finansal Hizmetler",
  "Consumer Cyclical": "Döngüsel Tüketim",
  "Consumer Defensive": "Zorunlu Tüketim",
  Industrials: "Sanayi",
  "Basic Materials": "Temel Malzemeler",
  "Real Estate": "Gayrimenkul",
  Utilities: "Kamu Hizmetleri",
  "Communication Services": "İletişim Hizmetleri",
};

export const ALL_SECTORS = Object.keys(SECTOR_LABELS_TR);

export function translateSector(sector: string, locale: Locale): string {
  if (locale === "tr") return SECTOR_LABELS_TR[sector] ?? sector;
  return sector;
}
