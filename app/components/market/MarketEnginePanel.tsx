"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getMarketEngineSummary,
  type MarketEngineSummaryResponse,
} from "../../lib/api";
import { summarizeMarketState } from "../../lib/compression";
import { useI18n } from "../../lib/i18n";
import { sanitizeAdviceText } from "../../lib/intelligence-priority";
import { localizeFinancialNarrative } from "../../lib/localization";
import { InlineInsight } from "../primitives/InlineInsight";
import { StatusBadge } from "../layout/StatusBadge";
import { TerminalPanel } from "../layout/TerminalPanel";

function regimeClass(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v.includes("crypto_stress") || v.includes("risk_off") || v.includes("high_volatility"))
    return "border-[var(--ixai-risk-critical)] text-[var(--ixai-risk-critical)]";
  if (v.includes("defensive")) return "border-[var(--ixai-risk-watch)] text-[var(--ixai-risk-watch)]";
  if (v.includes("ai_momentum") || v.includes("risk_on")) return "border-[var(--ixai-accent)] text-[var(--ixai-risk-clear)]";
  return "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-strong)]";
}

function severityClass(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v === "critical" || v === "high") return "border-[var(--ixai-risk-critical)] text-[var(--ixai-risk-critical)]";
  if (v === "elevated") return "border-[var(--ixai-risk-elevated)] text-[var(--ixai-risk-elevated)]";
  if (v === "watch") return "border-[var(--ixai-risk-watch)] text-[var(--ixai-risk-watch)]";
  return "border-[var(--ixai-accent)] text-[var(--ixai-risk-clear)]";
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

