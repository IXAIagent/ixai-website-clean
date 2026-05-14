"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  getPortfolioNews,
  getStocks,
  getToken,
  logout,
  NewsArticle,
  PortfolioNewsResponse,
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
  news: PortfolioNewsResponse | null;
};

type FCNUnderlyingResult = {
  symbol?: string | null;
  initial_price?: number | string | null;
  current_price?: number | string | null;
  performance?: number | string | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_KI?: number | string | null;
  price_source?: string | null;
  is_stale?: boolean | null;
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

function percentNumber(value: unknown) {
  const number = numberValue(value, NaN);
  if (!Number.isFinite(number)) return NaN;
  return Math.abs(number) <= 1 ? number * 100 : number;
}

function kiDistanceClass(value: unknown) {
  const pct = percentNumber(value);
  if (!Number.isFinite(pct)) return "text-zinc-400";
  if (pct < 5) return "text-red-400";
  if (pct <= 15) return "text-yellow-300";
  return "text-emerald-300";
}

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function tenorText(value: unknown) {
  const months = numberValue(value, NaN);
  if (!Number.isFinite(months) || months <= 0) return "-";
  return `${months}M`;
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

function priceBadgeLabel(source: unknown, isStale: unknown, isInputEstimate = false) {
  if (isStale === true) return "STALE";
  if (isInputEstimate) return "INPUT";

  const normalized = textValue(source, "").toLowerCase();
  if (normalized.includes("yahoo") || normalized.includes("binance")) return "LIVE";
  if (normalized.includes("stored") || normalized.includes("manual")) return "STORED";
  if (normalized.includes("stale")) return "STALE";
  return "UNKNOWN";
}

function priceBadgeClass(label: string) {
  if (label === "LIVE") return "border-emerald-400/50 bg-emerald-400/10 text-emerald-300";
  if (label === "STALE") return "border-yellow-400/50 bg-yellow-400/10 text-yellow-200";
  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

function PriceSourceBadge({
  source,
  isStale,
  inputEstimate = false,
}: {
  source: unknown;
  isStale?: unknown;
  inputEstimate?: boolean;
}) {
  const label = priceBadgeLabel(source, isStale, inputEstimate);
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priceBadgeClass(label)}`}
    >
      {label}
    </span>
  );
}

function formatDateTime(value: unknown) {
  const text = textValue(value, "");
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-800/80 ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-9 w-72" />
            <SkeletonBlock className="h-5 w-52" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SkeletonBlock className="h-12 w-28" />
            <SkeletonBlock className="h-12 w-36" />
            <SkeletonBlock className="h-12 w-24" />
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
              key={item}
            >
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="mt-4 h-9 w-36" />
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
              key={item}
            >
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-3 w-3 rounded-full" />
              </div>
              <SkeletonBlock className="mt-4 h-8 w-28" />
              <SkeletonBlock className="mt-4 h-2 w-full" />
              <SkeletonBlock className="mt-3 h-4 w-14" />
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <SkeletonBlock className="h-6 w-36" />
            <SkeletonBlock className="mt-5 h-24 w-full" />
            <SkeletonBlock className="mt-4 h-20 w-full" />
            <SkeletonBlock className="mt-3 h-20 w-full" />
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <SkeletonBlock className="h-6 w-28" />
            <SkeletonBlock className="mt-5 h-40 w-full" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardState | null>(null);
  const dataRef = useRef<DashboardState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState("");
  const [expandedFcnKey, setExpandedFcnKey] = useState<string | null>(null);

  const loadPortfolioNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError("");

    try {
      const news = await getPortfolioNews();
      setData((current) => {
        if (!current) return current;
        const nextData = { ...current, news };
        dataRef.current = nextData;
        return nextData;
      });
    } catch (err) {
      setNewsError(err instanceof Error ? err.message : "Failed to load intelligence feed");
    } finally {
      setNewsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async (showLoading = false) => {
    const hasExistingData = Boolean(dataRef.current);

    if (showLoading || !hasExistingData) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      setError("");
      const newsPromise = getPortfolioNews()
        .then((news) => ({ news, error: "" }))
        .catch((err) => ({
          news: null,
          error: err instanceof Error ? err.message : "Failed to load intelligence feed",
        }));
      const [summary, allocation, risk, stocks, fcns, crypto, cash, newsResult] =
        await Promise.all([
        getMySummary(),
        getMyAssetAllocation(),
        getMyRiskOverview(),
        getStocks(),
        getFcns(),
        getCrypto(),
        getCash(),
        newsPromise,
      ]);
      const nextData = {
        summary,
        allocation,
        risk,
        stocks: Array.isArray(stocks) ? stocks : [],
        fcns: Array.isArray(fcns) ? fcns : [],
        crypto: Array.isArray(crypto) ? crypto : [],
        cash: Array.isArray(cash) ? cash : [],
        news: newsResult.news,
      };
      setNewsError(newsResult.error);
      dataRef.current = nextData;
      setData(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard 載入失敗。");
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  if (loading && !data) return <DashboardSkeleton />;

  if (error && !data) {
    return (
      <main className="min-h-screen bg-black px-5 py-8 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
          <div className="w-full rounded-2xl border border-red-500/50 bg-red-500/10 p-8 text-center shadow-xl shadow-red-950/20">
            <div className="text-sm font-semibold uppercase tracking-wide text-red-300">
              Dashboard Error
            </div>
            <h1 className="mt-3 text-2xl font-bold text-white">
              Failed to load dashboard
            </h1>
            <p className="mt-3 text-sm leading-6 text-red-100">{error}</p>
            <button
              className="mt-6 rounded-xl border border-red-300/60 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"
              onClick={() => void loadDashboard(true)}
              type="button"
            >
              Retry
            </button>
          </div>
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
  const newsArticles = listValue(data.news?.articles).slice(0, 6);
  const riskLevel = data.risk.risk_level || data.summary.risk_level || "unknown";
  const totalValue = data.summary.total_value ?? data.allocation.total_value;
  const hasPortfolioAssets =
    stocks.length > 0 ||
    fcns.length > 0 ||
    crypto.length > 0 ||
    cash.length > 0;

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
            {refreshing && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                Refreshing
              </div>
            )}
            <button
              className="w-full rounded-xl border border-blue-400/50 px-4 py-3 text-center text-sm font-semibold text-blue-200 transition hover:bg-blue-400/10 md:w-auto"
              onClick={() => router.push("/import")}
              type="button"
            >
              Import CSV
            </button>
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

        {error && (
          <section className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold text-white">Failed to load dashboard</div>
                <div className="mt-1 text-red-100/80">{error}</div>
              </div>
              <button
                className="rounded-xl border border-red-300/60 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"
                onClick={() => void loadDashboard(false)}
                type="button"
              >
                Retry
              </button>
            </div>
          </section>
        )}

        {!hasPortfolioAssets && (
          <section className="rounded-2xl border border-dashed border-emerald-400/50 bg-emerald-400/10 p-8 text-center shadow-xl shadow-emerald-950/10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/40 bg-black/30 text-3xl">
              +
            </div>
            <h2 className="mt-5 text-2xl font-bold text-white">
              No portfolio positions yet
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-300">
              Add positions manually or import a CSV portfolio template.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                className="rounded-xl border border-emerald-400/60 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/10"
                href="/input"
              >
                Go to Input
              </Link>
              <Link
                className="rounded-xl border border-blue-400/60 px-5 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/10"
                href="/import"
              >
                Go to Import
              </Link>
            </div>
          </section>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Portfolio Intelligence</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Latest news related to your holdings and FCN underlyings
              </p>
            </div>
            <button
              className="w-fit rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900"
              disabled={newsLoading}
              onClick={() => void loadPortfolioNews()}
              type="button"
            >
              {newsLoading ? "Loading" : "Retry"}
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-300">
            {newsLoading && !data.news ? (
              <div className="text-zinc-400">Loading intelligence feed...</div>
            ) : newsError ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-yellow-200">Failed to load intelligence feed</div>
                <button
                  className="w-fit rounded-lg border border-yellow-400/50 px-3 py-2 text-xs font-semibold text-yellow-100 transition hover:bg-yellow-400/10"
                  onClick={() => void loadPortfolioNews()}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>{textValue(data.news?.summary, "No portfolio news found yet")}</div>
                {data.news?.fetched_at && (
                  <div className="text-xs text-zinc-500">
                    fetched {formatDateTime(data.news.fetched_at)}
                  </div>
                )}
              </div>
            )}
          </div>

          {!newsError && !newsLoading && newsArticles.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">
              No portfolio news found yet
            </div>
          )}

          {newsArticles.length > 0 && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {newsArticles.map((article: NewsArticle, index) => (
                <article
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                  key={`${textValue(article.link || article.title, "news")}-${index}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                      {textValue(article.symbol, "NEWS")}
                    </span>
                    <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-semibold uppercase text-zinc-300">
                      {textValue(article.source, "yfinance")}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold leading-6 text-white">
                    {textValue(article.title, "Untitled news")}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span>{textValue(article.publisher, "Unknown publisher")}</span>
                    <span>·</span>
                    <span>{formatDateTime(article.published_at)}</span>
                  </div>
                  {article.link && (
                    <a
                      className="mt-3 inline-flex text-xs font-semibold text-emerald-300 transition hover:text-emerald-200"
                      href={article.link}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      View link ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">FCN Risk Monitor</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Worst-of、KI/KO distance 與到期監控。
              </p>
            </div>
            <span className="w-fit rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-400">
              {fcns.length} FCN
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[1.4fr_1fr_0.8fr_1fr_0.9fr_0.9fr_0.8fr_1fr_0.7fr] gap-3 bg-zinc-900 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <div>FCN</div>
                <div>Notional</div>
                <div>Risk</div>
                <div>Worst-of</div>
                <div>KI Distance</div>
                <div>KO Distance</div>
                <div>Days</div>
                <div>Next Coupon</div>
                <div>Expand</div>
              </div>

              {fcns.length === 0 && (
                <div className="px-4 py-5 text-sm text-zinc-400">
                  No FCN positions yet.
                </div>
              )}

              {fcns.map((fcn, index) => {
                const key = positionKey(fcn) || `fcn-${index}`;
                const expanded = expandedFcnKey === key;
                const kiDistance =
                  fcn.distance_to_KI || fcn.distance_to_ki || fcn.distance_to_ki_pct;
                const koDistance =
                  fcn.distance_to_KO || fcn.distance_to_ko || fcn.distance_to_ko_pct;
                const worstOf = textValue(
                  fcn.worst_underlying || fcn.worst_symbol || fcn.worst_of,
                );

                return (
                  <div className="border-t border-zinc-800" key={key}>
                    <button
                      className={`grid w-full grid-cols-[1.4fr_1fr_0.8fr_1fr_0.9fr_0.9fr_0.8fr_1fr_0.7fr] gap-3 px-4 py-3 text-left text-sm transition ${
                        expanded ? "bg-emerald-400/5" : "bg-black/20 hover:bg-zinc-900/70"
                      }`}
                      onClick={() => setExpandedFcnKey(expanded ? null : key)}
                      type="button"
                    >
                      <div className="font-semibold text-white">
                        {textValue(fcn.fcn_code || fcn.name || fcn.code, "FCN")}
                      </div>
                      <div className="text-zinc-300">{money(fcn.notional_amount || fcn.notional)}</div>
                      <div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${riskBadgeClass(fcn.risk_level)}`}
                        >
                          {textValue(fcn.risk_level, "unknown")}
                        </span>
                      </div>
                      <div className="text-zinc-300">{worstOf}</div>
                      <div className={`font-semibold ${kiDistanceClass(kiDistance)}`}>
                        {percentValue(kiDistance)}
                      </div>
                      <div className="text-zinc-300">{percentValue(koDistance)}</div>
                      <div className="text-zinc-300">{textValue(fcn.days_to_maturity)}</div>
                      <div className="text-zinc-300">{textValue(fcn.next_coupon_date)}</div>
                      <div className="font-semibold text-emerald-300">
                        {expanded ? "Hide" : "Open"}
                      </div>
                    </button>

                    {expanded && (
                      <div className="bg-black/30 px-4 pb-4 pt-1">
                        <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300 md:grid-cols-2">
                          <div>Issuer: {textValue(fcn.issuer)}</div>
                          <div>
                            Tenor: {tenorText(fcn.tenor_months)} · Currency:{" "}
                            {textValue(fcn.settlement_currency)}
                          </div>
                          <div>Maturity: {textValue(fcn.maturity_date)}</div>
                          <div>Next observation: {textValue(fcn.next_observation_date)}</div>
                        </div>

                        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
                          <div className="grid grid-cols-4 gap-3 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase text-zinc-500">
                            <div>Symbol</div>
                            <div>Current</div>
                            <div>Performance</div>
                            <div>Source</div>
                          </div>
                          {fcnUnderlyingList(fcn).length === 0 && (
                            <div className="px-3 py-3 text-sm text-zinc-400">
                              Underlyings: {fcnUnderlyingsLabel(fcn)}
                            </div>
                          )}
                          {fcnUnderlyingList(fcn).map((underlying, underlyingIndex) => (
                            <div
                              className="grid grid-cols-4 gap-3 border-t border-zinc-800 px-3 py-2 text-sm text-zinc-300"
                              key={`${textValue(underlying.symbol, "underlying")}-${underlyingIndex}`}
                            >
                              <div className="font-semibold text-white">
                                {textValue(underlying.symbol, "UNDERLYING")}
                              </div>
                              <div>{priceMoney(underlying.current_price)}</div>
                              <div>
                                {percentValue(
                                  underlying.performance ||
                                    underlying.distance_to_KI ||
                                    underlying.distance_to_ki_pct,
                                )}
                              </div>
                      <div className="text-zinc-500">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{textValue(underlying.price_source, "-")}</span>
                                  <PriceSourceBadge
                                    isStale={underlying.is_stale}
                                    source={underlying.price_source}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span>{priceSource(stock.price_source)}</span>
                          <PriceSourceBadge
                            isStale={stock.is_stale}
                            source={stock.price_source}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={positionCardClass()}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">FCN</h3>
                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                  {fcns.length}
                </span>
              </div>
              <div className="mt-4 rounded-lg border border-zinc-800 bg-black/30 p-3">
                {fcns.length === 0 ? (
                  <div className="text-sm text-zinc-400">尚無 FCN 部位</div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-zinc-300">
                      {fcns.length} FCN positions · Exposure{" "}
                      {money(
                        fcns.reduce(
                          (sum, fcn) =>
                            sum + numberValue(fcn.notional_amount || fcn.notional, 0),
                          0,
                        ),
                      )}
                    </div>
                    <div className="text-xs leading-5 text-zinc-500">
                      See FCN Risk Monitor for worst-of, KI/KO distance and underlying
                      details.
                    </div>
                  </div>
                )}
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
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span>{cryptoPriceSource(item)}</span>
                          <PriceSourceBadge
                            inputEstimate={cryptoPriceSource(item).includes("input estimate")}
                            isStale={item.is_stale}
                            source={item.price_source}
                          />
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
