/**
 * Borsa İstanbul is switched off until a live BIST price source exists (product decision,
 * 2026-09-26). Mirrors BIST_ENABLED in apps/api/app/market_data.py — flip both together.
 * While false, the apps hide BIST from exchange pickers and explain why in search/screener.
 */
export const BIST_ENABLED = false;
