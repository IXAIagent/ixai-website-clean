"use client";

// v4.9A: priority-band divider. Quietly separates P0 / P1 / P2 sections
// without adding visual weight.

export function SectionDivider({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 pt-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>
      <span className="h-px flex-1 bg-zinc-800" aria-hidden />
      {hint && (
        <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-600">
          {hint}
        </span>
      )}
    </div>
  );
}
