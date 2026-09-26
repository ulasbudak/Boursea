/** Per-symbol storage key for client-persisted chart drawings (localStorage / AsyncStorage). */
export function drawingsStorageKey(exchange: string, symbol: string): string {
  return `borocean_drawings_${exchange.trim().toUpperCase()}_${symbol.trim().toUpperCase()}`;
}
