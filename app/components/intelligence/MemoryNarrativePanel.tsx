"use client";

import {
  ReasoningSystemResponse,
  TimelineIntelligenceResponse,
} from "../../lib/api";
import { sanitizeAdviceText } from "../../lib/intelligence-priority";
import { TerminalPanel } from "../layout/TerminalPanel";

type Row = {
  label: string;
  value: string;
  tone: "neutral" | "good" | "bad";
};

function take(list: unknown, limit = 3): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, limit)
    .map((item) => sanitizeAdviceText(item));
}

function toneClass(tone: Row["tone"]) {
  if (tone === "good") return "text-emerald-200";
  if (tone === "bad") return "text-yellow-200";
  return "text-zinc-300";
}

/** v3F: memory narrative derived from timeline + reasoning snapshots.
 *
 *  No new backend call. When history is insufficient, the panel renders a
 *  consistent "history still accumulating" fallback rather than blanks.
 */
export function MemoryNarrativePanel({
  timeline,
  reasoning,
}: {
  timeline: TimelineIntelligenceResponse | null;
  reasoning: ReasoningSystemResponse | null;
}) {
  const isStale = Boolean(timeline?.is_stale);
  const weeklyChange =
    timeline?.timeline_summary ||
    reasoning?.timeline?.what_changed_this_week ||
    reasoning?.timeline?.what_changed_today ||
    "";

  const recurring = [
    ...take(reasoning?.themes?.dominant_themes, 2),
    ...take(timeline?.recurring_risks, 2),
    ...take(reasoning?.long_memory?.recurring_risk_themes, 2),
  ];

  const improving = [
    ...take(timeline?.improving_signals, 3),
    ...take(reasoning?.reasoning?.top_strengths, 2),
  ];

  const deteriorating = [
    ...take(timeline?.deteriorating_signals, 3),
    ...take(reasoning?.reasoning?.top_risks, 2),
  ];

  const dedup = (arr: string[]) => Array.from(new Set(arr));
  const recurringFinal = dedup(recurring).slice(0, 4);
  const improvingFinal = dedup(improving).slice(0, 4);
  const deterioratingFinal = dedup(deteriorating).slice(0, 4);

  const insufficient =
    !weeklyChange &&
    recurringFinal.length === 0 &&
    improvingFinal.length === 0 &&
    deterioratingFinal.length === 0;

  if (insufficient) {
    return (
      <TerminalPanel
        title="Memory narrative · 7d / 30d"
        meta="history still accumulating"
      >
        <div className="border border-dashed border-zinc-800 bg-black/30 px-3 py-3 font-mono text-xs leading-6 text-zinc-500">
          History still accumulating. Snapshots are recorded over time and this
          narrative becomes more confident as memory grows.
        </div>
      </TerminalPanel>
    );
  }

  const rows: Row[] = [
    {
      label: "THIS WEEK CHANGED",
      value: sanitizeAdviceText(weeklyChange || "Limited change this week."),
      tone: "neutral",
    },
    {
      label: "RECURRING RISK",
      value:
        recurringFinal.length > 0
          ? recurringFinal.join(" · ")
          : "No recurring risk theme detected.",
      tone: recurringFinal.length > 0 ? "bad" : "neutral",
    },
    {
      label: "IMPROVING SIGNAL",
      value:
        improvingFinal.length > 0
          ? improvingFinal.join(" · ")
          : "No improving signal yet.",
      tone: improvingFinal.length > 0 ? "good" : "neutral",
    },
    {
      label: "DETERIORATING SIGNAL",
      value:
        deterioratingFinal.length > 0
          ? deterioratingFinal.join(" · ")
          : "No deteriorating signal observed.",
      tone: deterioratingFinal.length > 0 ? "bad" : "neutral",
    },
  ];

  return (
    <TerminalPanel
      title="Memory narrative · 7d / 30d"
      meta={isStale ? "history accumulating" : "from snapshot memory"}
    >
      <div className="divide-y divide-zinc-900 border border-zinc-800">
        {rows.map((row) => (
          <div
            className="grid gap-2 px-3 py-2 text-xs md:grid-cols-[0.7fr_3fr]"
            key={row.label}
          >
            <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
              {row.label}
            </span>
            <span className={toneClass(row.tone)}>{row.value}</span>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
