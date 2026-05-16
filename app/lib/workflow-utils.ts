export type StockMarket = "Auto" | "US" | "TW" | "HK" | "JP" | "KR";

export type StockResolution = {
  normalizedSymbol: string;
  candidates: string[];
  source: "alias" | "market" | "direct";
};

const stockAliasMap: Record<string, string[]> = {
  "台積電": ["2330.TW", "TSM"],
  "台積": ["2330.TW", "TSM"],
  TSMC: ["2330.TW", "TSM"],
  "蘋果": ["AAPL"],
  APPLE: ["AAPL"],
  "微軟": ["MSFT"],
  MICROSOFT: ["MSFT"],
  "輝達": ["NVDA"],
  NVIDIA: ["NVDA"],
};

export function normalizeStockTicker(symbol: string, market: StockMarket) {
  const clean = symbol.trim().toUpperCase();
  if (!clean) return "";
  if (market === "Auto" && /^\d{4}$/.test(clean)) return `${clean}.TW`;
  if (market === "TW" && /^\d{4}$/.test(clean)) return `${clean}.TW`;
  if (market === "HK" && /^\d{4,5}$/.test(clean)) return `${clean}.HK`;
  if (market === "JP" && /^\d{4}$/.test(clean)) return `${clean}.T`;
  if (market === "KR" && /^\d{6}$/.test(clean)) return `${clean}.KS`;
  return clean;
}

export function resolveStockSymbol(input: string, market: StockMarket): StockResolution {
  const raw = input.trim();
  if (!raw) return { normalizedSymbol: "", candidates: [], source: "direct" };

  const alias = stockAliasMap[raw] || stockAliasMap[raw.toUpperCase()];
  if (alias?.length) {
    const preferred = market === "US" && alias.includes("TSM") ? "TSM" : alias[0];
    return { normalizedSymbol: preferred, candidates: alias, source: "alias" };
  }

  const normalizedSymbol = normalizeStockTicker(raw, market);
  return {
    normalizedSymbol,
    candidates: normalizedSymbol ? [normalizedSymbol] : [],
    source: market === "Auto" ? "direct" : "market",
  };
}

export function limitPriorityItems<T>(items: T[], max = 3) {
  return items.slice(0, Math.max(0, max));
}
