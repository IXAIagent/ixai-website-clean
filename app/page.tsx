"use client";

import { useEffect, useState } from "react";
import { apiFetch, getToken, logout } from "./lib/api";

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/api/v1/dashboard/summary");
        setData(res);
      } catch (err: any) {
        console.error("Dashboard error:", err);
        setError(err.message || "Failed to load");
      }
    }
    load();
  }, []);

  // 🔥 防 404 關鍵：完全 fallback
  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h1>IXAI Dashboard</h1>
        <p style={{ color: "red" }}>Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 40 }}>
        <h1>IXAI Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  // 🔒 全部安全 fallback
  const allocation = data.allocation || [];
  const stockPositions = data.stock_positions || [];
  const cashPositions = data.cash_positions || [];
  const fcnItems = data.fcn_analysis || [];
  const cryptoPositions = data.crypto_positions || [];
  const alerts = data.alerts || [];
  const riskSources = data.risk_sources || [];
  const cards = data.cards || [];

  return (
    <div style={{ padding: 40 }}>
      <h1>IXAI Dashboard</h1>

      {/* 🔔 Alerts */}
      <section>
        <h2>Alerts</h2>
        {alerts.length === 0 ? (
          <p>No alerts</p>
        ) : (
          alerts.map((a: any, i: number) => (
            <div key={i}>⚠️ {a.message || JSON.stringify(a)}</div>
          ))
        )}
      </section>

      {/* 📊 Allocation */}
      <section>
        <h2>Allocation</h2>
        {allocation.length === 0 ? (
          <p>No allocation</p>
        ) : (
          allocation.map((a: any, i: number) => (
            <div key={i}>
              {a.asset}: {a.weight}%
            </div>
          ))
        )}
      </section>

      {/* 📈 Stocks */}
      <section>
        <h2>Stocks</h2>
        {stockPositions.length === 0 ? (
          <p>No stock positions</p>
        ) : (
          stockPositions.map((s: any, i: number) => (
            <div key={i}>
              {s.symbol} - {s.pnl || 0}
            </div>
          ))
        )}
      </section>

      {/* 💰 Cash */}
      <section>
        <h2>Cash</h2>
        {cashPositions.length === 0 ? (
          <p>No cash</p>
        ) : (
          cashPositions.map((c: any, i: number) => (
            <div key={i}>
              {c.currency}: {c.amount}
            </div>
          ))
        )}
      </section>

      {/* 🏦 FCN */}
      <section>
        <h2>FCN</h2>
        {fcnItems.length === 0 ? (
          <p>No FCN positions</p>
        ) : (
          fcnItems.map((f: any, i: number) => (
            <div key={i}>
              {f.name || "FCN"} | Worst: {f.worst_symbol || "-"} | KI dist:{" "}
              {f.distance_to_KI ?? "-"}
            </div>
          ))
        )}
      </section>

      {/* 🪙 Crypto */}
      <section>
        <h2>Crypto</h2>
        {cryptoPositions.length === 0 ? (
          <p>No crypto</p>
        ) : (
          cryptoPositions.map((c: any, i: number) => (
            <div key={i}>
              {c.symbol} - {c.pnl || 0}
            </div>
          ))
        )}
      </section>

      {/* ⚠️ Risk */}
      <section>
        <h2>Risk Sources</h2>
        {riskSources.length === 0 ? (
          <p>No risks</p>
        ) : (
          riskSources.map((r: any, i: number) => (
            <div key={i}>{r}</div>
          ))
        )}
      </section>

      {/* 📦 Cards */}
      <section>
        <h2>Summary Cards</h2>
        {cards.length === 0 ? (
          <p>No summary</p>
        ) : (
          cards.map((c: any, i: number) => (
            <div key={i}>
              {c.label}: {c.value}
            </div>
          ))
        )}
      </section>

      {/* 🔓 Logout */}
      <button
        onClick={() => {
          logout();
          location.href = "/login";
        }}
        style={{ marginTop: 20 }}
      >
        Logout
      </button>
    </div>
  );
}