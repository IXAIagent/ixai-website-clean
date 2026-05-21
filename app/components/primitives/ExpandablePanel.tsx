"use client";

// v4.9A: progressive disclosure primitive.
// Wraps deep analysis content in a native <details> element so:
//   - Default collapsed on mobile + reduces vertical noise.
//   - Browser-native keyboard accessibility (Enter/Space).
//   - No JS state — SSR-safe and zero hydration cost.
//   - Works inside TerminalPanel or standalone.
//
// v1.18.5: tokenised chrome — --ixai-border-subtle / --ixai-surface-card;
// header text uses --ixai-text-strong, meta uses --ixai-text-subtle.

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
      className={`group min-w-0 overflow-hidden border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-card)] ${className}`}
      open={defaultExpanded}
    >
      <summary
        className="flex cursor-pointer select-none items-baseline justify-between gap-2 px-3 py-2 marker:hidden transition hover:bg-[rgba(176,141,87,0.06)]"
        // browsers show a default marker; hide it for our chevron
        style={{ listStyle: "none" }}
      >
        <span className="flex items-baseline gap-2">
          <span className="ds-mono-sm text-[var(--ixai-text-subtle)] transition group-open:rotate-90">
            ›
          </span>
          <span className="ds-heading-sm text-[var(--ixai-text-strong)]">
            {title}
          </span>
        </span>
        {meta && (
          <span className="ds-label-sm text-[var(--ixai-text-subtle)]">
            {meta}
          </span>
        )}
      </summary>
      <div className="border-t border-[var(--ixai-border-subtle)] px-3 py-3">
        {children}
      </div>
    </details>
  );
}
