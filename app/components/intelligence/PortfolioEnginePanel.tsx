"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getPortfolioEngineSummary,
  type PortfolioEngineSummaryResponse,
} from "../../lib/api";
import { formatPercent } from "../../lib/formatters";
import { useI18n } from "../../lib/i18n";
import { sanitizeAdviceText } from "../../lib/intelligence-priority";
import { StatusBadge } from "../layout/StatusBadge";
import { TerminalPanel } from "../layout/TerminalPanel";

function score(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) ? parsed.toFixed(0) : "-";
}

export function PortfolioEnginePanel({
  portfolioId,
  compact = false,
}: {
  portfolioId?: string;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const pct = (value: unknown) => formatPercent(value, locale);
  const [data, setData] = useState<PortfolioEngineSummaryResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getPortfolioEngineSummary(portfolioId);
      setData(response);
    } catch {
      setError("Portfolio engine temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading && !data) {
    return (
      <TerminalPanel title={t("engine.portfolioTitle")} meta={t("status.loading")}>
        <div className="h-16 animate-pulse border border-zinc-800 bg-zinc-900" />
      </TerminalPanel>
    );
  }
  if (error || !data) {
    return (
      <TerminalPanel title={t("engine.portfolioTitle")} meta="fallback">
        <div className="flex items-center gap-2">
          <StatusBadge value="unavailable" />
          <span className="font-mono text-xs text-yellow-300">
            {error || t("errors.engine")}
          </span>
          <button
            className="ml-auto border border-zinc-700 px-2 py-1 font-mono text-[10px] text-zinc-300 hover:border-emerald-400/60 hover:text-emerald-200"
            onClick={() => void load()}
            type="button"
          >
            {t("common.retry")}
          </button>
        </div>
      </TerminalPanel>
    );
  }

  const unified = data.unified_score || {};
  const concentration = data.concentration || {};
  const fcnRisk = data.fcn_systemic_risk || {};
  const drift = data.drift || {};
  const exposure = data.exposure_graph || {};
  const propagation = data.risk_propagation || {};
  const propagationChains = Array.isArray(propagation.chains) ? propagation.chains : [];
  const overallStatus = data.is_stale ? "stale" : data.status || unified.risk_state || "clear";

  return (
    <TerminalPanel
      title={t("engine.portfolioTitle")}
      meta={`v4A · ${unified.risk_state || "clear"}`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge value={overallStatus} />
        {data.locale && (
          <span className="border border-zinc-800 px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-500">
            {data.locale}
          </span>
        )}
        {data.degraded_reason && (
          <span className="font-mono text-[10px] text-yellow-300">
            {data.degraded_reason}
          </span>
        )}
      </div>

      <div className={`grid gap-2 font-mono text-xs ${compact ? "md:grid-cols-3" : "md:grid-cols-6"}`}>
        {(
          [
            [t("engine.score.total"), unified.total_intelligence_score],
            [t("engine.score.exposure"), unified.exposure_score],
            [t("engine.score.concentration"), unified.concentration_score],
            [t("engine.score.fcnStress"), unified.fcn_stress_score],
            [t("engine.score.volatility"), unified.volatility_score],
            [t("engine.score.drift"), unified.drift_score],
          ] as const
        ).map(([label, value]) => (
          <div className="border border-zinc-800 bg-black/30 px-2 py-2" key={label}>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
            <div className="mt-1 text-base font-semibold text-zinc-100">{score(value)}</div>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr]">
          <div className="border border-zinc-800 bg-black/20 p-3">
            <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
              {t("engine.concentrationHeader")}
            </div>
            <div className="mt-1">
              <StatusBadge value={concentration.risk_level || "clear"} />
            </div>
            <div className="mt-2 grid gap-1 font-mono text-[11px] text-zinc-400">
              <div>Single name: {pct(concentration.single_name_pct)}</div>
              <div>Theme cluster: {pct(concentration.theme_pct)}</div>
              <div>FCN underlying: {pct(concentration.fcn_underlying_pct)}</div>
              <div>Crypto bucket: {pct(concentration.crypto_pct)}</div>
              <div>Cash buffer: {pct(concentration.cash_buffer_pct)}</div>
            </div>
          </div>

          <div className="border border-zinc-800 bg-black/20 p-3">
            <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
              {t("engine.fcnSystemicHeader")}
            </div>
            <div className="mt-1">
              <StatusBadge value={fcnRisk.risk_level || "clear"} />
            </div>
            <div className="mt-2 grid gap-1 font-mono text-[11px] text-zinc-400">
              <div>Worst-of pressure: {pct(fcnRisk.worst_of_pressure_pct)}</div>
              <div>
                {t("engine.fields.nearestKi")}:{" "}
                {fcnRisk.nearest_ki_pct == null
                  ? "n/a"
                  : pct(fcnRisk.nearest_ki_pct)}
              </div>
              <div>
                {t("engine.fields.repeatedUnderlyings")}:{" "}
                {(fcnRisk.repeated_underlyings || []).join(", ") || t("engine.none")}
              </div>
              <div>
                {t("engine.fields.kiCluster")}:{" "}
                {(fcnRisk.ki_cluster_symbols || []).join(", ") || t("engine.none")}
              </div>
              <div>Observation: {fcnRisk.observation_clustering || "unknown"}</div>
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <div className="mt-3 border border-zinc-800 bg-black/20 p-3">
          <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            {t("engine.driftHeader")} · window {drift.history_window ?? 0}
          </div>
          <div className="mt-2 grid gap-2 font-mono text-[11px] text-zinc-400 md:grid-cols-5">
            <div>Allocation: {drift.allocation_drift || "UNCHANGED"}</div>
            <div>Concentration: {drift.concentration_drift || "UNCHANGED"}</div>
            <div>Volatility: {drift.volatility_drift || "UNCHANGED"}</div>
            <div>FCN pressure: {drift.fcn_pressure_drift || "UNCHANGED"}</div>
            <div>Regime: {drift.regime_drift || "UNCHANGED"}</div>
          </div>
          <div className="mt-2 text-xs text-zinc-300">
            {sanitizeAdviceText(drift.drift_summary || "")}
          </div>
        </div>
      )}

      {!compact && (
        <div className="mt-3 border border-zinc-800 bg-black/20 p-3">
          <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            {t("engine.riskPropagationHeader")}
          </div>
          <div className="mt-1 text-xs text-zinc-300">
            {sanitizeAdviceText(propagation.summary || "")}
          </div>
          <div className="mt-2 space-y-2">
            {propagationChains.slice(0, 4).map((chain, idx) => (
              <div className="border border-zinc-800 bg-black/30 px-2 py-1.5 font-mono text-[11px]" key={idx}>
                <div className="text-zinc-200">
                  {(chain.chain || []).join(" → ")}
                </div>
                <div className="mt-1 text-zinc-500">
                  {sanitizeAdviceText(chain.explanation || "")}
                </div>
              </div>
            ))}
            {propagationChains.length === 0 && (
              <div className="font-mono text-[11px] text-zinc-500">
                No dominant chain detected.
              </div>
            )}
          </div>
        </div>
      )}

      {!compact && (
        <div className="mt-3 grid gap-2 font-mono text-[11px] text-zinc-400 md:grid-cols-2">
          <div>
            <span className="text-zinc-500">{t("engine.fields.dominantThemes")}: </span>
            {(exposure.dominant_themes || []).join(", ") || "—"}
          </div>
          <div>
            <span className="text-zinc-500">{t("engine.fields.highBeta")}: </span>
            {(exposure.high_beta_symbols || []).join(", ") || "—"}
          </div>
          <div>
            <span className="text-zinc-500">{t("engine.fields.fcnLinked")}: </span>
            {(exposure.fcn_linked_symbols || []).join(", ") || "—"}
          </div>
          <div>
            <span className="text-zinc-500">{t("engine.fields.repeatedUnderlyings")}: </span>
            {(exposure.repeated_underlyings || []).join(", ") || "—"}
          </div>
        </div>
      )}
    </TerminalPanel>
  );
}
