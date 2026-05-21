import { ReactNode } from "react";

// v1.18.5: tokenised. Panel chrome now uses --ixai-surface-card +
// --ixai-border-subtle instead of bg-zinc-950 / border-zinc-800, so the
// panel inherits the brand dark forest surface rather than generic neutral.

export function TerminalPanel({
  title,
  meta,
  children,
  className = "",
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-card)] p-3 ${className}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="ds-heading-md text-[var(--ixai-text-strong)]">{title}</h2>
        {meta && (
          <span className="ds-label-sm text-[var(--ixai-text-subtle)]">
            {meta}
          </span>
        )}
      </div>
      <div className="mt-3 min-w-0">{children}</div>
    </section>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <div className="ds-mono-sm min-w-0 overflow-hidden border border-dashed border-[var(--ixai-border-subtle)] px-3 py-2 text-[var(--ixai-text-subtle)]">
      {children}
    </div>
  );
}
