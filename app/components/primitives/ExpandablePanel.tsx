"use client";

// v4.9A: progressive disclosure primitive.
// Wraps deep / P2 content in a native <details> element so:
//   - Default collapsed on mobile + reduces vertical noise.
//   - Browser-native keyboard accessibility (Enter/Space).
//   - No JS state — SSR-safe and zero hydration cost.
//   - Works inside TerminalPanel or standalone.

import type { ReactNode } from "react";

export function ExpandablePanel({
  title,
  meta,
  defaultExpanded = false,
  children,
  className = "",
}: {
  title: string;
  meta?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      className={`group min-w-0 overflow-hidden border border-zinc-800 bg-zinc-950/60 ${className}`}
      open={defaultExpanded}
    >
      <summary
        className="flex cursor-pointer select-none items-baseline justify-between gap-2 px-3 py-2 marker:hidden hover:bg-zinc-900/60"
        // browsers show a default marker; hide it for our chevron
        style={{ listStyle: "none" }}
      >
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500 transition group-open:rotate-90">
            ›
          </span>
          <span className="text-sm font-semibold text-zinc-200">{title}</span>
        </span>
        {meta && (
          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            {meta}
          </span>
        )}
      </summary>
      <div className="border-t border-zinc-800 px-3 py-3">{children}</div>
    </details>
  );
}
