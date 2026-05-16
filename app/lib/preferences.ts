"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getToken,
  getUserPreferences,
  putUserPreferences,
  type UserPreferencesPayload,
} from "./api";

export const PREFERENCES_STORAGE_KEY = "ixai_preferences_v1";
export const PREFERENCES_CHANGED_EVENT = "ixai:preferences-changed";

export type SupportedLocale = "zh-TW" | "en" | "ja" | "ko" | "zh-CN";
export type DefaultLandingPage =
  | "dashboard"
  | "portfolio"
  | "fcn"
  | "intelligence"
  | "market"
  | "alerts";
export type AlertMode = "criticalOnly" | "all" | "dailyBrief";
export type RiskInterpretationMode = "conservative" | "balanced" | "aggressive";

export type IXAIPreferences = {
  locale: SupportedLocale;
  defaultLandingPage: DefaultLandingPage;
  compactMode: boolean;
  terminalMode: boolean;
  showAdvancedIntelligence: boolean;
  alertMode: AlertMode;
  notificationTelegram: boolean;
  notificationEmail: boolean;
  riskInterpretationMode: RiskInterpretationMode;
};

export const defaultPreferences: IXAIPreferences = {
  locale: "zh-TW",
  defaultLandingPage: "dashboard",
  compactMode: true,
  terminalMode: true,
  showAdvancedIntelligence: false,
  alertMode: "criticalOnly",
  notificationTelegram: false,
  notificationEmail: false,
  riskInterpretationMode: "balanced",
};

const landingPages: DefaultLandingPage[] = [
  "dashboard",
  "portfolio",
  "fcn",
  "intelligence",
  "market",
  "alerts",
];
const locales: SupportedLocale[] = ["zh-TW", "en", "ja", "ko", "zh-CN"];
const alertModes: AlertMode[] = ["criticalOnly", "all", "dailyBrief"];
const riskModes: RiskInterpretationMode[] = ["conservative", "balanced", "aggressive"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function coercePreferences(value: unknown): IXAIPreferences {
  if (!isRecord(value)) return defaultPreferences;

  return {
    locale: locales.includes(value.locale as SupportedLocale)
      ? (value.locale as SupportedLocale)
      : defaultPreferences.locale,
    defaultLandingPage: landingPages.includes(value.defaultLandingPage as DefaultLandingPage)
      ? (value.defaultLandingPage as DefaultLandingPage)
      : defaultPreferences.defaultLandingPage,
    compactMode:
      typeof value.compactMode === "boolean"
        ? value.compactMode
        : defaultPreferences.compactMode,
    terminalMode:
      typeof value.terminalMode === "boolean"
        ? value.terminalMode
        : defaultPreferences.terminalMode,
    showAdvancedIntelligence:
      typeof value.showAdvancedIntelligence === "boolean"
        ? value.showAdvancedIntelligence
        : defaultPreferences.showAdvancedIntelligence,
    alertMode: alertModes.includes(value.alertMode as AlertMode)
      ? (value.alertMode as AlertMode)
      : defaultPreferences.alertMode,
    notificationTelegram:
      typeof value.notificationTelegram === "boolean"
        ? value.notificationTelegram
        : defaultPreferences.notificationTelegram,
    notificationEmail:
      typeof value.notificationEmail === "boolean"
        ? value.notificationEmail
        : defaultPreferences.notificationEmail,
    riskInterpretationMode: riskModes.includes(value.riskInterpretationMode as RiskInterpretationMode)
      ? (value.riskInterpretationMode as RiskInterpretationMode)
      : defaultPreferences.riskInterpretationMode,
  };
}

export function landingPath(page: DefaultLandingPage) {
  return `/${page}`;
}

export function readPreferences(): IXAIPreferences {
  if (typeof window === "undefined") return defaultPreferences;

  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return defaultPreferences;
    return coercePreferences(JSON.parse(raw));
  } catch {
    return defaultPreferences;
  }
}

export function writePreferences(preferences: IXAIPreferences) {
  if (typeof window === "undefined") return;

  try {
    const normalized = coercePreferences(preferences);
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(PREFERENCES_CHANGED_EVENT, { detail: normalized }));
  } catch {
    // localStorage can fail in private mode; keep runtime safe.
  }
}

