"use client";

import {
  FCNPositionResponse,
  PortfolioSummaryV2AResponse,
  SummaryResponse,
} from "../../lib/api";
import { sanitizeAdviceText } from "../../lib/intelligence-priority";
import { TerminalPanel } from "../layout/TerminalPanel";

type ScenarioRow = {
  key: string;
  label: string;
  exposure: string;
  implication: string;
  severity: "watch" | "elevated" | "critical" | "clear";
};

function numberOf(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function severityClass(state: ScenarioRow["severity"]) {
  if (state === "critical") return "border-red-400 text-red-200";
  if (state === "elevated") return "border-orange-400 text-orange-200";
  if (state === "watch") return "border-yellow-400 text-yellow-200";
  return "border-emerald-400 text-emerald-200";
}

/** v3F: lightweight scenario sensitivity, frontend-derived.
 *
 *  Inputs are existing /dashboard payload fields. Each row outputs a possible
 *  monitoring implication (not a trading instruction). Compliance-safe.
 */
export function ScenarioSensitivityPanel({
  summary,
  intelligenceSummary,
  fcnItems,
}: {
  summary: SummaryResponse | null;
  intelligenceSummary: PortfolioSummaryV2AResponse | null;
  fcnItems: FCNPositionResponse[];
}) {
  const total = numberOf(summary?.total_value);
  const cryptoValue = numberOf(summary?.crypto_value);
  const stockValue = numberOf(summary?.stock_value);
  const fcnValue = numberOf(summary?.fcn_value);
  const cryptoRatio = total > 0 ? cryptoValue / total : 0;
  const stockRatio = total > 0 ? stockValue / total : 0;
  const fcnRatio = total > 0 ? fcnValue / total : 0;
  const concentration = numberOf(intelligenceSummary?.concentration_score);
  const minKi = fcnItems.reduce<number | null>((acc, fcn) => {
    const raw =
      fcn.distance_to_KI ||
      fcn.distance_to_ki ||
      fcn.distance_to_ki_pct;
    const ki = numberOf(raw, NaN);
    if (!Number.isFinite(ki)) return acc;
    const kiPct = Math.abs(ki) <= 1 ? ki * 100 : ki;
    if (acc == null) return kiPct;
    return Math.min(acc, kiPct);
  }, null);

  const rows: ScenarioRow[] = [
    {
      key: "btc-10",
      label: "BTC -10%",
      exposure: `Crypto exposure ${(cryptoRatio * 100).toFixed(1)}%`,
      implication: sanitizeAdviceText(
        cryptoRatio >= 0.15
          ? "Crypto bucket is meaningful; monitor leverage and grid range. Possible drag on total NAV."
          : "Crypto exposure is small; possible impact remains modest. Continue to monitor.",
      ),
      severity: cryptoRatio >= 0.25 ? "elevated" : cryptoRatio >= 0.1 ? "watch" : "clear",
    },
    {
      key: "ai-10",
      label: "AI / chip basket -10%",
      exposure: `Equity exposure ${(stockRatio * 100).toFixed(1)}%`,
      implication: sanitizeAdviceText(
        concentration >= 50
          ? "Concentration is elevated; AI/chip drawdown may dominate short-term drift. Monitor closely."
          : "Equity sleeve is broad; sensitivity moderate. Continue to monitor headline flow.",
      ),
      severity: concentration >= 65 ? "elevated" : concentration >= 45 ? "watch" : "clear",
    },
    {
      key: "fcn-underlying-10",
      label: "Worst-of FCN underlying -10%",
      exposure: `FCN exposure ${(fcnRatio * 100).toFixed(1)}% · min KI ${
        minKi == null ? "n/a" : `${minKi.toFixed(1)}%`
      }`,
      implication: sanitizeAdviceText(
        minKi != null && minKi <= 10
          ? "Worst-of underlying already close to KI; -10% scenario may breach. Verify data and monitor."
          : minKi != null && minKi <= 20
            ? "Worst-of is within sensitive zone; possible KI proximity narrowing under shock."
            : "Worst-of distance to KI is comfortable; impact likely limited but should still be monitored.",
      ),
      severity:
        minKi != null && minKi <= 5
          ? "critical"
          : minKi != null && minKi <= 15
            ? "elevated"
            : minKi != null && minKi <= 30
              ? "watch"
              : "clear",
    },
    {
      key: "rate-shock",
      label: "Rate / macro shock",
      exposure: "Macro sensitivity",
      implication: sanitizeAdviceText(
        fcnRatio >= 0.15
          ? "FCN coupon assumptions sensitive to rates. Monitor macro calendar and upcoming observation dates."
          : "Macro shock impact moderate at current allocation. Continue to monitor calendar releases.",
      ),
      severity: fcnRatio >= 0.25 ? "elevated" : "watch",
    },
  ];

  return (
    <TerminalPanel
      title="Scenario sensitivity · risk awareness only"
      meta="hypothetical · not a trading instruction"
    >
      <div className="divide-y divide-zinc-900 border border-zinc-800">
        {rows.map((row) => (
          <div
            className="grid gap-2 px-3 py-2 text-xs md:grid-cols-[0.6fr_0.9fr_2fr_0.7fr]"
            key={row.key}
          >
            <span className="font-semibold text-zinc-100">{row.label}</span>
            <span className="font-mono text-[10px] text-zinc-500">{row.exposure}</span>
            <span className="text-zinc-300">{row.implication}</span>
            <span
              className={`border px-2 py-0.5 text-center font-mono text-[10px] uppercase ${severityClass(row.severity)}`}
            >
              {row.severity}
            </span>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
