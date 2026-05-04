"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api";

type Alert = {
  level: string;
  message: string;
};

type Stock = {
  symbol: string;
  price: number;
};

type FCN = any;

type SummaryCard = {
  title: string;
  value: string;
};

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        let res;

        try {
          // 有 token → 真資料
          res = await apiFetch("/api/v1/dashboard/my-summary");
        } catch {
          // fallback → demo
          res = await apiFetch("/api/v1/dashboard/dev-real-summary");
        }

        setData(res);
      } catch (e: any) {
        setError(e.message || "Failed to fetch");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!data) return <div className="p-6">No data</div>;

  const alerts: Alert[] = data.alerts || [];
  const stocks: Stock[] = data.stocks || [];
  const fcn: FCN[] = data.fcn || [];
  const summaryCards: SummaryCard[] = data.summary_cards || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">IXAI Dashboard</h1>

      {/* ✅ Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c, i) => (
          <div
            key={i}
            className="border rounded-xl p-4 shadow-sm bg-white"
          >
            <div className="text-sm text-gray-500">{c.title}</div>
            <div className="text-xl font-semibold">{c.value}</div>
          </div>
        ))}
      </div>

      {/* 🚨 Alerts */}
      <div>
        <h2 className="font-semibold mb-2">Alerts</h2>
        <div className="space-y-2">
          {alerts.length === 0 && <div>No alerts</div>}
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg text-white ${
                a.level === "high"
                  ? "bg-red-500"
                  : a.level === "medium"
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
            >
              {a.level.toUpperCase()} - {a.message}
            </div>
          ))}
        </div>
      </div>

      {/* 📊 Stocks */}
      <div>
        <h2 className="font-semibold mb-2">Stocks</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stocks.length === 0 && <div>No stock positions</div>}
          {stocks.map((s, i) => (
            <div
              key={i}
              className="border rounded-xl p-4 bg-white shadow-sm"
            >
              <div className="text-sm text-gray-500">{s.symbol}</div>
              <div className="text-lg font-semibold">${s.price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 🧨 FCN */}
      <div>
        <h2 className="font-semibold mb-2">FCN</h2>

        {fcn.length === 0 && <div>No FCN positions</div>}

        <div className="space-y-4">
          {fcn.map((item: any, i: number) => {
            const underlyings =
              item.underlying_results ||
              item.underlyings ||
              [];

            return (
              <div
                key={i}
                className="border rounded-xl p-4 bg-white shadow-sm"
              >
                <div className="font-semibold mb-2">
                  {item.name || `FCN ${i + 1}`}
                </div>

                {/* Underlyings */}
                <div className="flex gap-4 flex-wrap mb-2">
                  {Array.isArray(underlyings) &&
                    underlyings.map((u: any, j: number) => (
                      <div
                        key={j}
                        className="text-sm border px-2 py-1 rounded"
                      >
                        {u.symbol || u}
                      </div>
                    ))}
                </div>

                <div className="text-sm text-gray-600">
                  KI Distance: {item.distance_to_ki_pct ?? "N/A"}%
                </div>

                <div className="text-sm text-gray-600">
                  KO Distance: {item.distance_to_ko_pct ?? "N/A"}%
                </div>

                <div className="text-sm mt-1">
                  Risk:{" "}
                  <span className="font-semibold">
                    {item.risk_level || "Unknown"}
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
            Data: {data.mode || "unknown"}
          </div>
        </div>
      </div>
    </div>
  );
}