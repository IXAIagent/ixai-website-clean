"use client";

// v4E: standardized status badge. Consumers pass an engine status
// (healthy / partial / degraded / unavailable / loading / stale) and the
// badge renders a translated label + consistent colour.
//
// v1.18.5: tokenised tone palette — uses --ixai-risk-* variables so badges
// match the calm institutional palette instead of neon emerald/yellow/red.

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
  healthy: "border-[var(--ixai-risk-clear)]/60 text-[var(--ixai-risk-clear)]",
  clear: "border-[var(--ixai-risk-clear)]/60 text-[var(--ixai-risk-clear)]",
  partial: "border-[var(--ixai-risk-watch)]/60 text-[var(--ixai-risk-watch)]",
  stale: "border-[var(--ixai-risk-watch)]/60 text-[var(--ixai-risk-watch)]",
  loading: "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-muted)]",
  watch: "border-[var(--ixai-risk-watch)]/60 text-[var(--ixai-risk-watch)]",
  degraded: "border-[var(--ixai-risk-elevated)]/60 text-[var(--ixai-risk-elevated)]",
  elevated: "border-[var(--ixai-risk-elevated)]/60 text-[var(--ixai-risk-elevated)]",
  unavailable: "border-[var(--ixai-risk-critical)]/60 text-[var(--ixai-risk-critical)]",
  critical: "border-[var(--ixai-risk-critical)]/60 text-[var(--ixai-risk-critical)]",
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
      className={`ds-label-sm inline-block border px-2 py-0.5 ${COLOR_BY_VARIANT[variant]} ${className}`}
    >
      {prefix ? `${prefix}: ${label}` : label}
    </span>
  );
}
