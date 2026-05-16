"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  AllocationItem,
  FCNPositionResponse,
  getIntelligenceTimeline,
  getMyAssetAllocation,
  getMyRiskOverview,
  getMySummary,
  getPortfolioPriority,
  getPortfolioSummaryV2A,
  NewsArticle,
  PortfolioPriorityResponse,
  PortfolioSummaryV2AResponse,
  RiskOverviewResponse,
  SummaryResponse,
  TimelineIntelligenceResponse,
} from "../lib/api";

type DashboardOverviewState = {
  summary: SummaryResponse | null;
  allocation: AllocationItem[];
  risk: RiskOverviewResponse | null;
  priority: PortfolioPriorityResponse | null;
  intelligenceSummary: PortfolioSummaryV2AResponse | null;
  timeline: TimelineIntelligenceResponse | null;
};

function numberValue(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function money(value: unknown) {
  return `$${numberValue(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function pct(value: unknown) {
  const parsed = numberValue(value, NaN);
  if (!Number.isFinite(parsed)) return "-";
  const normalized = Math.abs(parsed) <= 1 ? parsed * 100 : parsed;
  return `${normalized.toFixed(1)}%`;
}

function compactTime(value: unknown) {
  const text = textValue(value, "");
  if (!text) return "pending";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function riskClass(value: unknown) {
  const normalized = textValue(value, "").toLowerCase();
  if (normalized.includes("high") || normalized.includes("critical")) return "text-red-300";
  if (normalized.includes("medium") || normalized.includes("rising")) return "text-yellow-300";
  if (normalized.includes("low") || normalized.includes("fresh")) return "text-emerald-300";
  return "text-zinc-300";
}

function fcnKey(item: FCNPositionResponse, index: number) {
  return textValue(item.id || item.fcn_code || item.code || item.name, `fcn-${index}`);
}

function fcnRiskScore(item: FCNPositionResponse) {
  const risk = textValue(item.risk_level, "").toLowerCase();
  const ki = numberValue(
    item.distance_to_KI || item.distance_to_ki || item.distance_to_ki_pct,
    NaN,
  );
  const kiPct = Number.isFinite(ki) && Math.abs(ki) <= 1 ? ki * 100 : ki;
  if (risk === "high") return 100;
  if (Number.isFinite(kiPct) && kiPct < 5) return 90;
  if (risk === "medium") return 70;
  if (Number.isFinite(kiPct) && kiPct < 15) return 60;
  return 10;
}

function mergeFcns(summary: SummaryResponse | null): FCNPositionResponse[] {
  const items = [
    ...(Array.isArray(summary?.fcn_positions) ? summary.fcn_positions : []),
    ...(Array.isArray(summary?.fcn_summary) ? summary.fcn_summary : []),
    ...(Array.isArray(summary?.fcn_analysis) ? summary.fcn_analysis : []),
  ];
  const byKey = new Map<string, FCNPositionResponse>();
  items.forEach((item, index) => {
    const key = fcnKey(item, index);
    byKey.set(key, { ...byKey.get(key), ...item });
  });
  return Array.from(byKey.values()).sort((a, b) => fcnRiskScore(b) - fcnRiskScore(a));
}

function topAlertLine(alert: NewsArticle, index: number) {
  return `${textValue(alert.symbol, "NEWS")} · ${textValue(alert.priority_level, "LOW")} · ${textValue(
    alert.title,
    `Alert ${index + 1}`,
  )}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summary, allocation, risk, priority, intelligenceSummary, timeline] =
        await Promise.all([
          getMySummary(),
          getMyAssetAllocation(),
          getMyRiskOverview(),
          getPortfolioPriority().catch(() => null),
          getPortfolioSummaryV2A().catch(() => null),
          getIntelligenceTimeline().catch(() => null),
        ]);

      setData({
        summary,
        allocation: Array.isArray(allocation.items) ? allocation.items : [],
        risk,
        priority,
        intelligenceSummary,
        timeline,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard 載入失敗。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const fcns = useMemo(() => mergeFcns(data?.summary || null), [data?.summary]);
  const criticalFcns = fcns.slice(0, 5);
  const topAlerts = Array.isArray(data?.priority?.top_alerts)
    ? data.priority.top_alerts.slice(0, 5)
    : [];
  const summary = data?.summary;
  const riskLevel = data?.risk?.risk_level || summary?.risk_level || "unknown";
  const riskScore = data?.risk?.risk_score || "0";
  const confidence = numberValue(data?.timeline?.confidence ?? data?.intelligenceSummary?.intelligence_confidence, NaN);
  const isStale = data?.timeline?.is_stale === true || data?.intelligenceSummary?.is_stale === true;
  const generatedAt =
    data?.intelligenceSummary?.generated_at || data?.timeline?.generated_at || "";
  const overviewLine =
    data?.intelligenceSummary?.drift_summary ||
    data?.risk?.ai_advice ||
    summary?.ai_advice ||
    "目前 intelligence history 仍在累積，先以現有風險與資產配置保守判讀。";

  return (
    <AppShell
      title="Dashboard / 投資總覽"
      subtitle="P0 portfolio overview: risk, allocation, critical FCN watch and scheduler memory."
    >
      {loading && !data ? (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div className="h-24 animate-pulse border border-zinc-800 bg-zinc-900" key={item} />
          ))}
        </div>
      ) : error && !data ? (
        <TerminalPanel title="Dashboard Error" meta="fallback">
          <div className="text-sm text-red-200">{error}</div>
          <button
            className="mt-3 border border-red-400/50 px-3 py-2 text-xs text-red-100"
            onClick={() => void loadDashboard()}
            type="button"
          >
            Retry
          </button>
        </TerminalPanel>
      ) : (
        <div className="space-y-4">
          <TerminalPanel title="今日總結 / AI Overview" meta="P0">
            <div className="border-l border-emerald-400/40 bg-black/30 px-3 py-2 font-mono text-sm leading-6 text-zinc-300">
              {overviewLine}
            </div>
            <div className="mt-3 grid gap-2 font-mono text-xs md:grid-cols-3">
              <div>
                <span className="text-zinc-600">DOMINANT RISK</span>
                <div className={riskClass(data?.intelligenceSummary?.dominant_risk)}>
                  {textValue(data?.intelligenceSummary?.dominant_risk || data?.risk?.top_risk || summary?.top_risk, "No dominant risk")}
                </div>
              </div>
              <div>
                <span className="text-zinc-600">WHAT CHANGED</span>
                <div className="text-zinc-300">
                  {textValue(data?.intelligenceSummary?.explainability?.what_changed_today, "Waiting for scheduler history")}
                </div>
              </div>
              <div>
                <span className="text-zinc-600">SYSTEMIC</span>
                <div className="text-zinc-300">
                  {textValue(data?.intelligenceSummary?.explainability?.systemic_risk, "No systemic cluster detected")}
                </div>
              </div>
            </div>
          </TerminalPanel>

          <section className="grid gap-3 lg:grid-cols-4">
            <div className="border border-zinc-800 bg-zinc-950 p-3">
              <div className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">Regime</div>
              <div className="mt-2 text-xl font-semibold text-zinc-100">
                {textValue(data?.intelligenceSummary?.regime, "BUILDING")}
              </div>
            </div>
            <div className="border border-zinc-800 bg-zinc-950 p-3">
              <div className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">Risk</div>
              <div className={`mt-2 text-xl font-semibold ${riskClass(riskLevel)}`}>
                {textValue(riskLevel)} · {textValue(riskScore)}
              </div>
            </div>
            <div className="border border-zinc-800 bg-zinc-950 p-3">
              <div className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">Confidence</div>
              <div className={Number.isFinite(confidence) && confidence >= 45 ? "mt-2 text-xl font-semibold text-emerald-300" : "mt-2 text-xl font-semibold text-yellow-300"}>
                {Number.isFinite(confidence) ? `${confidence.toFixed(0)}%` : "pending"}
              </div>
            </div>
            <div className="border border-zinc-800 bg-zinc-950 p-3">
              <div className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">Memory</div>
              <div className={isStale ? "mt-2 text-xl font-semibold text-yellow-300" : "mt-2 text-xl font-semibold text-emerald-300"}>
                {isStale ? "STALE / BUILDING" : "FRESH"}
              </div>
            </div>
          </section>

          <TerminalPanel title="Asset Allocation" meta={money(summary?.total_value)}>
            <div className="grid gap-2 md:grid-cols-4">
              {data?.allocation.map((item) => (
                <div className="border border-zinc-800 bg-black/20 p-3" key={item.asset_class}>
                  <div className="font-mono text-[11px] uppercase text-zinc-500">
                    {item.asset_class}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-zinc-100">{money(item.value)}</div>
                  <div className="mt-1 font-mono text-xs text-zinc-500">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
              {data?.allocation.length === 0 && <EmptyLine>No allocation data yet.</EmptyLine>}
            </div>
          </TerminalPanel>

          <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <TerminalPanel title="FCN Critical Watch" meta="top 5">
              <div className="divide-y divide-zinc-800 border border-zinc-800">
                {criticalFcns.length === 0 && <EmptyLine>No FCN risk items yet.</EmptyLine>}
                {criticalFcns.map((fcn, index) => {
                  const ki = fcn.distance_to_KI || fcn.distance_to_ki || fcn.distance_to_ki_pct;
                  return (
                    <div
                      className="grid gap-2 px-3 py-2 font-mono text-xs md:grid-cols-[1fr_0.8fr_0.8fr_0.8fr]"
                      key={fcnKey(fcn, index)}
                    >
                      <span className="font-semibold text-zinc-100">
                        {textValue(fcn.fcn_code || fcn.name || fcn.code, "FCN")}
                      </span>
                      <span className={riskClass(fcn.risk_level)}>{textValue(fcn.risk_level, "unknown")}</span>
                      <span className="text-zinc-400">
                        {textValue(fcn.worst_underlying || fcn.worst_symbol || fcn.worst_of, "worst-of")}
                      </span>
                      <span className={riskClass(ki)}>KI {pct(ki)}</span>
                    </div>
                  );
                })}
              </div>
              <Link className="mt-3 inline-block font-mono text-xs text-emerald-300" href="/fcn">
                Open FCN workspace →
              </Link>
            </TerminalPanel>

            <TerminalPanel title="Top Alerts" meta="compact">
              <div className="divide-y divide-zinc-800 border border-zinc-800">
                {topAlerts.length === 0 && <EmptyLine>No critical portfolio alerts.</EmptyLine>}
                {topAlerts.map((alert, index) => (
                  <div className="px-3 py-2 font-mono text-xs" key={`${textValue(alert.link || alert.title, "alert")}-${index}`}>
                    <div className={riskClass(alert.priority_level)}>
                      {topAlertLine(alert, index)}
                    </div>
                    <div className="mt-1 truncate text-zinc-500">
                      {textValue(alert.alert_summary || alert.portfolio_impact_summary, "Observation only.")}
                    </div>
                  </div>
                ))}
              </div>
              <Link className="mt-3 inline-block font-mono text-xs text-emerald-300" href="/alerts">
                Open alerts center →
              </Link>
            </TerminalPanel>
          </section>

          <TerminalPanel title="Scheduler / Memory Freshness" meta="history">
            <div className="grid gap-2 font-mono text-xs md:grid-cols-4">
              <div>
                <span className="text-zinc-600">LAST GENERATED</span>
                <div className="text-zinc-300">{compactTime(generatedAt)}</div>
              </div>
              <div>
                <span className="text-zinc-600">TIMELINE</span>
                <div className={isStale ? "text-yellow-300" : "text-emerald-300"}>
                  {textValue(data?.timeline?.message, "Waiting for scheduler history")}
                </div>
              </div>
              <div>
                <span className="text-zinc-600">30D RISK</span>
                <div className={riskClass(data?.timeline?.risk_score_trend)}>
                  {textValue(data?.timeline?.risk_score_trend, "pending")}
                </div>
              </div>
              <div>
                <span className="text-zinc-600">CONCENTRATION</span>
                <div className={riskClass(data?.timeline?.concentration_trend)}>
                  {textValue(data?.timeline?.concentration_trend, "pending")}
                </div>
              </div>
            </div>
          </TerminalPanel>
        </div>
      )}
    </AppShell>
  );
}
