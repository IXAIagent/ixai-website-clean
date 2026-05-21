"use client";

// v4.9A: single-line, scan-friendly insight. Used to surface 1-line
// compressed findings (from summarize* helpers) without a full panel.
//
// v1.18.5: tokenised tones via --ixai-risk-* + --ixai-text-muted. Mono
// stays — Bloomberg-terminal feel intentional for insight quotes.

import type { ReactNode } from "react";

type Tone = "neutral" | "watch" | "elevated" | "critical" | "good";

const TONE_STYLE: Record<Tone, string> = {
  neutral: "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-muted)]",
  good: "border-[var(--ixai-risk-clear)]/60 text-[var(--ixai-risk-clear)]",
  watch: "border-[var(--ixai-risk-watch)]/60 text-[var(--ixai-risk-watch)]",
  elevated: "border-[var(--ixai-risk-elevated)]/60 text-[var(--ixai-risk-elevated)]",
  critical: "border-[var(--ixai-risk-critical)]/60 text-[var(--ixai-risk-critical)]",
};

export function InlineInsight({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: Tone;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`ds-mono-sm min-w-0 overflow-hidden border-l-2 bg-[var(--ixai-surface-card)] px-3 py-2 ${TONE_STYLE[tone]}`}
    >
      {icon && <span className="mr-2 text-[var(--ixai-text-subtle)]">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}
