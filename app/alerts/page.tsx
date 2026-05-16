"use client";

import { useEffect, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import { getMyRiskOverview, getPortfolioPriority, NewsArticle, RiskOverviewResponse } from "../lib/api";

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export default function AlertsPage() {
  const [risk, setRisk] = useState<RiskOverviewResponse | null>(null);
  const [priority, setPriority] = useState<NewsArticle[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [riskData, priorityData] = await Promise.all([
          getMyRiskOverview(),
          getPortfolioPriority().catch(() => null),
        ]);
        setRisk(riskData);
        setPriority(Array.isArray(priorityData?.top_alerts) ? priorityData.top_alerts : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Alerts unavailable.");
      }
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AppShell title="Alerts / 警示" subtitle="Portfolio alert center skeleton.">
      <TerminalPanel title="Alerts Center" meta="compact">
        {error && <EmptyLine>{error}</EmptyLine>}
        <div className="divide-y divide-zinc-800 border border-zinc-800">
          {priority.length === 0 && (risk?.alerts || []).length === 0 && (
            <EmptyLine>SYSTEM HEALTH: CLEAR</EmptyLine>
          )}
          {priority.map((alert, index) => (
            <div className="px-3 py-2 font-mono text-xs" key={`${textValue(alert.title, "priority")}-${index}`}>
              <div className="text-yellow-300">{textValue(alert.priority_level, "LOW")} · {textValue(alert.symbol, "NEWS")}</div>
              <div className="mt-1 truncate text-zinc-400">{textValue(alert.title, "Untitled alert")}</div>
            </div>
          ))}
          {(risk?.alerts || []).map((alert, index) => (
            <div className="px-3 py-2 font-mono text-xs" key={`${textValue(alert.id || alert.title, "alert")}-${index}`}>
              <div className="text-zinc-300">{textValue(alert.severity || alert.level, "info")} · {textValue(alert.title, "Alert")}</div>
              <div className="mt-1 text-zinc-500">{textValue(alert.message, "")}</div>
            </div>
          ))}
        </div>
      </TerminalPanel>
    </AppShell>
  );
}
