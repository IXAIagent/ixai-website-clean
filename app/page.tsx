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
  distance_to_KI?: number | string | null;
  distance_to_KO?: number | string | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_ko_pct?: number | string | null;
  risk_level?: string | null;
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
        let res: unknown;

        try {
          res = await apiFetch("/api/v1/dashboard/my-summary");
        } catch {
          res = await apiFetch("/api/v1/dashboard/dev-real-summary");
        }

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
  const fcn = oneOrMany(data.fcn_analysis).length
    ? oneOrMany(data.fcn_analysis)
    : arrayValue(data.fcn_positions);
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
            className="border rounded-xl p-4 shadow-sm bg-white"
          >
            <div className="text-sm text-gray-500">
              {textValue(c.title || c.label)}
            </div>
            <div className="text-xl font-semibold">
              {textValue(c.value ?? c.message)}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-semibold mb-2">AI Summary</h2>
        <div className="border rounded-xl p-4 bg-white shadow-sm space-y-1">
          <div>Risk: {textValue(data.risk_level, "Unknown")}</div>
          <div>Top Risk: {textValue(data.top_risk, "None")}</div>
          <div>{textValue(data.ai_advice, "No AI advice")}</div>
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
          {stocks.length === 0 && <div>No stock positions</div>}
          {stocks.map((s, i) => (
            <div
              key={`${textValue(s.id || s.symbol, "stock")}-${i}`}
              className="border rounded-xl p-4 bg-white shadow-sm"
            >
              <div className="text-sm text-gray-500">{textValue(s.symbol)}</div>
              <div className="text-lg font-semibold">
                Current: {money(s.current_price)}
              </div>
              <div className="text-sm text-gray-600">
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
          {cash.length === 0 && <div>No cash positions</div>}
          {cash.map((c, i) => (
            <div
              key={`${textValue(c.id || c.currency, "cash")}-${i}`}
              className="border rounded-xl p-4 bg-white shadow-sm"
            >
              <div className="text-sm text-gray-500">
                {textValue(c.currency, "Cash")}
              </div>
              <div className="text-lg font-semibold">{money(c.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Crypto */}
      <div>
        <h2 className="font-semibold mb-2">Crypto</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {crypto.length === 0 && <div>No crypto positions</div>}
          {crypto.map((c, i) => (
            <div
              key={`${textValue(c.id || c.symbol, "crypto")}-${i}`}
              className="border rounded-xl p-4 bg-white shadow-sm"
            >
              <div className="text-sm text-gray-500">
                {textValue(c.symbol)} · {textValue(c.asset_type, "crypto")}
              </div>
              <div className="text-lg font-semibold">
                Current: {money(c.current_price)}
              </div>
              <div className="text-sm text-gray-600">
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

        <div className="space-y-4">
          {fcn.map((item, i) => {
            const underlyings =
              item.underlying_results || item.prices || [];

            return (
              <div
                key={`${textValue(item.fcn_id || item.id || item.fcn_code || item.code, "fcn")}-${i}`}
                className="border rounded-xl p-4 bg-white shadow-sm"
              >
                <div className="font-semibold mb-2">
                  {textValue(item.name || item.fcn_code || item.code, `FCN ${i + 1}`)}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Worst:{" "}
                  {textValue(
                    item.worst_symbol || item.worst_of_symbol || item.worst_of,
                    "N/A",
                  )}
                </div>

                {/* Underlyings */}
                <div className="flex gap-4 flex-wrap mb-2">
                  {underlyings.map((u, j) => (
                    <div
                      key={`${textValue(u.symbol, "underlying")}-${j}`}
                      className="text-sm border px-2 py-1 rounded"
                    >
                      {textValue(u.symbol)}
                    </div>
                  ))}
                </div>

                <div className="text-sm text-gray-600">
                  KI Distance:{" "}
                  {percent(item.distance_to_KI ?? item.distance_to_ki_pct)}
                </div>

                <div className="text-sm text-gray-600">
                  KO Distance:{" "}
                  {percent(item.distance_to_KO ?? item.distance_to_ko_pct)}
                </div>

                <div className="text-sm mt-1">
                  Risk:{" "}
                  <span className="font-semibold">
                    {textValue(item.risk_level, "Unknown")}
                  </span>
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
          <div className="border p-3 rounded">Backend: Live</div>
          <div className="border p-3 rounded">Frontend: Connected</div>
          <div className="border p-3 rounded">
            Data: {textValue(data.mode, "unknown")}
          </div>
        </div>
      </div>
    </div>
  );
}
