"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { CopilotQuestionPanel } from "../components/intelligence/CopilotQuestionPanel";
import { MemoryNarrativePanel } from "../components/intelligence/MemoryNarrativePanel";
import { PortfolioEnginePanel } from "../components/intelligence/PortfolioEnginePanel";
import { ScenarioSensitivityPanel } from "../components/intelligence/ScenarioSensitivityPanel";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import { ExpandablePanel } from "../components/primitives/ExpandablePanel";
import { SectionDivider } from "../components/primitives/SectionDivider";
import { useWorkspaceContext } from "../lib/workspace-context";
import {
  CopilotExplainResponse,
  explainCopilot,
  AllocationItem,
  FCNPositionResponse,
  getIntelligenceGraph,
  getIntelligenceReasoning,
  getIntelligenceScenarios,
  getIntelligenceTimeline,
  getMyAssetAllocation,
  getMyRiskOverview,
  getMySummary,
  getPortfolioPriority,
  getPortfolioSummaryV2A,
  IntelligenceGraphResponse,
  PortfolioPriorityResponse,
  PortfolioSummaryV2AResponse,
  ReasoningSystemResponse,
  RiskOverviewResponse,
  ScenarioResult,
  ScenarioResponse,
  SummaryResponse,
  TimelineIntelligenceResponse,
  TimelineWindowResponse,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import {
  buildCrossAssetRisks,
  buildTodayFocus,
  focusStatus,
  sanitizeAdviceText,
  TodayFocusItem,
} from "../lib/intelligence-priority";

// v4.9D: labels were hardcoded bilingual strings; they now resolve through
// the i18n hook below. Keeping the names as fields of a memoised object so
// downstream JSX needs zero refactor.

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(value: unknown) {
  const parsed = numberValue(value);
  return `${parsed <= 1 && parsed > 0 ? (parsed * 100).toFixed(0) : parsed.toFixed(0)}%`;
}

function statusClass(value?: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("critical") || normalized.includes("high") || normalized.includes("risk_off")) return "border-red-500/50 text-red-300";
  if (normalized.includes("medium") || normalized.includes("watch") || normalized.includes("mixed")) return "border-yellow-500/50 text-yellow-300";
  if (normalized.includes("low") || normalized.includes("clear") || normalized.includes("risk_on")) return "border-emerald-500/50 text-emerald-300";
  return "border-zinc-700 text-zinc-400";
}

function listItems(items: unknown, fallback = "No signal yet") {
  return Array.isArray(items) && items.length > 0 ? items.map((item) => textValue(item)).filter(Boolean) : [fallback];
}

function timestamp(value?: string | null) {
  if (!value) return "generated time pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function DataRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid gap-2 border-b border-zinc-900 py-2 font-mono text-xs md:grid-cols-[180px_1fr]">
      <span className="uppercase text-zinc-600">{label}</span>
      <span className="text-zinc-300">{textValue(value, "Pending")}</span>
    </div>
  );
}

function severityClass(value?: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("critical")) return "border-red-500/50 text-red-300";
  if (normalized.includes("elevated") || normalized.includes("high")) return "border-yellow-500/50 text-yellow-300";
  if (normalized.includes("clear")) return "border-emerald-500/50 text-emerald-300";
  return "border-zinc-700 text-zinc-400";
}

function mergeFcns(summary: SummaryResponse | null) {
  const items = [
    ...(Array.isArray(summary?.fcn_positions) ? summary.fcn_positions : []),
    ...(Array.isArray(summary?.fcn_summary) ? summary.fcn_summary : []),
    ...(Array.isArray(summary?.fcn_analysis) ? summary.fcn_analysis : []),
  ];
  const map = new Map<string, FCNPositionResponse>();
  items.forEach((item, index) => {
    const key = String(item.id || item.fcn_code || item.name || item.code || index);
    map.set(key, { ...map.get(key), ...item });
  });
  return Array.from(map.values());
}

