"use client";

// Priority-band divider. Quietly separates major dashboard sections
// without adding visual weight.
//
// v1.18.5: tokenised — ds-label-sm + --ixai-text-subtle for the label,
// --ixai-border-subtle for the rule.

export function SectionDivider({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 pt-2">
      <span className="ds-label-sm text-[var(--ixai-text-subtle)]">{label}</span>
      <span className="h-px flex-1 bg-[var(--ixai-border-subtle)]" aria-hidden />
      {hint && (
        <span className="ds-label-sm text-[var(--ixai-text-subtle)]">{hint}</span>
      )}
    </div>
  );
}
