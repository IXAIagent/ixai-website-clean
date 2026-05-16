"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  AlertItem,
  getMyRiskOverview,
  getPortfolioPriority,
  NewsArticle,
  RiskOverviewResponse,
} from "../lib/api";
import { useI18n } from "../lib/i18n";

const filters = ["All", "Critical", "High", "FCN", "Crypto", "Stock", "Macro"] as const;
type Filter = (typeof filters)[number];

type UnifiedAlert = {
  id: string;
  severity: string;
  category: "FCN" | "Crypto" | "Stock" | "Macro" | "Portfolio" | "System";
  symbol: string;
  title: string;
  description: string;
  timestamp?: string | null;
  source: string;
  link: "/fcn" | "/portfolio" | "/intelligence";
};

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function severityClass(value?: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("critical") || normalized.includes("high")) return "border-red-500/50 text-red-300";
  if (normalized.includes("medium") || normalized.includes("warning")) return "border-yellow-500/50 text-yellow-300";
  if (normalized.includes("low") || normalized.includes("clear")) return "border-emerald-500/50 text-emerald-300";
  return "border-zinc-700 text-zinc-400";
}

function timestamp(value?: string | null) {
  if (!value) return "time pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function categoryFromText(...values: Array<string | null | undefined>) {
  const haystack = values.join(" ").toLowerCase();
  if (haystack.includes("fcn") || haystack.includes("ki") || haystack.includes("ko")) return "FCN";
  if (haystack.includes("btc") || haystack.includes("eth") || haystack.includes("crypto")) return "Crypto";
  if (haystack.includes("cpi") || haystack.includes("fomc") || haystack.includes("rate") || haystack.includes("macro")) return "Macro";
  if (haystack.includes("stock") || haystack.includes("equity")) return "Stock";
  if (haystack.includes("system") || haystack.includes("data") || haystack.includes("stale")) return "System";
  return "Portfolio";
}

function linkFor(category: UnifiedAlert["category"]) {
  if (category === "FCN") return "/fcn";
  if (category === "System" || category === "Macro") return "/intelligence";
  return "/portfolio";
}

function fromPriority(alert: NewsArticle, index: number): UnifiedAlert {
  const category = categoryFromText(alert.symbol, alert.title, alert.alert_summary, alert.portfolio_impact_summary);
  return {
    id: `priority-${index}-${alert.link || alert.title || alert.symbol}`,
    severity: textValue(alert.priority_level || alert.attention_level || alert.relevance_level, "low"),
    category,
    symbol: textValue(alert.symbol, category),
    title: textValue(alert.title, "Portfolio priority event"),
    description: textValue(alert.alert_summary || alert.portfolio_impact_summary || alert.narrative || alert.impact_reason, "Priority signal requires monitoring."),
    timestamp: alert.published_at,
    source: "intelligence priority",
    link: linkFor(category),
  };
}

function fromRisk(alert: AlertItem, index: number): UnifiedAlert {
  const category = categoryFromText(alert.asset_class, alert.asset_ref, alert.title, alert.message);
  return {
    id: `risk-${alert.id || index}`,
    severity: textValue(alert.severity || alert.level, "low"),
    category,
    symbol: textValue(alert.asset_ref, category),
    title: textValue(alert.title, "Portfolio alert"),
    description: textValue(alert.message, "Alert detail pending."),
    source: "dashboard risk",
    link: linkFor(category),
  };
}

function matchesFilter(alert: UnifiedAlert, filter: Filter) {
  if (filter === "All") return true;
  if (filter === "Critical") return alert.severity.toLowerCase().includes("critical");
  if (filter === "High") return alert.severity.toLowerCase().includes("high");
  return alert.category === filter;
}

