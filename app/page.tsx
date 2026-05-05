"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api";

type Alert = {
  level?: string | null;
  severity?: string | null;
  message?: string | null;
  title?: string | null;
};

type Stock = {
  id?: string | number | null;
  symbol?: string | null;
  quantity?: number | string | null;
  avg_price?: number | string | null;
  current_price?: number | string | null;
  current_value?: number | string | null;
};

type Cash = {
  id?: string | number | null;
  currency?: string | null;
  amount?: number | string | null;
};

type Crypto = {
  id?: string | number | null;
  symbol?: string | null;
  asset_type?: string | null;
  quantity?: number | string | null;
  current_price?: number | string | null;
  current_value?: number | string | null;
};

type FcnUnderlying = {
  symbol?: string | null;
  initial_price?: number | string | null;
  current_price?: number | string | null;
  performance?: number | string | null;
  price_source?: string | null;
};

type FCN = {
  id?: string | number | null;
  fcn_id?: string | number | null;
  name?: string | null;
  fcn_code?: string | null;
  code?: string | null;
  worst_symbol?: string | null;
  worst_of_symbol?: string | null;
  worst_of?: string | null;
  worst_performance?: number | string | null;
  distance_to_KI?: number | string | null;
  distance_to_KO?: number | string | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_ko_pct?: number | string | null;
  risk_level?: string | null;
  price_source?: string | null;
  underlying_results?: FcnUnderlying[] | null;
  prices?: FcnUnderlying[] | null;
  symbols?: string[] | null;
};

type SummaryCard = {
  title?: string | null;
  label?: string | null;
  value?: string | number | null;
  message?: string | null;
};

type DashboardData = {
  mode?: string | null;
  ai_advice?: string | null;
  risk_level?: string | null;
  top_risk?: string | null;
  alerts?: Alert[] | null;
  latest_alerts?: Alert[] | null;
  stock_positions?: Stock[] | null;
  stocks?: Stock[] | null;
  cash_summary?: Cash[] | null;
  crypto_positions?: Crypto[] | null;
  fcn_analysis?: FCN[] | FCN | null;
  fcn_positions?: FCN[] | null;
  fcn_summary?: FCN[] | null;
  summary_cards?: SummaryCard[] | null;
  decision_cards?: SummaryCard[] | null;
};

