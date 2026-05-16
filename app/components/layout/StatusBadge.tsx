"use client";

// v4E: standardized status badge. Consumers pass an engine status
// (healthy / partial / degraded / unavailable / loading / stale) and the
// badge renders a translated label + consistent colour.

import { useI18n } from "../../lib/i18n";

export type StatusVariant =
  | "healthy"
  | "partial"
  | "degraded"
  | "unavailable"
  | "loading"
  | "stale"
  | "clear"
  | "watch"
  | "elevated"
  | "critical";

const COLOR_BY_VARIANT: Record<StatusVariant, string> = {
  healthy: "border-emerald-400 text-emerald-200",
  clear: "border-emerald-400 text-emerald-200",
  partial: "border-yellow-400 text-yellow-200",
  stale: "border-yellow-400 text-yellow-200",
  loading: "border-zinc-700 text-zinc-300",
  watch: "border-yellow-400 text-yellow-200",
  degraded: "border-orange-400 text-orange-200",
  elevated: "border-orange-400 text-orange-200",
  unavailable: "border-red-400 text-red-200",
  critical: "border-red-400 text-red-200",
};

function normalise(value: string | null | undefined): StatusVariant {
  const v = String(value || "").toLowerCase();
  if (v === "healthy" || v === "ok" || v === "fresh") return "healthy";
  if (v === "partial") return "partial";
  if (v === "degraded") return "degraded";
  if (v === "unavailable" || v === "error") return "unavailable";
  if (v === "loading") return "loading";
  if (v === "stale" || v === "not_ready") return "stale";
  if (v === "clear") return "clear";
  if (v === "watch") return "watch";
  if (v === "elevated") return "elevated";
  if (v === "critical") return "critical";
  return "loading";
}

export function StatusBadge({
  value,
  prefix,
  className = "",
}: {
  value: string | null | undefined;
  prefix?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const variant = normalise(value);
  const label = t(`status.${variant}`) || variant;
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${COLOR_BY_VARIANT[variant]} ${className}`}
    >
      {prefix ? `${prefix}: ${label}` : label}
    </span>
  );
}
