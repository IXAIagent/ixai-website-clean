"use client";

import { useEffect, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  getIntelligenceTimeline,
  getPortfolioSummaryV2A,
  PortfolioSummaryV2AResponse,
  TimelineIntelligenceResponse,
} from "../lib/api";

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export default function IntelligencePage() {
  const [summary, setSummary] = useState<PortfolioSummaryV2AResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineIntelligenceResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [summaryData, timelineData] = await Promise.all([
          getPortfolioSummaryV2A().catch(() => null),
          getIntelligenceTimeline().catch(() => null),
        ]);
        setSummary(summaryData);
        setTimeline(timelineData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Intelligence workspace unavailable.");
      }
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AppShell
      title="Intelligence / AI 分析"
      subtitle="Advanced intelligence workspace foundation: timeline, explainability and drift."
    >
      <div className="space-y-4">
        {error && <EmptyLine>{error}</EmptyLine>}
        <TerminalPanel title="Timeline Intelligence" meta={timeline?.is_stale ? "building" : "active"}>
          <div className="font-mono text-xs text-zinc-300">
            {textValue(timeline?.timeline_summary, "Timeline unavailable / Waiting for scheduler history")}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {(timeline?.windows || []).map((windowItem) => (
              <div className="border border-zinc-800 bg-black/20 p-2 font-mono text-xs" key={textValue(windowItem.window)}>
                <div className="text-zinc-500">{textValue(windowItem.window).toUpperCase()}</div>
                <div className="mt-1 text-zinc-300">{textValue(windowItem.regime_evolution)}</div>
                <div className="text-zinc-500">{textValue(windowItem.risk_score_trend)}</div>
              </div>
            ))}
          </div>
        </TerminalPanel>

        <TerminalPanel title="Explainability Detail" meta="compact">
          <div className="grid gap-2 font-mono text-xs">
            <div><span className="text-zinc-600">WHY RISK:</span> {textValue(summary?.explainability?.why_risk_increased, "Pending")}</div>
            <div><span className="text-zinc-600">CHANGED:</span> {textValue(summary?.explainability?.what_changed_today, "Pending")}</div>
            <div><span className="text-zinc-600">DRIVER:</span> {textValue(summary?.explainability?.dominant_driver, "Pending")}</div>
            <div><span className="text-zinc-600">HIDDEN CORR:</span> {textValue(summary?.explainability?.hidden_correlation, "Pending")}</div>
          </div>
        </TerminalPanel>
      </div>
    </AppShell>
  );
}