function isDashboardData(value: unknown): value is DashboardData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayValue<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function oneOrMany<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function money(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  if (!Number.isFinite(number)) return "-";
  return `$${number.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function percent(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  if (!Number.isFinite(number)) return "N/A";
  const normalized = Math.abs(number) <= 1 && number !== 0 ? number * 100 : number;
  return `${normalized.toFixed(1)}%`;
}

function percentNumber(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  if (!Number.isFinite(number)) return null;
  return Math.abs(number) <= 1 && number !== 0 ? number * 100 : number;
}

function riskBadgeClass(value: unknown) {
  const level = String(value || "").toLowerCase();
  if (level === "high") return "bg-red-500 text-white";
  if (level === "medium") return "bg-yellow-500 text-black";
  if (level === "low") return "bg-green-500 text-white";
  return "bg-gray-600 text-white";
}

function kiDistanceClass(value: unknown) {
  const number = percentNumber(value);
  if (number === null) return "text-gray-300";
  if (number < 5) return "text-red-500";
  if (number <= 15) return "text-yellow-400";
  return "text-green-400";
}

function performanceClass(value: unknown) {
  const number = percentNumber(value);
  if (number === null) return "text-gray-300";
  if (number < 0) return "text-red-400";
  if (number > 0) return "text-green-400";
  return "text-gray-300";
}

function uniqueAlerts(alerts: Alert[]) {
  const seen = new Set<string>();
  return alerts.filter((alert) => {
    const key = `${alert.title || ""}:${alert.message || ""}:${alert.level || alert.severity || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to fetch";
}

export default function Page() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res: unknown = await apiFetch("/api/v1/dashboard/my-summary");
        setData(isDashboardData(res) ? res : null);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!data) return <div className="p-6">No data</div>;

  const alerts = uniqueAlerts([
    ...arrayValue(data.alerts),
    ...arrayValue(data.latest_alerts),
  ]);
  const stocks = arrayValue(data.stock_positions).length
    ? arrayValue(data.stock_positions)
    : arrayValue(data.stocks);
  const cash = arrayValue(data.cash_summary);
  const crypto = arrayValue(data.crypto_positions);
  const fcnAnalysis = oneOrMany(data.fcn_analysis);
  const fcnPositions = arrayValue(data.fcn_positions);
  const fcnSummary = arrayValue(data.fcn_summary);
  const fcn = fcnAnalysis.length
    ? fcnAnalysis
    : fcnPositions.length
      ? fcnPositions
      : fcnSummary;
  const summaryCards = arrayValue(data.summary_cards).length
    ? arrayValue(data.summary_cards)
    : arrayValue(data.decision_cards);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">IXAI Dashboard</h1>

      {/* ✅ Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c, i) => (
          <div
            key={`${textValue(c.title || c.label, "card")}-${i}`}
            className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white shadow-xl"
          >
            <div className="text-sm text-gray-300">
              {textValue(c.title || c.label)}
            </div>
            <div className="text-xl font-semibold text-white">
              {textValue(c.value ?? c.message)}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-semibold mb-2">AI Summary</h2>
        <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white shadow-xl">
          <div className="text-gray-300">
            Risk:{" "}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${riskBadgeClass(data.risk_level)}`}
            >
              {textValue(data.risk_level, "Unknown")}
            </span>
          </div>
          <div className="text-gray-300">
            Top Risk:{" "}
            <span className={data.risk_level === "low" ? "text-green-400" : "text-red-400"}>
              {textValue(data.top_risk, "None")}
            </span>
          </div>
          <div className="leading-7 text-gray-300">
            {textValue(data.ai_advice, "No AI advice")}
          </div>
        </div>
      </div>

      {/* 🚨 Alerts */}
      <div>
        <h2 className="font-semibold mb-2">Alerts</h2>
        <div className="space-y-2">
          {alerts.length === 0 && <div>No alerts</div>}
          {alerts.map((a, i) => {
            const level = textValue(a.level || a.severity, "low").toLowerCase();
            return (
              <div
                key={`${textValue(a.title || a.message, "alert")}-${i}`}
                className={`p-3 rounded-lg text-white ${
                  level === "high"
                    ? "bg-red-500"
                    : level === "medium"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
              >
                {level.toUpperCase()} - {textValue(a.message || a.title)}
              </div>
            );
          })}
        </div>
      </div>

      {/* 📊 Stocks */}
      <div>
        <h2 className="font-semibold mb-2">Stocks</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stocks.length === 0 && <div className="text-gray-400">No stock positions</div>}
          {stocks.map((s, i) => (
            <div
              key={`${textValue(s.id || s.symbol, "stock")}-${i}`}
              className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-gray-300 shadow-xl"
            >
              <div className="text-sm font-semibold text-white">{textValue(s.symbol)}</div>
              <div className="text-lg font-semibold text-emerald-400">
                Current: {money(s.current_price)}
              </div>
              <div className="text-sm text-gray-300">
                Value: {money(s.current_value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cash */}
      <div>
        <h2 className="font-semibold mb-2">Cash</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cash.length === 0 && <div className="text-gray-400">No cash positions</div>}
          {cash.map((c, i) => (
            <div
              key={`${textValue(c.id || c.currency, "cash")}-${i}`}
              className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-gray-300 shadow-xl"
            >
              <div className="text-sm text-gray-300">
                {textValue(c.currency, "Cash")}
              </div>
              <div className="text-lg font-semibold text-white">{money(c.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Crypto */}
      <div>
        <h2 className="font-semibold mb-2">Crypto</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {crypto.length === 0 && <div className="text-gray-400">No crypto positions</div>}
          {crypto.map((c, i) => (
            <div
              key={`${textValue(c.id || c.symbol, "crypto")}-${i}`}
              className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-gray-300 shadow-xl"
            >
              <div className="text-sm font-semibold text-white">
                {textValue(c.symbol)} · {textValue(c.asset_type, "crypto")}
              </div>
              <div className="text-lg font-semibold text-emerald-400">
                Current: {money(c.current_price)}
              </div>
              <div className="text-sm text-gray-300">
                Value: {money(c.current_value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🧨 FCN */}
      <div>
        <h2 className="font-semibold mb-2">FCN</h2>

        {fcn.length === 0 && <div>No FCN positions</div>}

        <div className="space-y-6">
          {fcn.map((item, i) => {
            const underlyingResults = arrayValue(item.underlying_results);
            const priceResults = arrayValue(item.prices);
            const underlyings = underlyingResults.length
              ? underlyingResults
              : priceResults;
            const worstSymbol = textValue(
              item.worst_symbol || item.worst_of_symbol || item.worst_of,
              "N/A",
            );
            const worstPerformance = percent(item.worst_performance);
            const kiDistance = item.distance_to_KI ?? item.distance_to_ki_pct;
            const riskLevel = textValue(item.risk_level, "unknown");

            return (
              <div
                key={`${textValue(item.fcn_id || item.id || item.fcn_code || item.code, "fcn")}-${i}`}
                className="relative rounded-xl border border-gray-800 bg-zinc-900 p-6 text-gray-200 shadow-xl"
              >
                <div className="pr-24 text-base font-semibold text-white">
                  {textValue(item.fcn_code || item.code || item.name, `FCN ${i + 1}`)}
                </div>
                <div
                  className={`absolute right-6 top-6 rounded-full px-3 py-1 text-xs font-semibold uppercase ${riskBadgeClass(item.risk_level)}`}
                >
                  {riskLevel}
                </div>

                <div className="mt-4 text-lg font-semibold text-gray-100">
                  ⚠️ Worst-of:{" "}
                  <span className="text-red-400">
                    {worstSymbol} ({worstPerformance})
                  </span>
                </div>

                {/* Underlyings */}
                <div className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {underlyings.map((u, j) => (
                    <div
                      key={`${textValue(u.symbol, "underlying")}-${j}`}
                      className="rounded-lg bg-gray-800 p-3 text-sm shadow-sm"
                    >
                      <div className="font-semibold text-white">
                        {textValue(u.symbol)}
                      </div>
                      <div className="mt-2 text-gray-300">
                        Current: {money(u.current_price)}
                      </div>
                      <div className={performanceClass(u.performance)}>
                        Perf: {percent(u.performance)}
                      </div>
                      <div className="text-gray-400">
                        Source: {textValue(u.price_source, "unknown")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`text-sm font-semibold ${kiDistanceClass(kiDistance)}`}>
                  KI Distance:{" "}
                  {percent(kiDistance)}
                </div>

                <div className="text-sm text-gray-300">
                  KO Distance:{" "}
                  {percent(item.distance_to_KO ?? item.distance_to_ko_pct)}
                </div>

                <div className="mt-1 text-sm text-gray-300">
                  Price Source: {textValue(item.price_source, "unknown")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ⚙️ System */}
      <div>
        <h2 className="font-semibold mb-2">System</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-gray-300 shadow-xl">
            Backend: Live
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-gray-300 shadow-xl">
            Frontend: Connected
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-gray-300 shadow-xl">
            Data: {textValue(data.mode, "unknown")}
          </div>
        </div>
      </div>
    </div>
  );
}
