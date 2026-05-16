"use client";

// v4.9A: dedicated risk-level pill. Thin wrapper over StatusBadge so risk
// vs operational-status semantics stay separate in the call sites.

import { useI18n } from "../../lib/i18n";

type RiskLevel = "clear" | "watch" | "elevated" | "critical";

const TONE_BORDER: Record<RiskLevel, string> = {
  clear: "border-emerald-400 text-emerald-200",
  watch: "border-yellow-400 text-yellow-200",
  elevated: "border-orange-400 text-orange-200",
  critical: "border-red-400 text-red-200",
};

function normalise(value: string | null | undefined): RiskLevel {
  const v = String(value || "").toLowerCase();
  if (v === "critical" || v === "high") return "critical";
  if (v === "elevated") return "elevated";
  if (v === "watch" || v === "medium") return "watch";
  return "clear";
}

export function RiskPill({
  level,
  prefix,
  className = "",
}: {
  level: string | null | undefined;
  prefix?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const variant = normalise(level);
  const label = t(`status.${variant}`) || variant;
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${TONE_BORDER[variant]} ${className}`}
    >
      {prefix ? `${prefix}: ${label}` : label}
    </span>
  );
}
