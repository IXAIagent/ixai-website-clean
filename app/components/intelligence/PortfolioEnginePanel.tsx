"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getPortfolioEngineSummary,
  type PortfolioEngineSummaryResponse,
} from "../../lib/api";
import { sanitizeAdviceText } from "../../lib/intelligence-priority";
import { TerminalPanel } from "../layout/TerminalPanel";

function severityClass(value?: string | null) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("critical")) return "border-red-400 text-red-200";
  if (normalized.includes("elevated")) return "border-orange-400 text-orange-200";
  if (normalized.includes("watch")) return "border-yellow-400 text-yellow-200";
  return "border-emerald-400 text-emerald-200";
}

function pct(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : "-";
}

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
      <TerminalPanel title="Portfolio Engine / 投資組合引擎" meta="loading">
        <div className="h-16 animate-pulse border border-zinc-800 bg-zinc-900" />
      </TerminalPanel>
    );
  }
  if (error || !data) {
    return (
      <TerminalPanel title="Portfolio Engine / 投資組合引擎" meta="fallback">
        <div className="font-mono text-xs text-yellow-300">{error || "no data"}</div>
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

  return (
    <TerminalPanel
      title="Portfolio Engine / 投資組合引擎"
      meta={`v4A · ${unified.risk_state || "clear"}`}
    >
      <div className={`grid gap-2 font-mono text-xs ${compact ? "md:grid-cols-3" : "md:grid-cols-6"}`}>
        {(
          [
            ["TOTAL", unified.total_intelligence_score],
            ["EXPOSURE", unified.exposure_score],
            ["CONC", unified.concentration_score],
            ["FCN STRESS", unified.fcn_stress_score],
            ["VOL", unified.volatility_score],
            ["DRIFT", unified.drift_score],
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
              CONCENTRATION
            </div>
            <div className={`mt-1 inline-block border px-2 py-0.5 font-mono text-[10px] uppercase ${severityClass(concentration.risk_level)}`}>
              {concentration.risk_level || "clear"}
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
              FCN SYSTEMIC
            </div>
            <div className={`mt-1 inline-block border px-2 py-0.5 font-mono text-[10px] uppercase ${severityClass(fcnRisk.risk_level)}`}>
              {fcnRisk.risk_level || "clear"}
            </div>
            <div className="mt-2 grid gap-1 font-mono text-[11px] text-zinc-400">
              <div>Worst-of pressure: {pct(fcnRisk.worst_of_pressure_pct)}</div>
              <div>
                Nearest KI:{" "}
                {fcnRisk.nearest_ki_pct == null
                  ? "n/a"
                  : pct(fcnRisk.nearest_ki_pct)}
              </div>
              <div>
                Repeated underlyings:{" "}
                {(fcnRisk.repeated_underlyings || []).join(", ") || "none"}
              </div>
              <div>
                KI cluster: {(fcnRisk.ki_cluster_symbols || []).join(", ") || "none"}
              </div>
              <div>Observation: {fcnRisk.observation_clustering || "unknown"}</div>
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <div className="mt-3 border border-zinc-800 bg-black/20 p-3">
          <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            DRIFT · window {drift.history_window ?? 0}
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
            RISK PROPAGATION
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
            <span className="text-zinc-500">Dominant themes: </span>
            {(exposure.dominant_themes || []).join(", ") || "—"}
          </div>
          <div>
            <span className="text-zinc-500">High-beta symbols: </span>
            {(exposure.high_beta_symbols || []).join(", ") || "—"}
          </div>
          <div>
            <span className="text-zinc-500">FCN-linked symbols: </span>
            {(exposure.fcn_linked_symbols || []).join(", ") || "—"}
          </div>
          <div>
            <span className="text-zinc-500">Repeated underlyings: </span>
            {(exposure.repeated_underlyings || []).join(", ") || "—"}
          </div>
        </div>
      )}
    </TerminalPanel>
  );
}