function WindowCard({ item }: { item: TimelineWindowResponse }) {
  const { t } = useI18n();
  return (
    <div className="border border-zinc-800 bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-300">
          {textValue(item.window, "window")}
        </div>
        <span className="font-mono text-[10px] text-zinc-600">timeline</span>
      </div>
      <div className="space-y-1 font-mono text-[11px] leading-5">
        <div><span className="text-zinc-600">{t("dashboard.regime")}</span> <span className="text-zinc-300">{textValue(item.regime_evolution)}</span></div>
        <div><span className="text-zinc-600">{t("dashboard.risk")}</span> <span className="text-zinc-300">{textValue(item.risk_score_trend)}</span></div>
        <div><span className="text-zinc-600">{t("intelligence.concentration")}</span> <span className="text-zinc-300">{textValue(item.concentration_trend)}</span></div>
        <div><span className="text-zinc-600">{t("intelligence.volatility")}</span> <span className="text-zinc-300">{textValue(item.volatility_trend)}</span></div>
      </div>
      <div className="mt-3 grid gap-2 text-[11px] text-zinc-500">
        <div>Recurring: {listItems(item.recurring_risks, "none").slice(0, 2).join(" · ")}</div>
        <div>Improving: {listItems(item.improving_signals, "none").slice(0, 2).join(" · ")}</div>
        <div>Deteriorating: {listItems(item.deteriorating_signals, "none").slice(0, 2).join(" · ")}</div>
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  const { t } = useI18n();
  const workspaceCtx = useWorkspaceContext();
  // v4.9D: resolve all panel labels through i18n so they reflect the
  // current locale instead of the previous hardcoded bilingual strings.
  const labels = useMemo(
    () => ({
      title: t("page.intelligence"),
      subtitle: t("intelligence.subtitle"),
      header: t("intelligence.header"),
      explainability: t("intelligence.explainability"),
      timeline: t("intelligence.timeline"),
      drift: t("intelligence.drift"),
      scenarios: t("intelligence.scenarios"),
      graph: t("intelligence.graphPanel"),
      copilot: t("intelligence.copilot"),
      todayFocus: t("intelligence.todayFocus"),
      crossAsset: t("intelligence.crossAsset"),
      todayFocusSubtitle: t("intelligence.todayFocusSubtitle"),
      connections: t("intelligence.connectionsPanel"),
      correlatedRisks: t("intelligence.correlatedRisksPanel"),
      immediateAttention: t("dashboard.sections.immediateAttention"),
      marketContext: t("dashboard.sections.marketContext"),
      deepAnalysis: t("dashboard.sections.deepAnalysis"),
      defaultCollapsed: t("dashboard.sections.defaultCollapsed"),
      whatToMonitor: t("intelligence.whatToMonitor"),
      noTrading: t("intelligence.noTradingInstruction"),
    }),
    [t],
  );
  const [summary, setSummary] = useState<PortfolioSummaryV2AResponse | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<SummaryResponse | null>(null);
  const [riskOverview, setRiskOverview] = useState<RiskOverviewResponse | null>(null);
  const [allocation, setAllocation] = useState<AllocationItem[]>([]);
  const [priority, setPriority] = useState<PortfolioPriorityResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineIntelligenceResponse | null>(null);
  const [reasoning, setReasoning] = useState<ReasoningSystemResponse | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [graph, setGraph] = useState<IntelligenceGraphResponse | null>(null);
  const [copilot, setCopilot] = useState<CopilotExplainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const nextErrors: string[] = [];
      const [
        summaryData,
        timelineData,
        reasoningData,
        scenarioData,
        graphData,
        copilotData,
        portfolioSummaryData,
        riskOverviewData,
        allocationData,
        priorityData,
      ] = await Promise.all([
        getPortfolioSummaryV2A().catch((err) => {
          nextErrors.push(err instanceof Error ? err.message : "portfolio-summary unavailable");
          return null;
        }),
        getIntelligenceTimeline().catch(() => null),
        getIntelligenceReasoning().catch(() => null),
        getIntelligenceScenarios().catch(() => null as ScenarioResponse | null),
        getIntelligenceGraph().catch(() => null),
        explainCopilot("Explain the current portfolio intelligence state in one short paragraph.").catch(() => null),
        getMySummary().catch(() => null),
        getMyRiskOverview().catch(() => null),
        getMyAssetAllocation().catch(() => null),
        getPortfolioPriority().catch(() => null),
      ]);

      setSummary(summaryData);
      setPortfolioSummary(portfolioSummaryData);
      setRiskOverview(riskOverviewData);
      setAllocation(Array.isArray(allocationData?.items) ? allocationData.items : []);
      setPriority(priorityData);
      setTimeline(timelineData);
      setReasoning(reasoningData);
      setScenarios(Array.isArray(scenarioData?.scenarios) ? scenarioData.scenarios : []);
      setGraph(graphData);
      setCopilot(copilotData);
      setErrors(nextErrors);
      setLoading(false);
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const timelineWindows = Array.isArray(timeline?.windows) ? timeline.windows : [];
  const confidence = summary?.intelligence_confidence ?? timeline?.confidence ?? 0;
  const isStale = Boolean(summary?.is_stale || timeline?.is_stale || reasoning?.is_stale);
  const explainability = summary?.explainability;
  const dominantThemes = listItems(reasoning?.themes?.dominant_themes || graph?.strongest_themes, "No dominant theme yet").slice(0, 5);
  const graphConnections = listItems(graph?.strongest_connections, "Connections still building").slice(0, 6);
  const graphRisks = listItems(graph?.top_correlated_risks, "No correlated risk yet").slice(0, 6);
  const scenarioRows = useMemo(() => scenarios.slice(0, 6), [scenarios]);
  const fcns = useMemo(() => mergeFcns(portfolioSummary), [portfolioSummary]);
  const todayFocus = useMemo(
    () =>
      buildTodayFocus({
        summary: portfolioSummary,
        risk: riskOverview,
        fcnItems: fcns,
        priorityArticles: Array.isArray(priority?.top_alerts) ? priority.top_alerts : [],
        intelligenceSummary: summary,
        timeline,
        allocation,
      }),
    [allocation, fcns, portfolioSummary, priority, riskOverview, summary, timeline],
  );
  const crossAssetRisks = useMemo(
    () =>
      buildCrossAssetRisks({
        summary: portfolioSummary,
        fcnItems: fcns,
        intelligenceSummary: summary,
        timeline,
      }),
    [fcns, portfolioSummary, summary, timeline],
  );
  const todayStatus = focusStatus(todayFocus);

  return (
    <AppShell title={t("page.intelligence")} subtitle={labels.subtitle}>
      <div className="space-y-5">
        {errors.length > 0 && (
          <div className="border border-yellow-500/30 bg-yellow-950/10 px-3 py-2 text-xs text-yellow-200">
            {t("errors.intelligencePartial")}
          </div>
        )}

        <TerminalPanel title={labels.header} meta={loading ? "loading" : isStale ? "stale memory" : "fresh"}>
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">{t("dashboard.regime")}</div>
              <div className="mt-1 text-lg font-semibold text-zinc-100">{textValue(summary?.regime, "Pending")}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">{t("dashboard.confidence")}</div>
              <div className="mt-1 text-lg font-semibold text-emerald-300">{percent(confidence)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">{t("dashboard.dominantRisk")}</div>
              <div className="mt-1 text-sm text-zinc-300">{textValue(summary?.dominant_risk, "Pending")}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">{t("dashboard.lastGenerated")}</div>
              <div className="mt-1 text-sm text-zinc-300">{timestamp(summary?.generated_at || timeline?.generated_at)}</div>
            </div>
            <div className="flex flex-wrap content-start gap-2">
              <Link className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-emerald-400 hover:text-emerald-200" href="/dashboard">Dashboard</Link>
              <Link className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-emerald-400 hover:text-emerald-200" href="/portfolio">Portfolio</Link>
              <Link className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-emerald-400 hover:text-emerald-200" href="/fcn">FCN</Link>
            </div>
          </div>
        </TerminalPanel>

        <SectionDivider label={labels.immediateAttention} hint={t("dashboard.sections.immediateAttentionHint")} />

        <TerminalPanel title={labels.todayFocus} meta={todayStatus}>
          <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className={`border px-2 py-1 uppercase ${severityClass(todayStatus)}`}>
              {t("intelligence.statusLabel")}: {todayStatus}
            </span>
            <span className="text-zinc-500">{labels.todayFocusSubtitle}</span>
          </div>
          <div className="divide-y divide-zinc-900 border border-zinc-800">
            {todayFocus.map((item: TodayFocusItem) => (
              <div className="grid gap-2 px-3 py-2 text-xs md:grid-cols-[0.8fr_1fr_1.8fr_1fr]" key={`${item.category}-${item.symbol}-${item.title}`}>
                <div>
                  <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${severityClass(item.severity)}`}>
                    {item.severity}
                  </span>
                  <div className="mt-1 font-mono text-zinc-500">{item.category}</div>
                </div>
                <div>
                  <div className="font-semibold text-zinc-100">{item.title}</div>
                  <div className="font-mono text-[10px] text-zinc-500">{item.symbol}</div>
                </div>
                <div className="text-zinc-400">{sanitizeAdviceText(item.reason)}</div>
                <div className="font-mono text-zinc-300">
                  {t("intelligence.actionLabel")}:{" "}
                  {t(`intelligence.actions.${item.recommended_monitoring_action}`)}
                </div>
              </div>
            ))}
          </div>
        </TerminalPanel>

        <SectionDivider label={labels.marketContext} hint={t("intelligence.whyWhatChanged")} />

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <TerminalPanel title={labels.explainability} meta={t("intelligence.whyWhatChanged")}>
            <DataRow label={t("intelligence.whyNow")} value={explainability?.why_risk_increased || todayFocus[0]?.reason} />
            <DataRow label={t("intelligence.whatChanged")} value={explainability?.what_changed_today} />
            <DataRow label={labels.whatToMonitor} value={todayFocus.map((item) => item.recommended_monitoring_action).join(" · ")} />
            <DataRow label={t("intelligence.primaryDriver")} value={explainability?.dominant_driver} />
            <DataRow label={t("intelligence.hiddenCorrelation")} value={explainability?.hidden_correlation} />
            <DataRow label={t("intelligence.systemicRisk")} value={explainability?.systemic_risk} />
          </TerminalPanel>

          <TerminalPanel title={labels.drift} meta={`${t("dashboard.regime")} / ${t("intelligence.concentration")}`}>
            <DataRow label={t("intelligence.riskDrift")} value={summary?.drift_summary || reasoning?.timeline?.what_changed_today} />
            <DataRow label={t("dashboard.regime")} value={summary?.regime} />
            <DataRow label={t("intelligence.dominantDriver")} value={summary?.explainability?.dominant_driver || reasoning?.reasoning?.why_workspace_mode} />
            <DataRow label={t("intelligence.concentration")} value={summary?.concentration_score ? percent(summary.concentration_score) : "Pending"} />
            <DataRow label={t("intelligence.volatility")} value={timeline?.volatility_trend || reasoning?.reasoning?.volatility_analysis} />
          </TerminalPanel>
        </section>

        <PortfolioEnginePanel portfolioId={workspaceCtx.context.selectedPortfolioId} />
        <CopilotQuestionPanel portfolioId={workspaceCtx.context.selectedPortfolioId} />

        <SectionDivider label={labels.deepAnalysis} hint={labels.defaultCollapsed} />

        <ExpandablePanel title={labels.timeline} meta={timeline?.is_stale ? "history accumulating" : "7d / 30d / 90d"}>
          <div className="mb-3 text-sm text-zinc-300">
            {textValue(timeline?.timeline_summary || timeline?.message, t("empty.timelineBuilding"))}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {timelineWindows.length === 0 && <EmptyLine>{t("empty.timelineBuilding")}</EmptyLine>}
            {timelineWindows.map((item) => (
              <WindowCard item={item} key={textValue(item.window)} />
            ))}
          </div>
        </ExpandablePanel>

        <ExpandablePanel title={labels.crossAsset} meta="equity / fcn / crypto / macro / cash">
          <div className="grid gap-3 lg:grid-cols-5">
            {crossAssetRisks.map((risk) => (
              <div className="border border-zinc-800 bg-black/20 p-3" key={risk.label}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="font-mono text-xs uppercase text-zinc-300">{risk.label}</div>
                  <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${severityClass(risk.state)}`}>
                    {risk.state}
                  </span>
                </div>
                <div className="text-xs leading-5 text-zinc-400">{risk.driver}</div>
                <div className="mt-2 font-mono text-[10px] text-zinc-600">
                  {risk.relatedSymbols.length > 0 ? risk.relatedSymbols.join(" · ") : "symbols pending"}
                </div>
                <div className="mt-2 text-[11px] leading-5 text-zinc-500">{risk.monitoringNote}</div>
              </div>
            ))}
          </div>
        </ExpandablePanel>

        <ExpandablePanel title={labels.scenarios} meta="risk awareness only">
          <div className="divide-y divide-zinc-900 border border-zinc-800">
            {scenarioRows.length === 0 && <EmptyLine>{t("intelligence.scenarioUnavailable")}</EmptyLine>}
            {scenarioRows.map((scenario, index) => (
              <div className="grid gap-2 px-3 py-2 text-xs md:grid-cols-[1fr_0.7fr_1.2fr]" key={`${textValue(scenario.scenario_name, "scenario")}-${index}`}>
                <div>
                  <div className="font-mono font-semibold text-zinc-100">{textValue(scenario.scenario_name, "Scenario")}</div>
                  <div className="font-mono text-[10px] text-zinc-500">{listItems(scenario.affected_assets, "portfolio").slice(0, 4).join(" · ")}</div>
                </div>
                <span className={`w-fit border px-2 py-1 font-mono text-[10px] uppercase ${statusClass(scenario.impact_level)}`}>
                  {textValue(scenario.impact_level, "watch")}
                </span>
                <div className="text-zinc-400">{textValue(scenario.narrative || scenario.portfolio_sensitivity, "Interpretation pending")}</div>
              </div>
            ))}
          </div>
        </ExpandablePanel>

        <ExpandablePanel title={labels.graph} meta="themes · connections · risks">
          <section className="grid gap-5 lg:grid-cols-3">
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-zinc-500">
                {labels.graph}
              </div>
              <div className="space-y-2">
                {dominantThemes.map((theme) => (
                  <div className="border-b border-zinc-900 pb-2 font-mono text-xs text-zinc-300" key={theme}>{theme}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-zinc-500">
                {labels.connections}
              </div>
              <div className="space-y-2">
                {graphConnections.map((connection) => (
                  <div className="border-b border-zinc-900 pb-2 font-mono text-xs text-zinc-300" key={connection}>{connection}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-zinc-500">
                {labels.correlatedRisks}
              </div>
              <div className="space-y-2">
                {graphRisks.map((risk) => (
                  <div className="border-b border-zinc-900 pb-2 font-mono text-xs text-zinc-300" key={risk}>{risk}</div>
                ))}
              </div>
            </div>
          </section>
        </ExpandablePanel>

        <ExpandablePanel title={t("intelligence.scenarioSensitivity")} meta="hypothetical">
          <ScenarioSensitivityPanel
            summary={portfolioSummary}
            intelligenceSummary={summary}
            fcnItems={fcns}
          />
        </ExpandablePanel>

        <ExpandablePanel title={t("intelligence.memoryNarrative")} meta={t("intelligence.snapshotHistory")}>
          <MemoryNarrativePanel timeline={timeline} reasoning={reasoning} />
        </ExpandablePanel>

        <ExpandablePanel title={labels.copilot} meta={copilot ? "legacy fallback" : "legacy"}>
          <p className="text-sm leading-6 text-zinc-300">
            {textValue(copilot?.answer, t("intelligence.copilotFallback"))}
          </p>
        </ExpandablePanel>

        <div className="border border-zinc-800 bg-zinc-950/60 px-3 py-2 font-mono text-[11px] text-zinc-500">
          {labels.noTrading}
        </div>
      </div>
    </AppShell>
  );
}
