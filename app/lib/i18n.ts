"use client";

// v4D: locale registry + nested-key lookup. Backward-compatible with the
// v3E flat-key shape ("dashboard.aiOverview") AND with true nested objects
// ({ dashboard: { onboarding: { step1: "..." } } }). Missing keys fall
// back through:
//   requested locale namespace → en namespace → key string itself.

import {
  FALLBACK_LOCALE,
  registry,
  type Dictionary,
  type SupportedLocale,
} from "../locales";
import { defaultPreferences, usePreferences } from "./preferences";

export type { SupportedLocale } from "../locales";

export const HEADER_NAME = "X-IXAI-Locale";

function safeDictionary(locale: SupportedLocale): Dictionary {
  return registry[locale] || registry[FALLBACK_LOCALE];
}

/**
 * Walk a dotted path against any plain object. Each segment is tried both
 * (a) as the next nested object key and (b) as part of a flat-within-parent
 * compound key. This lets the resolver handle three storage styles:
 *
 *   { dashboard: { aiOverview: "..." } }
 *   { dashboard: { "onboarding.step1": "..." } }    // v3E legacy shape
 *   { dashboard: { onboarding: { step1: "..." } } } // pure nested
 *
 * Returns undefined on any miss; never throws.
 *
 * Exported separately for unit-testability and so callers can implement
 * their own fallback strategies without re-importing the locale state.
 */
export function resolveNestedKey(
  source: unknown,
  path: string,
): string | undefined {
  if (typeof path !== "string" || path.length === 0) return undefined;
  if (!source || typeof source !== "object") return undefined;
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return undefined;

  return walk(source as Record<string, unknown>, parts);
}

function walk(
  cursor: Record<string, unknown> | string | undefined,
  parts: string[],
): string | undefined {
  if (parts.length === 0) {
    return typeof cursor === "string" ? cursor : undefined;
  }
  if (!cursor || typeof cursor !== "object") return undefined;

  // 1) Try the longest-prefix flat key. This handles legacy v3E entries
  //    like { "onboarding.step1": "..." } stored under a parent namespace.
  for (let split = parts.length; split >= 1; split--) {
    const joined = parts.slice(0, split).join(".");
    const candidate = (cursor as Record<string, unknown>)[joined];
    if (typeof candidate === "string" && split === parts.length) {
      return candidate;
    }
    if (
      candidate &&
      typeof candidate === "object" &&
      split < parts.length
    ) {
      const tail = walk(candidate as Record<string, unknown>, parts.slice(split));
      if (typeof tail === "string") return tail;
    }
  }

  return undefined;
}

export function translate(
  key: string,
  locale: SupportedLocale = defaultPreferences.locale,
): string {
  const primary = resolveNestedKey(safeDictionary(locale), key);
  if (primary !== undefined) return primary;
  if (locale !== FALLBACK_LOCALE) {
    const fallback = resolveNestedKey(safeDictionary(FALLBACK_LOCALE), key);
    if (fallback !== undefined) return fallback;
  }
  return key;
}

export function useI18n() {
  const { preferences } = usePreferences();
  const locale = (preferences.locale || defaultPreferences.locale) as SupportedLocale;
  return {
    locale,
    t(key: string) {
      return translate(key, locale);
    },
  };
}
