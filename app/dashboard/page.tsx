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

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function listValue<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
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
  const stocks = listValue(data.stocks);
  const fcns = listValue(data.fcns);
  const crypto = listValue(data.crypto);
  const cash = listValue(data.cash);
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
                      {textValue(stock.symbol, "STOCK")}
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-zinc-300">
                      <div>Quantity: {textValue(stock.quantity, "0")}</div>
                      <div>Avg Price: {priceMoney(stock.avg_price)}</div>
                      <div>Current Price: {priceMoney(stock.current_price)}</div>
                      <div>Current Value: {money(stock.current_value)}</div>
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
                        {textValue(fcn.name || fcn.fcn_code, "FCN")}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${riskBadgeClass(fcn.risk_level)}`}
                      >
                        {textValue(fcn.risk_level, "unknown")}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-zinc-300">
                      <div>Notional: {money(fcn.notional_amount || fcn.notional)}</div>
                      <div>Underlyings: {underlyingsText(fcn.underlyings)}</div>
                      <div>KI Level: {textValue(fcn.ki_level)}</div>
                      <div>KO Level: {textValue(fcn.ko_level)}</div>
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
                      {textValue(item.symbol, "CRYPTO")}
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-zinc-300">
                      <div>Type: {textValue(item.asset_type, "crypto")}</div>
                      <div>Quantity: {textValue(item.quantity, "0")}</div>
                      <div>Avg Price: {priceMoney(item.avg_price)}</div>
                      <div>Current Price: {priceMoney(item.current_price)}</div>
                      <div>Leverage: {textValue(item.leverage, "-")}</div>
                      <div>Current Value: {money(item.current_value)}</div>
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
