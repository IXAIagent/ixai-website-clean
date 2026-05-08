"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertItem,
  AllocationItem,
  AssetAllocationResponse,
  CashPositionResponse,
  CryptoPositionResponse,
  DecisionCard,
  FCNPositionResponse,
  getCash,
  getCrypto,
  getFcns,
  getMyAssetAllocation,
  getMyRiskOverview,
  getMySummary,
  getStocks,
  getToken,
  logout,
  RiskOverviewResponse,
  StockPositionResponse,
  SummaryResponse,
} from "../lib/api";

type DashboardState = {
  summary: SummaryResponse;
  allocation: AssetAllocationResponse;
  risk: RiskOverviewResponse;
  stocks: StockPositionResponse[];
  fcns: FCNPositionResponse[];
  crypto: CryptoPositionResponse[];
  cash: CashPositionResponse[];
};

type FCNUnderlyingResult = {
  symbol?: string | null;
  initial_price?: number | string | null;
  current_price?: number | string | null;
  performance?: number | string | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_KI?: number | string | null;
  price_source?: string | null;
};

type FCNDetail = FCNPositionResponse & {
  fcn_id?: string | number | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_ko_pct?: number | string | null;
  underlying_results?: FCNUnderlyingResult[] | null;
  prices?: FCNUnderlyingResult[] | null;
  symbols?: string[] | null;
};

function numberValue(value: unknown, fallback = 0) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  return Number.isFinite(number) ? number : fallback;
}

function money(value: unknown) {
  const number = numberValue(value, NaN);

  if (!Number.isFinite(number)) return "$0";
  return `$${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function priceMoney(value: unknown) {
  const number = numberValue(value, NaN);
  if (!Number.isFinite(number) || number <= 0) return "待更新";
  return `$${number.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function percentValue(value: unknown) {
  const number = numberValue(value, NaN);
  if (!Number.isFinite(number)) return "-";
  const pct = Math.abs(number) <= 1 ? number * 100 : number;
  return `${pct.toFixed(1)}%`;
}

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function assetDisplayName(displayName: unknown, symbol: unknown, fallback: string) {
  const symbolText = textValue(symbol, fallback).toUpperCase();
  const displayText = textValue(displayName, "");
  if (!displayText) return symbolText;
  if (displayText.toUpperCase().includes(symbolText)) return displayText;
  return `${displayText} ${symbolText}`;
}

function listValue<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function firstNonEmpty<T>(...lists: T[][]): T[] {
  return lists.find((items) => items.length > 0) || [];
}

function riskBadgeClass(level: unknown) {
  const normalized = String(level || "").toLowerCase();
  if (normalized === "high") return "bg-red-500 text-white";
  if (normalized === "medium") return "bg-yellow-400 text-black";
  if (normalized === "low") return "bg-emerald-400 text-black";
  return "bg-zinc-700 text-zinc-200";
}

function allocationLabel(item: AllocationItem) {
  const labels: Record<string, string> = {
    stock: "Stocks",
    fcn: "FCN",
    crypto: "Crypto",
    cash: "Cash",
  };
  return labels[item.asset_class] || item.asset_class;
}

function allocationAccent(assetClass: string) {
  if (assetClass === "stock") return "bg-blue-400";
  if (assetClass === "fcn") return "bg-red-400";
  if (assetClass === "crypto") return "bg-violet-400";
  if (assetClass === "cash") return "bg-emerald-400";
  return "bg-zinc-400";
}

function severityClass(alert: AlertItem) {
  const severity = String(alert.severity || alert.level || "").toLowerCase();
  if (severity === "high" || severity === "critical") return "border-red-500/60";
  if (severity === "medium") return "border-yellow-400/60";
  return "border-emerald-400/50";
}

function underlyingsText(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "-";

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const symbols = parsed
        .map((item) =>
          typeof item === "object" && item !== null && "symbol" in item
            ? String(item.symbol || "").trim().toUpperCase()
            : "",
        )
        .filter(Boolean);
      return symbols.length > 0 ? symbols.join(", ") : value;
    }
  } catch {
    return value;
  }

  return value;
}

function positionCardClass() {
  return "rounded-xl border border-zinc-800 bg-zinc-900 p-4";
}

function priceSource(value: unknown) {
  const source = textValue(value, "");
  return source ? `source: ${source}` : "";
}

function positionKey(item: FCNDetail) {
  return textValue(
    item.fcn_id || item.id || item.fcn_code || item.code || item.name,
    "",
  ).toUpperCase();
}

