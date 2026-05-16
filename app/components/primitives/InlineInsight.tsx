"use client";

// v4.9A: single-line, scan-friendly insight. Used to surface 1-line
// compressed findings (from summarize* helpers) without a full panel.

import type { ReactNode } from "react";

type Tone = "neutral" | "watch" | "elevated" | "critical" | "good";

const TONE_STYLE: Record<Tone, string> = {
  neutral: "border-zinc-700 text-zinc-300",
  good: "border-emerald-400/60 text-emerald-200",
  watch: "border-yellow-400/60 text-yellow-200",
  elevated: "border-orange-400/60 text-orange-200",
  critical: "border-red-400/60 text-red-200",
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
      className={`min-w-0 overflow-hidden border-l-2 bg-black/20 px-3 py-2 font-mono text-xs leading-5 ${TONE_STYLE[tone]}`}
    >
      {icon && <span className="mr-2 text-zinc-500">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}
