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
    <div className="min-w-0 overflow-hidden border border-dashed border-zinc-700 bg-black/20 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {meta && (
          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            {meta}
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-2 font-mono text-xs leading-5 text-zinc-500">{hint}</p>
      )}
      {actions && actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
          {actions.map((action) => (
            <Link
              className="border border-zinc-700 px-3 py-1.5 text-zinc-300 transition hover:border-emerald-400/60 hover:text-emerald-200"
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
