"use client";

import { useEffect, useState } from "react";

import { ApiError, apiFetch, getToken, logout } from "./lib/api";

type DashboardRecord = Record<string, unknown>;

type AlertItem = {
  level?: unknown;
  severity?: unknown;
  message?: unknown;
  title?: unknown;
};

type StockItem = {
  symbol?: unknown;
  price?: unknown;
  current_price?: unknown;
  current_value?: unknown;
  pnl?: unknown;
};

type FcnItem = {
  name?: unknown;
  fcn_code?: unknown;
  code?: unknown;
  worst_symbol?: unknown;
  worst_of_symbol?: unknown;
  worst_of?: unknown;
  distance_to_KI?: unknown;
  distance_to_ki?: unknown;
  distance_to_ki_pct?: unknown;
  risk_level?: unknown;
};

type CryptoItem = {
  symbol?: unknown;
  price?: unknown;
  current_price?: unknown;
  current_value?: unknown;
  pnl?: unknown;
};

type SummaryCard = {
  title?: unknown;
  label?: unknown;
  value?: unknown;
  message?: unknown;
};

function asRecord(value: unknown): DashboardRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as DashboardRecord)
    : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asOneOrMany<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return [value as T];
  return [];
}

function text(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"loading" | "user" | "demo">("loading");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setError(null);

      if (getToken()) {
        try {
          const userSummary = await apiFetch<unknown>("/api/v1/dashboard/my-summary");
          if (!active) return;
          setData(asRecord(userSummary));
          setMode("user");
          return;
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            logout();
          }
          console.error("User dashboard error:", err);
        }
      }

      try {
        const demoSummary = await apiFetch<unknown>(
          "/api/v1/dashboard/dev-real-summary",
        );
        if (!active) return;
        setData(asRecord(demoSummary));
        setMode("demo");
      } catch (err) {
        if (!active) return;
        console.error("Demo dashboard error:", err);
        setData(null);
        setMode("demo");
        setError(errorMessage(err, "Failed to load dashboard."));
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const alerts = asArray<AlertItem>(data?.alerts ?? data?.latest_alerts);
  const stocks = asArray<StockItem>(data?.stocks ?? data?.stock_positions);
  const fcnItems = asOneOrMany<FcnItem>(
    data?.fcn_analysis ?? data?.fcn_positions ?? data?.fcn_summary ?? data?.fcn,
  );
  const cryptoItems = asArray<CryptoItem>(data?.crypto_positions ?? data?.crypto);
  const summaryCards = asArray<SummaryCard>(
    data?.summary_cards ?? data?.decision_cards ?? data?.cards,
  );
  const riskSources = asArray<unknown>(data?.risk_sources);

  if (!data && !error) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>IXAI Dashboard</h1>
      <p>Mode: {mode === "user" ? "User" : "Demo"}</p>

      {error && (
        <section>
          <h2>API Error</h2>
          <p style={{ color: "red" }}>{error}</p>
        </section>
      )}

      <h2>Summary</h2>
      <p>{text(data?.summary ?? data?.message, "No summary")}</p>

      <h2>Alerts</h2>
      {alerts.length === 0 ? (
        <p>No alerts</p>
      ) : (
        <ul>
          {alerts.map((alert, index) => (
            <li key={`${text(alert.title ?? alert.message, "alert")}-${index}`}>
              {text(alert.level ?? alert.severity, "INFO").toUpperCase()} -{" "}
              {text(alert.message ?? alert.title)}
            </li>
          ))}
        </ul>
      )}

      <h2>Stocks</h2>
      {stocks.length === 0 ? (
        <p>No stock positions</p>
      ) : (
        <ul>
          {stocks.map((stock, index) => (
            <li key={`${text(stock.symbol, "stock")}-${index}`}>
              {text(stock.symbol, "STOCK")}: $
              {text(stock.price ?? stock.current_price ?? stock.current_value ?? stock.pnl, "0")}
            </li>
          ))}
        </ul>
      )}

      <h2>FCN</h2>
      {fcnItems.length === 0 ? (
        <p>No FCN positions</p>
      ) : (
        <ul>
          {fcnItems.map((fcn, index) => (
            <li key={`${text(fcn.fcn_code ?? fcn.code ?? fcn.name, "fcn")}-${index}`}>
              {text(fcn.name ?? fcn.fcn_code ?? fcn.code, "FCN")} | Worst:{" "}
              {text(fcn.worst_symbol ?? fcn.worst_of_symbol ?? fcn.worst_of)} | KI
              dist:{" "}
              {text(
                fcn.distance_to_KI ??
                  fcn.distance_to_ki ??
                  fcn.distance_to_ki_pct,
              )}{" "}
              | Risk: {text(fcn.risk_level, "unknown")}
            </li>
          ))}
        </ul>
      )}

      <h2>Crypto</h2>
      {cryptoItems.length === 0 ? (
        <p>No crypto positions</p>
      ) : (
        <ul>
          {cryptoItems.map((crypto, index) => (
            <li key={`${text(crypto.symbol, "crypto")}-${index}`}>
              {text(crypto.symbol, "CRYPTO")}: $
              {text(
                crypto.price ??
                  crypto.current_price ??
                  crypto.current_value ??
                  crypto.pnl,
                "0",
              )}
            </li>
          ))}
        </ul>
      )}

      <h2>Risk Sources</h2>
      {riskSources.length === 0 ? (
        <p>No risks</p>
      ) : (
        <ul>
          {riskSources.map((source, index) => (
            <li key={`risk-${index}`}>
              {typeof source === "object" ? JSON.stringify(source) : text(source)}
            </li>
          ))}
        </ul>
      )}

      <h2>Summary Cards</h2>
      {summaryCards.length === 0 ? (
        <p>No summary cards</p>
      ) : (
        <ul>
          {summaryCards.map((card, index) => (
            <li key={`${text(card.title ?? card.label, "card")}-${index}`}>
              {text(card.title ?? card.label)}: {text(card.value ?? card.message)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
