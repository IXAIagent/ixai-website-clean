import { ReactNode } from "react";

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
    <section className={`min-w-0 overflow-hidden border border-zinc-800 bg-zinc-950 p-3 ${className}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {meta && (
          <span className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">
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
    <div className="min-w-0 overflow-hidden border border-dashed border-zinc-700 px-3 py-2 font-mono text-xs text-zinc-500">
      {children}
    </div>
  );
}
