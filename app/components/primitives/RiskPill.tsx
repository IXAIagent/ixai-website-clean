"use client";

// v4.9A: dedicated risk-level pill. Thin wrapper over StatusBadge so risk
// vs operational-status semantics stay separate in the call sites.
//
// v1.18.5: tokenised tones — same risk colour ramp as StatusBadge.

import { useI18n } from "../../lib/i18n";

type RiskLevel = "clear" | "watch" | "elevated" | "critical";

const TONE_BORDER: Record<RiskLevel, string> = {
  clear: "border-[var(--ixai-risk-clear)]/60 text-[var(--ixai-risk-clear)]",
  watch: "border-[var(--ixai-risk-watch)]/60 text-[var(--ixai-risk-watch)]",
  elevated: "border-[var(--ixai-risk-elevated)]/60 text-[var(--ixai-risk-elevated)]",
  critical: "border-[var(--ixai-risk-critical)]/60 text-[var(--ixai-risk-critical)]",
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
      className={`ds-label-sm inline-block border px-2 py-0.5 ${TONE_BORDER[variant]} ${className}`}
    >
      {prefix ? `${prefix}: ${label}` : label}
    </span>
  );
}
