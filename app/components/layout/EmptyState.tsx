"use client";

import Link from "next/link";
import { ReactNode } from "react";

export type EmptyStateAction = {
  label: string;
  href: string;
};

/** v3E: unified empty / fallback state across major workspaces.
 *
 *  Distinct from `EmptyLine` (inline, single-line): this is for the
 *  whole-panel case ("no portfolio yet", "no FCN", "timeline accumulating").
 *  Stays in terminal style: monospace meta, square dashed border, no chrome.
 *
 *  v1.18.5: tokenised — uses --ixai-border-subtle and --ixai-text-* so the
 *  card sits on the dark forest surface coherently. Action hover uses gold
 *  tint instead of off-brand emerald.
 */
export function EmptyState({
  title,
  hint,
  meta,
  actions,
  children,
}: {
  title: string;
  hint?: string;
  meta?: string;
  actions?: EmptyStateAction[];
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0 overflow-hidden border border-dashed border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-card)] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="ds-heading-sm text-[var(--ixai-text-strong)]">{title}</h3>
        {meta && (
          <span className="ds-label-sm text-[var(--ixai-text-subtle)]">
            {meta}
          </span>
        )}
      </div>
      {hint && (
        <p className="ds-mono-sm mt-2 text-[var(--ixai-text-muted)]">{hint}</p>
      )}
      {actions && actions.length > 0 && (
        <div className="ds-mono-sm mt-3 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              className="border border-[var(--ixai-border-subtle)] px-3 py-1.5 text-[var(--ixai-text-muted)] transition hover:border-[var(--ixai-accent)] hover:text-[var(--ixai-cream)]"
              href={action.href}
              key={`${action.href}-${action.label}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
