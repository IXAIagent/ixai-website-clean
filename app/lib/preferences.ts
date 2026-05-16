"use client";

import { useEffect, useMemo, useState } from "react";

export const PREFERENCES_STORAGE_KEY = "ixai_preferences_v1";

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
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(coercePreferences(preferences)),
    );
  } catch {
    // localStorage can fail in private mode; keep runtime safe.
  }
}

export function usePreferences() {
  const [preferences, setPreferencesState] = useState<IXAIPreferences>(defaultPreferences);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreferencesState(readPreferences());
      setHydrated(true);
    }, 0);

    function handleStorage(event: StorageEvent) {
      if (event.key === PREFERENCES_STORAGE_KEY) {
        setPreferencesState(readPreferences());
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const api = useMemo(
    () => ({
      preferences,
      hydrated,
      setPreferences(next: IXAIPreferences) {
        const normalized = coercePreferences(next);
        setPreferencesState(normalized);
        writePreferences(normalized);
      },
      updatePreferences(patch: Partial<IXAIPreferences>) {
        setPreferencesState((current) => {
          const normalized = coercePreferences({ ...current, ...patch });
          writePreferences(normalized);
          return normalized;
        });
      },
      resetPreferences() {
        setPreferencesState(defaultPreferences);
        writePreferences(defaultPreferences);
      },
    }),
    [hydrated, preferences],
  );

  return api;
}
