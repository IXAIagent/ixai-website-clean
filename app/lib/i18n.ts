"use client";

// v4D: locale registry + nested-key lookup. Backward-compatible with the
// v3E flat-key shape ("dashboard.aiOverview") thanks to dotted-path
// traversal. Missing keys fall back through:
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
 * Resolve a dotted key against a dictionary.
 * Supports namespace.key and namespace.group.subkey, but flattening at one
 * level matches the legacy v3E shape (e.g. "dashboard.onboarding.step1"
 * stored as { dashboard: { "onboarding.step1": "..." } }).
 */
function lookup(dict: Dictionary, key: string): string | undefined {
  if (!key) return undefined;
  const parts = key.split(".");
  if (parts.length < 2) return undefined;
  const namespace = parts[0] as keyof Dictionary;
  const rest = parts.slice(1).join(".");
  const ns = dict[namespace];
  if (!ns) return undefined;
  const direct = ns[rest];
  if (typeof direct === "string") return direct;
  // nested object support: { dashboard: { onboarding: { step1: "..." } } }
  if (parts.length >= 3) {
    let cursor: unknown = ns;
    for (const segment of parts.slice(1)) {
      if (!cursor || typeof cursor !== "object") return undefined;
      cursor = (cursor as Record<string, unknown>)[segment];
    }
    return typeof cursor === "string" ? cursor : undefined;
  }
  return undefined;
}

export function translate(
  key: string,
  locale: SupportedLocale = defaultPreferences.locale,
): string {
  const primary = lookup(safeDictionary(locale), key);
  if (primary !== undefined) return primary;
  const fallback = lookup(safeDictionary(FALLBACK_LOCALE), key);
  if (fallback !== undefined) return fallback;
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
