"use client";

// Compact metric card. Scan-friendly, single value per card.
//
// v1.18.5: tokenised. Tone now maps to --ixai-risk-* / --ixai-text-strong;
// chrome uses --ixai-border-subtle + --ixai-surface-card.

import type { ReactNode } from "react";

type Tone = "neutral" | "good" | "watch" | "elevated" | "critical";

const TONE_COLOR: Record<Tone, string> = {
  neutral: "text-[var(--ixai-text-strong)]",
  good: "text-[var(--ixai-risk-clear)]",
  watch: "text-[var(--ixai-risk-watch)]",
  elevated: "text-[var(--ixai-risk-elevated)]",
  critical: "text-[var(--ixai-risk-critical)]",
};

export function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
  className = "",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-card)] px-3 py-2 ${className}`}
    >
      <div className="ds-label-sm text-[var(--ixai-text-subtle)]">{label}</div>
      <div className={`mt-1 truncate text-lg font-semibold ${TONE_COLOR[tone]}`}>
        {value}
      </div>
      {hint && (
        <div className="ds-mono-sm mt-1 truncate text-[var(--ixai-text-subtle)]">
          {hint}
        </div>
      )}
    </div>
  );
}
