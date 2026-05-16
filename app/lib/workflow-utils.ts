export type StockMarket = "US" | "TW" | "HK" | "JP" | "KR";

export function normalizeStockTicker(symbol: string, market: StockMarket) {
  const clean = symbol.trim().toUpperCase();
  if (!clean) return "";
  if (market === "TW" && /^\d{4}$/.test(clean)) return `${clean}.TW`;
  if (market === "HK" && /^\d{4,5}$/.test(clean)) return `${clean}.HK`;
  if (market === "JP" && /^\d{4}$/.test(clean)) return `${clean}.T`;
  if (market === "KR" && /^\d{6}$/.test(clean)) return `${clean}.KS`;
  return clean;
}

export function limitPriorityItems<T>(items: T[], max = 3) {
  return items.slice(0, Math.max(0, max));
}