function humanize(value: unknown, fallback = "normal") {
  const text = String(value || fallback)
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function MarketEnginePanel({
  portfolioId,
  compact = false,
}: {
  portfolioId?: string;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
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
      setError(t("engine.marketUnavailable"));
    } finally {
      setLoading(false);
    }
  }, [portfolioId, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading && !data) {
    return (
      <TerminalPanel title={t("engine.marketTitle")} meta={t("status.loading")}>
        <div className="h-16 animate-pulse border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-card)]" />
      </TerminalPanel>
    );
  }
  if (error || !data) {
    return (
      <TerminalPanel title={t("engine.marketTitle")} meta={t("engine.fallback")}>
        <div className="flex items-center gap-2">
          <StatusBadge value="unavailable" />
          <span className="font-mono text-xs text-[var(--ixai-risk-watch)]">
            {error || t("errors.market")}
          </span>
          <button
            className="ml-auto border border-[var(--ixai-border-subtle)] px-2 py-1 font-mono text-[10px] text-[var(--ixai-text-strong)] hover:border-[var(--ixai-accent)]/60 hover:text-[var(--ixai-risk-clear)]"
            onClick={() => void load()}
            type="button"
          >
            {t("common.retry")}
          </button>
        </div>
      </TerminalPanel>
    );
  }

  const regime = data.regime || {};
  const volatility = data.volatility || {};
  const macro = data.macro_news || {};
  const impact = data.portfolio_impact || {};
  const topThemes = Array.isArray(macro.top_themes) ? macro.top_themes : [];
  const overallStatus = data.is_stale ? "stale" : data.status || "healthy";

  return (
    <TerminalPanel
      title={t("engine.marketTitle")}
      meta={t("engine.meta.marketLens")}
    >
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className={`border px-2 py-1 ${regimeClass(regime.regime)}`}>
          {t("engine.labels.regime")}: {humanize(regime.regime, "data limited")}
        </span>
        <span className={`border px-2 py-1 ${severityClass(volatility.overall_state)}`}>
          {t("engine.labels.vol")} {humanize(volatility.overall_state)}
        </span>
        <span className={`border px-2 py-1 ${severityClass(impact.overall_impact_level)}`}>
          {t("engine.labels.impact")} {humanize(impact.overall_impact_level, "clear")}
        </span>
        {typeof regime.confidence === "number" && (
          <span className="border border-[var(--ixai-border-subtle)] px-2 py-1 uppercase text-[var(--ixai-text-muted)]">
            {t("engine.labels.confidence")} {regime.confidence.toFixed(0)}%
          </span>
        )}
        <StatusBadge value={overallStatus} />
        {data.locale && (
          <span className="border border-[var(--ixai-border-subtle)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--ixai-text-subtle)]">
            {data.locale}
          </span>
        )}
      </div>

      <div className="mt-3">
        <InlineInsight
          tone={
            overallStatus === "critical" || overallStatus === "unavailable"
              ? "critical"
              : overallStatus === "elevated"
                ? "elevated"
                : overallStatus === "watch" || overallStatus === "stale"
                  ? "watch"
                  : "good"
          }
        >
          {localizeFinancialNarrative(summarizeMarketState(data, locale), locale, {
            maxLength: 140,
          })}
        </InlineInsight>
      </div>

      <div className="mt-2 text-xs text-[var(--ixai-text-strong)]">
        {localizeFinancialNarrative(regime.narrative || "", locale, { maxLength: 180 })}
      </div>

      {!compact && (
        <div className="mt-3 grid gap-2 font-mono text-xs md:grid-cols-3">
          <div className="border border-[var(--ixai-border-subtle)] bg-black/20 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide text-[var(--ixai-text-subtle)]">{t("engine.labels.equityVolatility")}</div>
            <div className="mt-1 text-[var(--ixai-text-strong)]">{humanize(volatility.equity_volatility_state)}</div>
          </div>
          <div className="border border-[var(--ixai-border-subtle)] bg-black/20 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide text-[var(--ixai-text-subtle)]">{t("engine.labels.cryptoVolatility")}</div>
            <div className="mt-1 text-[var(--ixai-text-strong)]">{humanize(volatility.crypto_volatility_state)}</div>
          </div>
          <div className="border border-[var(--ixai-border-subtle)] bg-black/20 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide text-[var(--ixai-text-subtle)]">{t("engine.labels.fcnSensitivity")}</div>
            <div className="mt-1 text-[var(--ixai-text-strong)]">{humanize(volatility.fcn_sensitivity_state)}</div>
          </div>
        </div>
      )}

      {!compact && (
        <div className="mt-3 border border-[var(--ixai-border-subtle)] bg-black/20 p-3">
          <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--ixai-text-subtle)]">
            {t("engine.macroHeader")}
          </div>
          <div className="mt-2 grid gap-1 font-mono text-[11px] text-[var(--ixai-text-muted)] md:grid-cols-6">
            <div>{t("engine.labels.rates")}: {fmt(macro.rates_pressure)}</div>
            <div>{t("engine.labels.ai")}: {fmt(macro.ai_pressure)}</div>
            <div>{t("engine.labels.crypto")}: {fmt(macro.crypto_pressure)}</div>
            <div>{t("engine.labels.geo")}: {fmt(macro.geopolitics_pressure)}</div>
            <div>{t("engine.labels.earnings")}: {fmt(macro.earnings_pressure)}</div>
            <div>{t("engine.labels.macro")}: {fmt(macro.macro_stress)}</div>
          </div>
          <div className="mt-2 text-xs text-[var(--ixai-text-strong)]">
            {sanitizeAdviceText(macro.narrative || "")}
          </div>
          {topThemes.length > 0 && (
            <div className="mt-2 divide-y divide-[var(--ixai-border-subtle)] border border-[var(--ixai-border-subtle)]">
              {topThemes.slice(0, 4).map((theme, idx) => (
                <div className="px-2 py-1 font-mono text-[11px]" key={idx}>
                  <span className="text-[var(--ixai-text-strong)] uppercase">{theme.theme}</span>
                  <span className="ml-2 text-[var(--ixai-text-subtle)]">
                    {t("engine.labels.pressure")} {fmt(theme.weight)}
                  </span>
                  {Array.isArray(theme.sample_headlines) && theme.sample_headlines.length > 0 && (
                    <div className="text-[var(--ixai-text-subtle)]">
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
        <div className="mt-3 grid gap-2 font-mono text-[11px] text-[var(--ixai-text-muted)] md:grid-cols-2">
          <div>
            <span className="text-[var(--ixai-text-subtle)]">{t("engine.fields.fcnImpact")}: </span>
            <span className="text-[var(--ixai-text-strong)]">{sanitizeAdviceText(impact.fcn_impact || "—")}</span>
          </div>
          <div>
            <span className="text-[var(--ixai-text-subtle)]">{t("engine.fields.cryptoImpact")}: </span>
            <span className="text-[var(--ixai-text-strong)]">{sanitizeAdviceText(impact.crypto_impact || "—")}</span>
          </div>
          <div>
            <span className="text-[var(--ixai-text-subtle)]">{t("engine.fields.equityImpact")}: </span>
            <span className="text-[var(--ixai-text-strong)]">{sanitizeAdviceText(impact.equity_impact || "—")}</span>
          </div>
          <div>
            <span className="text-[var(--ixai-text-subtle)]">{t("engine.fields.cashBuffer")}: </span>
            <span className="text-[var(--ixai-text-strong)]">{sanitizeAdviceText(impact.cash_buffer_interpretation || "—")}</span>
          </div>
        </div>
      )}
    </TerminalPanel>
  );
}