function AlertRow({ alert }: { alert: UnifiedAlert }) {
  return (
    <div className="grid gap-2 px-3 py-2 text-xs md:grid-cols-[0.8fr_0.8fr_1.4fr_1.8fr_0.8fr]">
      <div>
        <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${severityClass(alert.severity)}`}>
          {alert.severity}
        </span>
      </div>
      <div className="font-mono text-zinc-400">
        {alert.category}
        <div className="text-[10px] text-zinc-600">{alert.symbol}</div>
      </div>
      <div className="font-semibold text-zinc-100">{alert.title}</div>
      <div className="text-zinc-400">{alert.description}</div>
      <div className="font-mono text-[10px] text-zinc-600">
        <div>{timestamp(alert.timestamp)}</div>
        <div>{alert.source}</div>
        <Link className="mt-1 inline-block text-zinc-400 hover:text-emerald-300" href={alert.link}>
          {alert.category === "FCN" ? "View FCN" : alert.category === "System" || alert.category === "Macro" ? "View Intelligence" : "View Portfolio"}
        </Link>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { t } = useI18n();
  const labels = useMemo(
    () => ({
      subtitle: t("alerts.subtitle"),
      header: t("alerts.header"),
      list: t("alerts.list"),
      grouped: t("alerts.grouped"),
      total: t("alerts.total"),
      critical: t("alerts.critical"),
      highMedium: t("alerts.highMedium"),
      low: t("alerts.low"),
      lastUpdated: t("alerts.lastUpdated"),
      systemClear: t("alerts.systemClear"),
      noSignals: t("alerts.noSignals"),
      noMatch: t("alerts.noMatch"),
      marketMacro: t("alerts.marketMacro"),
      portfolioAllocation: t("alerts.portfolioAllocation"),
      systemData: t("alerts.systemData"),
    }),
    [t],
  );
  const [risk, setRisk] = useState<RiskOverviewResponse | null>(null);
  const [priority, setPriority] = useState<NewsArticle[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [riskData, priorityData] = await Promise.allSettled([
          getMyRiskOverview(),
          getPortfolioPriority(),
        ]);
        const nextRisk = riskData.status === "fulfilled" ? riskData.value : null;
        const nextPriority = priorityData.status === "fulfilled" ? priorityData.value : null;
        setRisk(nextRisk);
        setPriority(Array.isArray(nextPriority?.top_alerts) ? nextPriority.top_alerts : []);
        if (!nextRisk && !nextPriority) {
          setError(t("errors.portfolio"));
          setLoadedAt("");
        } else {
          setLoadedAt(new Date().toLocaleString());
        }
      } catch {
        setRisk(null);
        setPriority([]);
        setLoadedAt("");
        setError(t("errors.portfolio"));
      } finally {
        setLoading(false);
      }
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const alerts = useMemo(() => {
    const priorityAlerts = priority.map(fromPriority);
    const riskAlerts = Array.isArray(risk?.alerts) ? risk.alerts.map(fromRisk) : [];
    return [...priorityAlerts, ...riskAlerts];
  }, [priority, risk]);

  const filteredAlerts = alerts.filter((alert) => matchesFilter(alert, filter));
  const criticalCount = alerts.filter((alert) => alert.severity.toLowerCase().includes("critical")).length;
  const highCount = alerts.filter((alert) => alert.severity.toLowerCase().includes("high")).length;
  const mediumCount = alerts.filter((alert) => alert.severity.toLowerCase().includes("medium") || alert.severity.toLowerCase().includes("warning")).length;
  const lowCount = Math.max(alerts.length - criticalCount - highCount - mediumCount, 0);
  const groups: Array<{ title: string; items: UnifiedAlert[] }> = [
    { title: labels.critical, items: alerts.filter((alert) => alert.severity.toLowerCase().includes("critical") || alert.severity.toLowerCase().includes("high")) },
    { title: "FCN", items: alerts.filter((alert) => alert.category === "FCN") },
    { title: labels.marketMacro, items: alerts.filter((alert) => alert.category === "Macro") },
    { title: labels.portfolioAllocation, items: alerts.filter((alert) => ["Portfolio", "Stock", "Crypto"].includes(alert.category)) },
    { title: labels.systemData, items: alerts.filter((alert) => alert.category === "System") },
  ];

  return (
    <AppShell title={t("page.alerts")} subtitle={labels.subtitle}>
      <div className="space-y-5">
        {error && (
          <div className="border border-yellow-500/30 bg-yellow-950/10 px-3 py-2 text-xs text-yellow-200">
            {error}
          </div>
        )}

        <TerminalPanel title={labels.header} meta={loading ? t("status.loading") : error ? "degraded" : alerts.length > 0 ? t("common.active") : t("status.clear")}>
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">{labels.total}</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-100">{alerts.length}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">{labels.critical}</div>
              <div className="mt-1 text-2xl font-semibold text-red-300">{criticalCount}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">{labels.highMedium}</div>
              <div className="mt-1 text-2xl font-semibold text-yellow-300">{highCount + mediumCount}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">{labels.low}</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-300">{lowCount}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">{labels.lastUpdated}</div>
              <div className="mt-1 text-sm text-zinc-300">{loadedAt || "pending"}</div>
            </div>
          </div>
        </TerminalPanel>

        <TerminalPanel title={labels.list} meta={`${filteredAlerts.length} visible`}>
          <div className="mb-3 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                className={`border px-3 py-1.5 font-mono text-xs ${
                  filter === item ? "border-emerald-400/60 text-emerald-200" : "border-zinc-800 text-zinc-500"
                }`}
                key={item}
                onClick={() => setFilter(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="divide-y divide-zinc-900 border border-zinc-800">
            {filteredAlerts.length === 0 && (
              <EmptyLine>{alerts.length === 0 ? labels.systemClear : labels.noMatch}</EmptyLine>
            )}
            {filteredAlerts.map((alert) => (
              <AlertRow alert={alert} key={alert.id} />
            ))}
          </div>
        </TerminalPanel>

        <TerminalPanel title={labels.grouped} meta="critical · fcn · market · portfolio · system">
          <div className="grid gap-3 lg:grid-cols-2">
            {groups.map((group) => (
              <div className="border border-zinc-800 bg-zinc-950/70" key={group.title}>
                <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                  <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-300">{group.title}</h3>
                  <span className="font-mono text-[10px] text-zinc-500">{group.items.length}</span>
                </div>
                <div className="divide-y divide-zinc-900">
                  {group.items.length === 0 && <EmptyLine>{labels.noSignals}</EmptyLine>}
                  {group.items.slice(0, 5).map((alert) => (
                    <div className="px-3 py-2 text-xs" key={`${group.title}-${alert.id}`}>
                      <div className="flex items-center gap-2">
                        <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${severityClass(alert.severity)}`}>{alert.severity}</span>
                        <span className="font-mono text-zinc-500">{alert.symbol}</span>
                      </div>
                      <div className="mt-1 truncate font-semibold text-zinc-100">{alert.title}</div>
                      <div className="mt-1 line-clamp-2 text-zinc-500">{alert.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TerminalPanel>
      </div>
    </AppShell>
  );
}
