/** Per-symbol storage key for client-persisted chart drawings (localStorage / AsyncStorage). */
export function drawingsStorageKey(exchange: string, symbol: string): string {
  return `boursea_drawings_${exchange.trim().toUpperCase()}_${symbol.trim().toUpperCase()}`;
}
