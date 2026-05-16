"use client";

// Compact metric card. Scan-friendly, single value per card.

import type { ReactNode } from "react";

type Tone = "neutral" | "good" | "watch" | "elevated" | "critical";

const TONE_COLOR: Record<Tone, string> = {
  neutral: "text-zinc-100",
  good: "text-emerald-200",
  watch: "text-yellow-200",
  elevated: "text-orange-200",
  critical: "text-red-200",
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
      className={`min-w-0 border border-zinc-800 bg-black/30 px-3 py-2 ${className}`}
    >
      <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className={`mt-1 truncate text-lg font-semibold ${TONE_COLOR[tone]}`}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 truncate font-mono text-[10px] text-zinc-500">
          {hint}
        </div>
      )}
    </div>
  );
}
