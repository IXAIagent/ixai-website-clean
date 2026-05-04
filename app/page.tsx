"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch, getToken, logout } from "./lib/api";

type DashboardRecord = Record<string, unknown>;

type AlertItem = {
  message?: unknown;
  title?: unknown;
};

type AllocationItem = {
  asset?: unknown;
  label?: unknown;
  weight?: unknown;
  percent?: unknown;
};

type StockItem = {
  symbol?: unknown;
  pnl?: unknown;
  current_value?: unknown;
};

type CashItem = {
  currency?: unknown;
  amount?: unknown;
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
  pnl?: unknown;
  current_value?: unknown;
};

type SummaryCard = {
  label?: unknown;
  title?: unknown;
  value?: unknown;
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

export default function Page() {
  const [data, setData] = useState<DashboardRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"loading" | "user" | "demo">("loading");

  useEffect(() => {
    let active = true;

    async function load() {
      const token = getToken();
      setError(null);

      if (token) {
        try {
          const userSummary = await apiFetch<unknown>("/api/v1/dashboard/dev-real-summary");
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
        setError(errorMessage(err, "Failed to load dashboard demo."));
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const allocation = asArray<AllocationItem>(data?.allocation);
  const stockPositions = asArray<StockItem>(data?.stock_positions);
  const cashPositions = asArray<CashItem>(
    data?.cash_positions ?? data?.cash_summary,
  );
  const fcnItems = asOneOrMany<FcnItem>(
    data?.fcn_analysis ?? data?.fcn_positions ?? data?.fcn_summary,
  );
  const cryptoPositions = asArray<CryptoItem>(data?.crypto_positions);
  const alerts = asArray<AlertItem>(data?.alerts ?? data?.latest_alerts);
  const riskSources = asArray<unknown>(data?.risk_sources);
  const cards = asArray<SummaryCard>(data?.cards ?? data?.decision_cards);

  if (!data && !error) {
    return (
      <main style={{ padding: 40 }}>
        <h1>IXAI Dashboard</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>IXAI Dashboard</h1>
      <p>Mode: {mode === "user" ? "User dashboard" : "Demo dashboard"}</p>

      {error && (
        <section>
          <h2>API Error</h2>
          <p style={{ color: "red" }}>{error}</p>
        </section>
      )}

      <section>
        <h2>Alerts</h2>
        {alerts.length === 0 ? (
          <p>No alerts</p>
        ) : (
          alerts.map((alert, index) => (
            <div key={`${text(alert.title, "alert")}-${index}`}>
              {text(alert.message ?? alert.title)}
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Allocation</h2>
        {allocation.length === 0 ? (
          <p>No allocation</p>
        ) : (
          allocation.map((item, index) => (
            <div key={`${text(item.asset ?? item.label, "asset")}-${index}`}>
              {text(item.asset ?? item.label)}: {text(item.weight ?? item.percent, "0")}%
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Stocks</h2>
        {stockPositions.length === 0 ? (
          <p>No stock positions</p>
        ) : (
          stockPositions.map((stock, index) => (
            <div key={`${text(stock.symbol, "stock")}-${index}`}>
              {text(stock.symbol, "STOCK")} - {text(stock.pnl ?? stock.current_value, "0")}
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Cash</h2>
        {cashPositions.length === 0 ? (
          <p>No cash</p>
        ) : (
          cashPositions.map((cash, index) => (
            <div key={`${text(cash.currency, "cash")}-${index}`}>
              {text(cash.currency, "Cash")}: {text(cash.amount, "0")}
            </div>
          ))
        )}
      </section>

      <section>
        <h2>FCN</h2>
        {fcnItems.length === 0 ? (
          <p>No FCN positions</p>
        ) : (
          fcnItems.map((fcn, index) => (
            <div key={`${text(fcn.fcn_code ?? fcn.code ?? fcn.name, "fcn")}-${index}`}>
              {text(fcn.name ?? fcn.fcn_code ?? fcn.code, "FCN")} | Worst:{" "}
              {text(fcn.worst_symbol ?? fcn.worst_of_symbol ?? fcn.worst_of)} | KI
              dist:{" "}
              {text(
                fcn.distance_to_KI ??
                  fcn.distance_to_ki ??
                  fcn.distance_to_ki_pct,
              )}{" "}
              | Risk: {text(fcn.risk_level, "unknown")}
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Crypto</h2>
        {cryptoPositions.length === 0 ? (
          <p>No crypto</p>
        ) : (
          cryptoPositions.map((crypto, index) => (
            <div key={`${text(crypto.symbol, "crypto")}-${index}`}>
              {text(crypto.symbol, "CRYPTO")} -{" "}
              {text(crypto.pnl ?? crypto.current_value, "0")}
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Risk Sources</h2>
        {riskSources.length === 0 ? (
          <p>No risks</p>
        ) : (
          riskSources.map((source, index) => (
            <div key={`risk-${index}`}>{text(source, JSON.stringify(source))}</div>
          ))
        )}
      </section>

      <section>
        <h2>Summary Cards</h2>
        {cards.length === 0 ? (
          <p>No summary</p>
        ) : (
          cards.map((card, index) => (
            <div key={`${text(card.label ?? card.title, "card")}-${index}`}>
              {text(card.label ?? card.title)}: {text(card.value)}
            </div>
          ))
        )}
      </section>

      <button
        onClick={() => {
          logout();
          location.href = "/login";
        }}
        style={{ marginTop: 20 }}
        type="button"
      >
        Logout
      </button>
    </main>
  );
}
