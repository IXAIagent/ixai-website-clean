"use client";

// v4D: locale-aware Intl helpers. All wrappers fail-soft — they catch
// every Intl exception and fall back to a sensible plain-text rendering.

import type { SupportedLocale } from "../locales";

function safeLocale(locale: SupportedLocale | string | null | undefined): string {
  return typeof locale === "string" && locale.trim() ? locale : "en";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function formatCurrency(
  value: unknown,
  locale: SupportedLocale | string,
  currency = "USD",
): string {
  const num = toNumber(value);
  if (num == null) return "-";
  try {
    return new Intl.NumberFormat(safeLocale(locale), {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `$${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
}

export function formatNumber(
  value: unknown,
  locale: SupportedLocale | string,
  options?: Intl.NumberFormatOptions,
): string {
  const num = toNumber(value);
  if (num == null) return "-";
  try {
    return new Intl.NumberFormat(safeLocale(locale), options).format(num);
  } catch {
    return num.toLocaleString("en-US");
  }
}

export function formatPercent(
  value: unknown,
  locale: SupportedLocale | string,
  options?: Intl.NumberFormatOptions,
): string {
  const num = toNumber(value);
  if (num == null) return "-";
  // Inputs may be either fraction (0.42) or percentage (42). Detect.
  const normalised = Math.abs(num) <= 1 ? num : num / 100;
  try {
    return new Intl.NumberFormat(safeLocale(locale), {
      style: "percent",
      maximumFractionDigits: 1,
      ...(options ?? {}),
    }).format(normalised);
  } catch {
    return `${(normalised * 100).toFixed(1)}%`;
  }
}

export function formatDate(
  value: unknown,
  locale: SupportedLocale | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "-";
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else {
    return "-";
  }
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(safeLocale(locale), {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(options ?? {}),
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function formatRelativeTime(
  fromIso: unknown,
  locale: SupportedLocale | string,
  reference: Date = new Date(),
): string {
  if (typeof fromIso !== "string" || !fromIso.trim()) return "-";
  const target = new Date(fromIso);
  if (Number.isNaN(target.getTime())) return fromIso;
  const deltaSeconds = Math.round((target.getTime() - reference.getTime()) / 1000);
  const absSec = Math.abs(deltaSeconds);
  let value = deltaSeconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  if (absSec >= 86400) {
    value = Math.round(deltaSeconds / 86400);
    unit = "day";
  } else if (absSec >= 3600) {
    value = Math.round(deltaSeconds / 3600);
    unit = "hour";
  } else if (absSec >= 60) {
    value = Math.round(deltaSeconds / 60);
    unit = "minute";
  }
  try {
    return new Intl.RelativeTimeFormat(safeLocale(locale), { numeric: "auto" }).format(value, unit);
  } catch {
    return target.toISOString();
  }
}

export function formatLargeNumber(
  value: unknown,
  locale: SupportedLocale | string,
): string {
  const num = toNumber(value);
  if (num == null) return "-";
  try {
    return new Intl.NumberFormat(safeLocale(locale), {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  } catch {
    return num.toLocaleString("en-US");
  }
}
