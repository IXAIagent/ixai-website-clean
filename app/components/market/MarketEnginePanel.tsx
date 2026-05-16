"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getMarketEngineSummary,
  type MarketEngineSummaryResponse,
} from "../../lib/api";
import { sanitizeAdviceText } from "../../lib/intelligence-priority";
import { TerminalPanel } from "../layout/TerminalPanel";

function regimeClass(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v.includes("crypto_stress") || v.includes("risk_off") || v.includes("high_volatility"))
    return "border-red-400 text-red-200";
  if (v.includes("defensive")) return "border-yellow-400 text-yellow-200";
  if (v.includes("ai_momentum") || v.includes("risk_on")) return "border-emerald-400 text-emerald-200";
  return "border-zinc-700 text-zinc-300";
}

function severityClass(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v === "critical" || v === "high") return "border-red-400 text-red-200";
  if (v === "elevated") return "border-orange-400 text-orange-200";
  if (v === "watch") return "border-yellow-400 text-yellow-200";
  return "border-emerald-400 text-emerald-200";
}

function fmt(n: unknown) {
  const parsed =
    typeof n === "number"
      ? n
      : typeof n === "string" && n.trim()
        ? Number(n)
        : NaN;
  return Number.isFinite(parsed) ? parsed.toFixed(0) : "-";
}

export function MarketEnginePanel({
  portfolioId,
  compact = false,
}: {
  portfolioId?: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<MarketEngineSummaryResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getMarketEngineSummary(portfolioId);
      setData(response);
    } catch {
      setError("Market engine temporarily unavailable.");
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
      <TerminalPanel title="Market Engine / 市場引擎" meta="loading">
        <div className="h-16 animate-pulse border border-zinc-800 bg-zinc-900" />
      </TerminalPanel>
    );
  }
  if (error || !data) {
    return (
      <TerminalPanel title="Market Engine / 市場引擎" meta="fallback">
        <div className="font-mono text-xs text-yellow-300">{error || "no data"}</div>
      </TerminalPanel>
    );
  }

  const regime = data.regime || {};
  const volatility = data.volatility || {};
  const macro = data.macro_news || {};
  const impact = data.portfolio_impact || {};
  const topThemes = Array.isArray(macro.top_themes) ? macro.top_themes : [];

  return (
    <TerminalPanel
      title="Market Engine / 市場引擎"
      meta={`v4B · ${regime.regime || "data_limited"}`}
    >
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className={`border px-2 py-1 uppercase ${regimeClass(regime.regime)}`}>
          REGIME: {regime.regime || "data_limited"}
        </span>
        <span className={`border px-2 py-1 uppercase ${severityClass(volatility.overall_state)}`}>
          VOL: {volatility.overall_state || "normal"}
        </span>
        <span className={`border px-2 py-1 uppercase ${severityClass(impact.overall_impact_level)}`}>
          IMPACT: {impact.overall_impact_level || "clear"}
        </span>
        {typeof regime.confidence === "number" && (
          <span className="border border-zinc-700 px-2 py-1 uppercase text-zinc-400">
            conf {regime.confidence.toFixed(0)}%
          </span>
        )}
      </div>

      <div className="mt-3 text-xs text-zinc-300">
        {sanitizeAdviceText(regime.narrative || "")}
      </div>

      {!compact && (
        <div className="mt-3 grid gap-2 font-mono text-xs md:grid-cols-3">
          <div className="border border-zinc-800 bg-black/20 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">EQUITY VOL</div>
            <div className="mt-1 text-zinc-200">{volatility.equity_volatility_state || "normal"}</div>
          </div>
          <div className="border border-zinc-800 bg-black/20 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">CRYPTO VOL</div>
            <div className="mt-1 text-zinc-200">{volatility.crypto_volatility_state || "normal"}</div>
          </div>
          <div className="border border-zinc-800 bg-black/20 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">FCN SENSITIVITY</div>
            <div className="mt-1 text-zinc-200">{volatility.fcn_sensitivity_state || "normal"}</div>
          </div>
        </div>
      )}

      {!compact && (
        <div className="mt-3 border border-zinc-800 bg-black/20 p-3">
          <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            MACRO / NEWS PRESSURE
          </div>
          <div className="mt-2 grid gap-1 font-mono text-[11px] text-zinc-400 md:grid-cols-6">
            <div>Rates: {fmt(macro.rates_pressure)}</div>
            <div>AI: {fmt(macro.ai_pressure)}</div>
            <div>Crypto: {fmt(macro.crypto_pressure)}</div>
            <div>Geo: {fmt(macro.geopolitics_pressure)}</div>
            <div>Earnings: {fmt(macro.earnings_pressure)}</div>
            <div>Macro: {fmt(macro.macro_stress)}</div>
          </div>
          <div className="mt-2 text-xs text-zinc-300">
            {sanitizeAdviceText(macro.narrative || "")}
          </div>
          {topThemes.length > 0 && (
            <div className="mt-2 divide-y divide-zinc-900 border border-zinc-900">
              {topThemes.slice(0, 4).map((theme, idx) => (
                <div className="px-2 py-1 font-mono text-[11px]" key={idx}>
                  <span className="text-zinc-200 uppercase">{theme.theme}</span>
                  <span className="ml-2 text-zinc-500">
                    pressure {fmt(theme.weight)}
                  </span>
                  {Array.isArray(theme.sample_headlines) && theme.sample_headlines.length > 0 && (
                    <div className="text-zinc-500">
                      {theme.sample_headlines
                        .slice(0, 2)
                        .map((h) => sanitizeAdviceText(h))
                        .join(" · ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!compact && (
        <div className="mt-3 grid gap-2 font-mono text-[11px] text-zinc-400 md:grid-cols-2">
          <div>
            <span className="text-zinc-500">FCN impact: </span>
            <span className="text-zinc-300">{sanitizeAdviceText(impact.fcn_impact || "—")}</span>
          </div>
          <div>
            <span className="text-zinc-500">Crypto impact: </span>
            <span className="text-zinc-300">{sanitizeAdviceText(impact.crypto_impact || "—")}</span>
          </div>
          <div>
            <span className="text-zinc-500">Equity impact: </span>
            <span className="text-zinc-300">{sanitizeAdviceText(impact.equity_impact || "—")}</span>
          </div>
          <div>
            <span className="text-zinc-500">Cash buffer: </span>
            <span className="text-zinc-300">{sanitizeAdviceText(impact.cash_buffer_interpretation || "—")}</span>
          </div>
        </div>
      )}
    </TerminalPanel>
  );
}