// ---------------------------------------------------------------------------
// v3D: backend <-> local sync helpers (snake_case <-> camelCase mapping).
// ---------------------------------------------------------------------------
function backendToLocal(payload: UserPreferencesPayload | null | undefined): Partial<IXAIPreferences> {
  if (!payload) return {};
  const patch: Partial<IXAIPreferences> = {};
  if (typeof payload.locale === "string" && locales.includes(payload.locale as SupportedLocale)) {
    patch.locale = payload.locale as SupportedLocale;
  }
  if (
    typeof payload.default_landing_page === "string" &&
    landingPages.includes(payload.default_landing_page as DefaultLandingPage)
  ) {
    patch.defaultLandingPage = payload.default_landing_page as DefaultLandingPage;
  }
  if (typeof payload.compact_mode === "boolean") patch.compactMode = payload.compact_mode;
  if (typeof payload.terminal_mode === "boolean") patch.terminalMode = payload.terminal_mode;
  if (typeof payload.show_advanced_intelligence === "boolean") {
    patch.showAdvancedIntelligence = payload.show_advanced_intelligence;
  }
  if (
    typeof payload.alert_mode === "string" &&
    alertModes.includes(payload.alert_mode as AlertMode)
  ) {
    patch.alertMode = payload.alert_mode as AlertMode;
  }
  if (typeof payload.notification_telegram === "boolean") {
    patch.notificationTelegram = payload.notification_telegram;
  }
  if (typeof payload.notification_email === "boolean") {
    patch.notificationEmail = payload.notification_email;
  }
  if (
    typeof payload.risk_interpretation_mode === "string" &&
    riskModes.includes(payload.risk_interpretation_mode as RiskInterpretationMode)
  ) {
    patch.riskInterpretationMode = payload.risk_interpretation_mode as RiskInterpretationMode;
  }
  return patch;
}

function localToBackend(preferences: IXAIPreferences): UserPreferencesPayload {
  return {
    locale: preferences.locale,
    default_landing_page: preferences.defaultLandingPage,
    compact_mode: preferences.compactMode,
    terminal_mode: preferences.terminalMode,
    show_advanced_intelligence: preferences.showAdvancedIntelligence,
    alert_mode: preferences.alertMode,
    notification_telegram: preferences.notificationTelegram,
    notification_email: preferences.notificationEmail,
    risk_interpretation_mode: preferences.riskInterpretationMode,
  };
}

/** Best-effort backend hydration. Returns null on any failure so callers
 *  fall back to existing localStorage state without breaking the UI. */
export async function loadPreferencesFromBackend(): Promise<UserPreferencesPayload | null> {
  if (typeof window === "undefined") return null;
  if (!getToken()) return null;
  try {
    return await getUserPreferences();
  } catch {
    return null;
  }
}

/** Best-effort backend write. Never rejects. */
export async function savePreferencesToBackend(
  preferences: IXAIPreferences,
  extras?: Pick<UserPreferencesPayload, "active_account_id" | "active_portfolio_id">,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!getToken()) return;
  try {
    await putUserPreferences({ ...localToBackend(preferences), ...(extras ?? {}) });
  } catch {
    // Swallow: localStorage is the source of truth for the UI.
  }
}

/** Push only the active account/portfolio context to backend. Used by
 *  AppShell-style code when the user switches portfolio. Safe to call from
 *  anywhere; failures are silent. */
export async function syncActiveContextToBackend(
  activeAccountId: string,
  activePortfolioId: string,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!getToken()) return;
  try {
    await putUserPreferences({
      active_account_id: activeAccountId || null,
      active_portfolio_id: activePortfolioId || null,
    });
  } catch {
    // Swallow: workspace context is also in localStorage; this is a hint only.
  }
}

export function usePreferences() {
  const [preferences, setPreferencesState] = useState<IXAIPreferences>(defaultPreferences);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Phase 1: hydrate from localStorage (fast, synchronous, offline-safe).
    const timer = window.setTimeout(() => {
      const local = readPreferences();
      if (cancelled) return;
      setPreferencesState(local);
      setHydrated(true);

      // Phase 2: best-effort backend pull. Merge backend over local.
      // Failures are swallowed; UI keeps the localStorage values.
      loadPreferencesFromBackend()
        .then((backendPayload) => {
          if (cancelled || !backendPayload) return;
          const patch = backendToLocal(backendPayload);
          if (Object.keys(patch).length === 0) return;
          setPreferencesState((current) => {
            const merged = coercePreferences({ ...current, ...patch });
            writePreferences(merged);
            return merged;
          });
        })
        .catch(() => {
          // already swallowed inside loadPreferencesFromBackend
        });
    }, 0);

    function handleStorage(event: StorageEvent) {
      if (event.key === PREFERENCES_STORAGE_KEY) {
        setPreferencesState(readPreferences());
      }
    }
    function handlePreferencesChanged() {
      setPreferencesState(readPreferences());
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(PREFERENCES_CHANGED_EVENT, handlePreferencesChanged);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(PREFERENCES_CHANGED_EVENT, handlePreferencesChanged);
    };
  }, []);

  const api = useMemo(
    () => ({
      preferences,
      hydrated,
      setPreferences(next: IXAIPreferences) {
        const normalized = coercePreferences(next);
        // Local first so UI updates immediately even if offline.
        setPreferencesState(normalized);
        writePreferences(normalized);
        // Best-effort backend write; failure must not break the UI.
        void savePreferencesToBackend(normalized);
      },
      updatePreferences(patch: Partial<IXAIPreferences>) {
        setPreferencesState((current) => {
          const normalized = coercePreferences({ ...current, ...patch });
          writePreferences(normalized);
          void savePreferencesToBackend(normalized);
          return normalized;
        });
      },
      resetPreferences() {
        setPreferencesState(defaultPreferences);
        writePreferences(defaultPreferences);
        void savePreferencesToBackend(defaultPreferences);
      },
    }),
    [hydrated, preferences],
  );

  return api;
}