function mergeFcnDetails(
  analyses: FCNDetail[],
  positions: FCNDetail[],
  summaries: FCNDetail[],
  raw: FCNDetail[],
) {
  const byKey = new Map<string, FCNDetail>();

  for (const item of [...positions, ...summaries, ...raw]) {
    const key = positionKey(item);
    if (key) {
      byKey.set(key, { ...byKey.get(key), ...item });
    }
  }

  for (const analysis of analyses) {
    const key = positionKey(analysis);
    if (key) {
      byKey.set(key, { ...byKey.get(key), ...analysis });
    } else {
      byKey.set(`analysis-${byKey.size}`, analysis);
    }
  }

  return Array.from(byKey.values());
}

function cryptoCurrentValue(item: CryptoPositionResponse) {
  const storedValue = numberValue(item.current_value, NaN);
  if (Number.isFinite(storedValue) && storedValue > 0) return money(storedValue);

  const currentPrice = numberValue(item.current_price, NaN);
  const avgPrice = numberValue(item.avg_price, NaN);
  const quantity = numberValue(item.quantity, NaN);

  if (Number.isFinite(currentPrice) && currentPrice > 0 && Number.isFinite(quantity)) {
    return money(currentPrice * quantity);
  }

  if (Number.isFinite(avgPrice) && avgPrice > 0 && Number.isFinite(quantity)) {
    return money(avgPrice * quantity);
  }

  return "待更新";
}

function cryptoPriceSource(item: CryptoPositionResponse) {
  const currentPrice = numberValue(item.current_price, NaN);
  const avgPrice = numberValue(item.avg_price, NaN);
  if ((!Number.isFinite(currentPrice) || currentPrice <= 0) && avgPrice > 0) {
    return "source: input estimate";
  }
  return priceSource(item.price_source);
}

function fcnUnderlyingList(fcn: FCNDetail) {
  return firstNonEmpty(
    listValue(fcn.underlying_results),
    listValue(fcn.prices),
  );
}

