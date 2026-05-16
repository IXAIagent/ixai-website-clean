"use client";

// v4.9C: AI compression helpers.
//
// Each helper turns an engine payload into a SHORT, scan-friendly sentence.
// They reduce reading effort — they don't generate new content.
//
// Compliance: every output is run through sanitizeAdviceText, so the
// forbidden trading vocabulary cannot leak even if a future LLM provider
// produces it upstream.

import type {
  ConcentrationSummaryV4,
  FCNSystemicRiskSummaryV4,
  MarketEngineSummaryResponse,
  PortfolioEngineSummaryResponse,
  PortfolioMarketImpactSummaryV4,
  UnifiedIntelligenceScoreV4,
} from "./api";
import { sanitizeAdviceText } from "./intelligence-priority";
import type { SupportedLocale } from "../locales";

const STATE_LABEL_EN: Record<string, string> = {
  clear: "stable",
  watch: "on watch",
  elevated: "elevated",
  critical: "critical",
};

const STATE_LABEL_ZH: Record<string, string> = {
  clear: "穩定",
  watch: "需觀察",
  elevated: "升高",
  critical: "嚴重",
};

function stateLabel(value: string | null | undefined, locale: SupportedLocale): string {
  const v = String(value || "clear").toLowerCase();
  if (locale === "zh-TW" || locale === "zh-CN") {
    return STATE_LABEL_ZH[v] || v;
  }
  return STATE_LABEL_EN[v] || v;
}

function compress(text: string): string {
  return sanitizeAdviceText(text.replace(/\s+/g, " ").trim());
}

/** One-line headline about the portfolio's top risk. ≤ 110 chars. */
export function summarizeTopRisk(
  summary: PortfolioEngineSummaryResponse | null | undefined,
  locale: SupportedLocale,
): string {
  if (!summary) return "";
  const unified: UnifiedIntelligenceScoreV4 = summary.unified_score || {};
  const conc: ConcentrationSummaryV4 = summary.concentration || {};
  const fcn: FCNSystemicRiskSummaryV4 = summary.fcn_systemic_risk || {};
  const riskState = String(unified.risk_state || "clear").toLowerCase();

  const label = stateLabel(riskState, locale);
  const conLabel = conc.top_concentration_label || "";
  const conPct =
    typeof conc.concentration_score === "number"
      ? Math.round(conc.concentration_score)
      : null;
  const repeatedCount = Array.isArray(fcn.repeated_underlyings)
    ? fcn.repeated_underlyings.length
    : 0;
  const nearestKi =
    typeof fcn.nearest_ki_pct === "number" ? Math.round(fcn.nearest_ki_pct) : null;

  if (locale === "zh-TW" || locale === "zh-CN") {
    const parts: string[] = [`整體 ${label}`];
    if (conLabel && conPct !== null) parts.push(`${conLabel} ${conPct}`);
    if (nearestKi !== null && nearestKi <= 15) parts.push(`最近 KI ${nearestKi}%`);
    else if (repeatedCount >= 2) parts.push(`FCN 重複標的 ${repeatedCount}`);
    return compress(parts.join("｜"));
  }

  const parts: string[] = [`Overall ${label}`];
  if (conLabel && conPct !== null) parts.push(`${conLabel} ${conPct}`);
  if (nearestKi !== null && nearestKi <= 15) parts.push(`nearest KI ${nearestKi}%`);
  else if (repeatedCount >= 2) parts.push(`${repeatedCount} repeated FCN underlyings`);
  return compress(parts.join(" · "));
}

/** One-line headline about the market regime + volatility + macro. ≤ 110 chars. */
export function summarizeMarketState(
  market: MarketEngineSummaryResponse | null | undefined,
  locale: SupportedLocale,
): string {
  if (!market) return "";
  const regime = String(market.regime?.regime || "data_limited").toUpperCase();
  const vol = String(market.volatility?.overall_state || "normal").toLowerCase();
  const macro = market.macro_news || {};
  const topTheme =
    Array.isArray(macro.top_themes) && macro.top_themes.length > 0
      ? String(macro.top_themes[0].theme || "")
      : "";
  const impact: PortfolioMarketImpactSummaryV4 = market.portfolio_impact || {};
  const impactLabel = stateLabel(impact.overall_impact_level, locale);

  if (locale === "zh-TW" || locale === "zh-CN") {
    const parts: string[] = [`Regime ${regime}`];
    if (vol && vol !== "normal" && vol !== "data_limited") parts.push(`vol ${vol}`);
    if (topTheme) parts.push(`主導 ${topTheme}`);
    parts.push(`對組合影響 ${impactLabel}`);
    return compress(parts.join("｜"));
  }

  const parts: string[] = [`Regime ${regime}`];
  if (vol && vol !== "normal" && vol !== "data_limited") parts.push(`vol ${vol}`);
  if (topTheme) parts.push(`${topTheme} leading`);
  parts.push(`impact ${impactLabel}`);
  return compress(parts.join(" · "));
}

/** One-line FCN pressure headline. ≤ 110 chars. */
export function summarizeFCNPressure(
  fcn: FCNSystemicRiskSummaryV4 | null | undefined,
  locale: SupportedLocale,
): string {
  if (!fcn) return "";
  const level = stateLabel(fcn.risk_level, locale);
  const ki =
    typeof fcn.nearest_ki_pct === "number" ? Math.round(fcn.nearest_ki_pct) : null;
  const repeated = Array.isArray(fcn.repeated_underlyings)
    ? fcn.repeated_underlyings.length
    : 0;
  const cluster = Array.isArray(fcn.ki_cluster_symbols)
    ? fcn.ki_cluster_symbols.length
    : 0;

  if (locale === "zh-TW" || locale === "zh-CN") {
    const parts: string[] = [`FCN ${level}`];
    if (ki !== null) parts.push(`最近 KI ${ki}%`);
    if (cluster >= 2) parts.push(`KI 集中 ${cluster}`);
    if (repeated >= 2) parts.push(`重複標的 ${repeated}`);
    return compress(parts.join("｜"));
  }

  const parts: string[] = [`FCN ${level}`];
  if (ki !== null) parts.push(`nearest KI ${ki}%`);
  if (cluster >= 2) parts.push(`KI cluster ${cluster}`);
  if (repeated >= 2) parts.push(`${repeated} repeated underlyings`);
  return compress(parts.join(" · "));
}