function fcnUnderlyingsLabel(fcn: FCNDetail) {
  const results = fcnUnderlyingList(fcn);
  if (results.length > 0) {
    return results.map((item) => textValue(item.symbol, "")).filter(Boolean).join(", ");
  }
  if (Array.isArray(fcn.symbols) && fcn.symbols.length > 0) {
    return fcn.symbols.join(", ");
  }
  return textValue(
    fcn.worst_symbol || fcn.worst_of,
    underlyingsText(fcn.underlyings),
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      setError("");
      const [summary, allocation, risk, stocks, fcns, crypto, cash] =
        await Promise.all([
        getMySummary(),
        getMyAssetAllocation(),
        getMyRiskOverview(),
        getStocks(),
        getFcns(),
        getCrypto(),
        getCash(),
      ]);
      setData({
        summary,
        allocation,
        risk,
        stocks: Array.isArray(stocks) ? stocks : [],
        fcns: Array.isArray(fcns) ? fcns : [],
        crypto: Array.isArray(crypto) ? crypto : [],
        cash: Array.isArray(cash) ? cash : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard 載入失敗。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    function refreshOnFocus() {
      if (getToken()) {
        void loadDashboard(false);
      }
    }

    const initialLoad = window.setTimeout(() => {
      void loadDashboard(false);
    }, 0);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadDashboard, router]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-5 py-8 text-white">
        <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-300">
          Loading dashboard...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black px-5 py-8 text-white">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-500/50 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      </main>
    );
  }

  if (!data) return null;

  const allocationItems = listValue(data.allocation.items);
  const decisionCards = listValue(data.risk.decision_cards);
  const alerts = listValue(data.risk.alerts);
  const stocks = firstNonEmpty(
    listValue(data.summary.stock_positions),
    listValue(data.summary.stocks),
    listValue(data.stocks),
  );
  const fcns = mergeFcnDetails(
    listValue(data.summary.fcn_analysis),
    listValue(data.summary.fcn_positions),
    listValue(data.summary.fcn_summary),
    listValue(data.fcns),
  );
  const crypto = firstNonEmpty(
    listValue(data.summary.crypto_positions),
    listValue(data.crypto),
  );
  const cash = firstNonEmpty(
    listValue(data.summary.cash_summary),
    listValue(data.cash),
  );
  const riskLevel = data.risk.risk_level || data.summary.risk_level || "unknown";
  const totalValue = data.summary.total_value ?? data.allocation.total_value;
  const hasPortfolioAssets =
    allocationItems.some((item) => Number(item.value) > 0) ||
    Number(totalValue || 0) > 0;

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase text-emerald-400">
              IXAI Agent / 一玄AI
            </div>
            <h1 className="mt-2 text-3xl font-bold">Portfolio Dashboard</h1>
            <p className="mt-2 text-zinc-400">
              {textValue(data.summary.portfolio_name || data.allocation.portfolio_name)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="w-full rounded-xl border border-emerald-400/50 px-4 py-3 text-center text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10 md:w-auto"
              onClick={() => router.push("/input")}
              type="button"
            >
              新增資產 / Add Asset
            </button>
            <button
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900 md:w-auto"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        {!hasPortfolioAssets && (
          <Link
            className="block rounded-2xl border border-dashed border-emerald-400/50 bg-emerald-400/10 p-6 text-center text-lg font-semibold text-emerald-100 transition hover:bg-emerald-400/15"
            href="/input"
          >
            尚未新增資產，點此新增
          </Link>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <div className="text-sm text-zinc-400">Total Value</div>
            <div className="mt-2 text-3xl font-bold">{money(totalValue)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <div className="text-sm text-zinc-400">Risk Level</div>
            <div className="mt-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold uppercase ${riskBadgeClass(riskLevel)}`}
              >
                {textValue(riskLevel)}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <div className="text-sm text-zinc-400">Risk Score</div>
            <div className="mt-2 text-3xl font-bold text-emerald-300">
              {textValue(data.risk.risk_score, "0")}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {allocationItems.map((item) => (
            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
              key={item.asset_class}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">{allocationLabel(item)}</div>
                <div className={`h-2.5 w-2.5 rounded-full ${allocationAccent(item.asset_class)}`} />
              </div>
              <div className="mt-3 text-2xl font-bold">{money(item.value)}</div>
              <div className="mt-3 h-2 rounded-full bg-zinc-800">
                <div
                  className={`h-2 rounded-full ${allocationAccent(item.asset_class)}`}
                  style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                {item.percentage.toFixed(2)}%
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <h2 className="text-xl font-semibold">Risk Overview</h2>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
              <div className="text-sm text-zinc-400">Top Risk</div>
              <div className="mt-2 text-lg font-semibold text-red-300">
                {textValue(data.risk.top_risk || data.summary.top_risk, "No major risk")}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {decisionCards.map((card: DecisionCard, index) => (
                <div
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                  key={`${textValue(card.title, "decision")}-${index}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-white">
                      {textValue(card.title, "Decision")}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${riskBadgeClass(card.level)}`}
                    >
                      {textValue(card.level, "info")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {textValue(card.message)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <h2 className="text-xl font-semibold">AI Advice</h2>
            <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-7 text-zinc-200">
              {textValue(data.risk.ai_advice || data.summary.ai_advice, "No advice available.")}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
          <h2 className="text-xl font-semibold">持倉明細 / Positions</h2>
          <div className="mt-4 grid gap-4 xl:grid-cols-4">
            <div className={positionCardClass()}>
              <h3 className="font-semibold text-white">Stocks</h3>
              <div className="mt-4 grid gap-3">
                {stocks.length === 0 && (
                  <div className="text-sm text-zinc-400">尚無股票部位</div>
                )}
                {stocks.map((stock, index) => (
                  <div
                    className="rounded-lg border border-zinc-800 bg-black/30 p-3"
                    key={`${textValue(stock.id || stock.symbol, "stock")}-${index}`}
                  >
                    <div className="font-semibold text-white">
                      {assetDisplayName(stock.display_name, stock.symbol, "STOCK")}
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-zinc-300">
                      <div>Quantity: {textValue(stock.quantity, "0")}</div>
                      <div>Avg Price: {priceMoney(stock.avg_price)}</div>
                      <div>Current Price: {priceMoney(stock.current_price)}</div>
                      <div>Current Value: {money(stock.current_value)}</div>
                      {priceSource(stock.price_source) && (
                        <div className="text-xs text-zinc-500">
                          {priceSource(stock.price_source)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={positionCardClass()}>
              <h3 className="font-semibold text-white">FCN</h3>
              <div className="mt-4 grid gap-3">
                {fcns.length === 0 && (
                  <div className="text-sm text-zinc-400">尚無 FCN 部位</div>
                )}
                {fcns.map((fcn, index) => (
                  <div
                    className="rounded-lg border border-zinc-800 bg-black/30 p-3"
                    key={`${textValue(fcn.id || fcn.fcn_code || fcn.name, "fcn")}-${index}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-white">
                        {textValue(fcn.name || fcn.fcn_code || fcn.code, "FCN")}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${riskBadgeClass(fcn.risk_level)}`}
                      >
                        {textValue(fcn.risk_level, "unknown")}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-zinc-300">
                      <div>Notional: {money(fcn.notional_amount || fcn.notional)}</div>
                      <div>Underlyings: {fcnUnderlyingsLabel(fcn)}</div>
                      <div>Worst-of: {textValue(fcn.worst_symbol || fcn.worst_of)}</div>
                      <div>
                        KI Distance: {percentValue(fcn.distance_to_KI || fcn.distance_to_ki_pct)}
                      </div>
                      <div>
                        KO Distance: {percentValue(fcn.distance_to_KO || fcn.distance_to_ko_pct)}
                      </div>
                      {priceSource(fcn.price_source) && (
                        <div className="text-xs text-zinc-500">
                          {priceSource(fcn.price_source)}
                        </div>
                      )}
                      {fcnUnderlyingList(fcn).length > 0 && (
                        <div className="mt-2 grid gap-2 border-t border-zinc-800 pt-2">
                          {fcnUnderlyingList(fcn).map((underlying, underlyingIndex) => (
                            <div
                              className="rounded-md bg-zinc-950 p-2 text-xs text-zinc-300"
                              key={`${textValue(underlying.symbol, "underlying")}-${underlyingIndex}`}
                            >
                              <div className="font-semibold text-white">
                                {textValue(underlying.symbol, "UNDERLYING")}
                              </div>
                              <div>Current: {priceMoney(underlying.current_price)}</div>
                              <div>
                                Performance:{" "}
                                {percentValue(
                                  underlying.performance ||
                                    underlying.distance_to_KI ||
                                    underlying.distance_to_ki_pct,
                                )}
                              </div>
                              {priceSource(underlying.price_source) && (
                                <div className="text-zinc-500">
                                  {priceSource(underlying.price_source)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={positionCardClass()}>
              <h3 className="font-semibold text-white">Crypto</h3>
              <div className="mt-4 grid gap-3">
                {crypto.length === 0 && (
                  <div className="text-sm text-zinc-400">尚無 Crypto 部位</div>
                )}
                {crypto.map((item, index) => (
                  <div
                    className="rounded-lg border border-zinc-800 bg-black/30 p-3"
                    key={`${textValue(item.id || item.symbol, "crypto")}-${index}`}
                  >
                    <div className="font-semibold text-white">
                      {assetDisplayName(item.display_name, item.symbol, "CRYPTO")}
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-zinc-300">
                      <div>Type: {textValue(item.asset_type, "crypto")}</div>
                      <div>Quantity: {textValue(item.quantity, "0")}</div>
                      <div>Avg Price: {priceMoney(item.avg_price)}</div>
                      <div>Current Price: {priceMoney(item.current_price)}</div>
                      <div>Leverage: {textValue(item.leverage, "-")}</div>
                      <div>Current Value: {cryptoCurrentValue(item)}</div>
                      {cryptoPriceSource(item) && (
                        <div className="text-xs text-zinc-500">
                          {cryptoPriceSource(item)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={positionCardClass()}>
              <h3 className="font-semibold text-white">Cash</h3>
              <div className="mt-4 grid gap-3">
                {cash.length === 0 && (
                  <div className="text-sm text-zinc-400">尚無現金部位</div>
                )}
                {cash.map((item, index) => (
                  <div
                    className="rounded-lg border border-zinc-800 bg-black/30 p-3"
                    key={`${textValue(item.id || item.currency, "cash")}-${index}`}
                  >
                    <div className="font-semibold text-white">
                      {textValue(item.currency, "USD")}
                    </div>
                    <div className="mt-2 text-sm text-zinc-300">
                      Amount: {money(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
          <h2 className="text-xl font-semibold">Alerts</h2>
          <div className="mt-4 grid gap-3">
            {alerts.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-400">
                No active alerts.
              </div>
            )}
            {alerts.map((alert, index) => (
              <div
                className={`rounded-xl border bg-zinc-900 p-4 ${severityClass(alert)}`}
                key={`${textValue(alert.id || alert.title || alert.message, "alert")}-${index}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-white">
                    {textValue(alert.title, "Alert")}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${riskBadgeClass(alert.severity || alert.level)}`}
                  >
                    {textValue(alert.severity || alert.level, "info")}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {textValue(alert.message)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
