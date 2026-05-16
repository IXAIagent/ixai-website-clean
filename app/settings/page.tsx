"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { TerminalPanel } from "../components/layout/TerminalPanel";
import {
  AccountResponse,
  BackendHealthResponse,
  getAccounts,
  getBackendHealth,
  getMySummary,
  getToken,
  SummaryResponse,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import {
  AlertMode,
  DefaultLandingPage,
  RiskInterpretationMode,
  SupportedLocale,
  usePreferences,
} from "../lib/preferences";

const localeOptions = [
  { code: "zh-TW", label: "繁體中文 zh-TW" },
  { code: "en", label: "English en" },
  { code: "ja", label: "日本語 ja" },
  { code: "ko", label: "한국어 ko" },
  { code: "zh-CN", label: "简体中文 zh-CN" },
];

const landingPages = [
  "dashboard",
  "portfolio",
  "fcn",
  "intelligence",
  "market",
  "alerts",
];

type ToggleKey =
  | "telegram"
  | "email"
  | "compactMode"
  | "terminalMode"
  | "advancedIntelligence";

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return fallback;
}

function decodeTokenEmail(token: string | null) {
  if (!token || typeof window === "undefined") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(base64)) as {
      email?: string;
      sub?: string;
      user_id?: string;
    };
    return decoded.email || decoded.sub || decoded.user_id || null;
  } catch {
    return null;
  }
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("active") || normalized.includes("healthy") || normalized.includes("ready")) {
    return "border-emerald-500/50 text-emerald-300";
  }
  if (normalized.includes("limited")) return "border-yellow-500/50 text-yellow-300";
  if (normalized.includes("not configured")) return "border-zinc-700 text-zinc-400";
  return "border-zinc-700 text-zinc-500";
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-3 border-b border-zinc-900 py-2 text-left"
      onClick={onChange}
      type="button"
    >
      <span>
        <span className="block text-sm text-zinc-200">{label}</span>
        <span className="block text-xs text-zinc-500">{description}</span>
      </span>
      <span
        className={`shrink-0 border px-2 py-1 font-mono text-[10px] ${
          checked ? "border-emerald-500/50 text-emerald-300" : "border-zinc-700 text-zinc-500"
        }`}
      >
        {checked ? "ON" : "OFF"}
      </span>
    </button>
  );
}

function SourceRow({ name, status, detail }: { name: string; status: string; detail: string }) {
  return (
    <div className="grid gap-2 border-b border-zinc-900 py-2 font-mono text-xs md:grid-cols-[1fr_auto]">
      <div>
        <div className="text-zinc-200">{name}</div>
        <div className="mt-1 text-[10px] text-zinc-600">{detail}</div>
      </div>
      <span className={`h-fit border px-2 py-1 text-[10px] uppercase ${statusClass(status)}`}>
        {status}
      </span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex justify-between gap-3 border-b border-zinc-900 py-2 font-mono text-xs">
      <span className="uppercase text-zinc-600">{label}</span>
      <span className="text-right text-zinc-300">{textValue(value)}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const { t } = useI18n();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [health, setHealth] = useState<BackendHealthResponse | null>(null);
  const [healthError, setHealthError] = useState("");
  const [lastChecked, setLastChecked] = useState("");

  useEffect(() => {
    async function load() {
      const [summaryData, accountData, healthData] = await Promise.all([
        getMySummary().catch(() => null),
        getAccounts().catch(() => ({ items: [] })),
        getBackendHealth().catch((err) => {
          setHealthError(err instanceof Error ? err.message : "health check failed");
          return null;
        }),
      ]);
      setSummary(summaryData);
      setAccounts(Array.isArray(accountData.items) ? accountData.items : []);
      setHealth(healthData);
      setLastChecked(new Date().toLocaleString());
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const userEmail = useMemo(() => decodeTokenEmail(getToken()), []);
  const currentAccount = accounts[0];
  const healthStatus = textValue(health?.status || (health?.ok ? "healthy" : null), healthError ? "unknown" : "unknown");
  const dataSources = [
    { name: "Yahoo Finance / yfinance", status: "Limited", detail: "Market data and news may be rate-limited by provider." },
    { name: "Binance", status: "Active", detail: "Crypto quote provider when network access is available." },
    { name: "Anthropic Claude", status: "Not configured", detail: "Optional AI summary provider; rule-based fallback remains active." },
    { name: "Telegram", status: "Not configured", detail: "Alert delivery channel placeholder." },
    { name: "Render Scheduler", status: "Limited", detail: "Cron-based intelligence snapshots; news can be skipped safely." },
    { name: "PostgreSQL", status: health?.database ? textValue(health.database) : "Unknown", detail: "Production persistence layer status depends on backend health." },
  ];

  function setToggle(key: ToggleKey) {
    if (key === "telegram") {
      updatePreferences({ notificationTelegram: !preferences.notificationTelegram });
      return;
    }
    if (key === "email") {
      updatePreferences({ notificationEmail: !preferences.notificationEmail });
      return;
    }
    if (key === "compactMode") {
      updatePreferences({ compactMode: !preferences.compactMode });
      return;
    }
    if (key === "terminalMode") {
      updatePreferences({ terminalMode: !preferences.terminalMode });
      return;
    }
    updatePreferences({ showAdvancedIntelligence: !preferences.showAdvancedIntelligence });
  }

  return (
    <AppShell
      title={t("page.settings")}
      subtitle="Workspace preferences, account context, data sources, system health, and compliance settings."
    >
      <div className="space-y-5">
        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <TerminalPanel title={t("settings.profile")} meta="account context">
            <MetricRow label="USER" value={userEmail || "token profile unavailable"} />
            <MetricRow label="ACCOUNT" value={currentAccount?.name || "Personal workspace"} />
            <MetricRow label="ACCOUNT ID" value={currentAccount?.id || "pending"} />
            <MetricRow label="WORKSPACE" value={summary?.portfolio_name || "Primary Portfolio"} />
            <MetricRow label="ROLE" value="owner / admin / viewer ready" />
            <Link
              className="mt-3 inline-block border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-emerald-400 hover:text-emerald-200"
              href="/accounts"
            >
              Manage accounts
            </Link>
          </TerminalPanel>

          <TerminalPanel title={t("settings.language")} meta="future i18n">
            <div className="grid gap-2">
              {localeOptions.map((option) => (
                <button
                  className={`flex items-center justify-between border px-3 py-2 text-left text-sm ${
                    preferences.locale === option.code
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                      : "border-zinc-800 text-zinc-400"
                  }`}
                  key={option.code}
                  onClick={() => updatePreferences({ locale: option.code as SupportedLocale })}
                  type="button"
                >
                  <span>{option.label}</span>
                  <span className="font-mono text-[10px]">{preferences.locale === option.code ? "SELECTED" : option.code}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 border border-zinc-800 bg-black/20 px-3 py-2 text-xs text-zinc-500">
              完整多語系支援即將加入。This setting is local UI state for now.
            </div>
          </TerminalPanel>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <TerminalPanel title={t("settings.notifications")} meta="persisted local preferences">
            <Toggle
              checked={preferences.notificationTelegram}
              description="Send critical portfolio alerts to Telegram when configured."
              label="Telegram alerts"
              onChange={() => setToggle("telegram")}
            />
            <Toggle
              checked={preferences.notificationEmail}
              description="Email alert delivery placeholder."
              label="Email alerts"
              onChange={() => setToggle("email")}
            />
            <label className="block border-b border-zinc-900 py-2">
              <span className="block text-sm text-zinc-200">Alert mode</span>
              <select
                className="mt-2 w-full border border-zinc-700 bg-black px-2 py-2 text-sm text-zinc-200"
                onChange={(event) => updatePreferences({ alertMode: event.target.value as AlertMode })}
                value={preferences.alertMode}
              >
                <option value="criticalOnly">Critical only</option>
                <option value="all">All alerts</option>
                <option value="dailyBrief">Daily brief</option>
              </select>
            </label>
          </TerminalPanel>

          <TerminalPanel title={t("settings.dataSources")} meta="safe placeholders">
            {dataSources.map((source) => (
              <SourceRow detail={source.detail} key={source.name} name={source.name} status={source.status} />
            ))}
          </TerminalPanel>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <TerminalPanel title={t("settings.system")} meta={healthStatus}>
            <MetricRow label="BACKEND HEALTH" value={healthStatus} />
            <MetricRow label="DATABASE READINESS" value={health?.database || "unknown"} />
            <MetricRow label="REQUEST STATUS" value={healthError ? "failed soft" : health ? "ok" : "unknown"} />
            <MetricRow label="LAST CHECKED" value={lastChecked || "pending"} />
            {healthError && (
              <div className="mt-3 border border-yellow-500/30 bg-yellow-950/10 px-3 py-2 text-xs text-yellow-200">
                Health endpoint unavailable: {healthError}
              </div>
            )}
          </TerminalPanel>

          <TerminalPanel title={t("settings.intelligence")} meta="risk interpretation only">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-zinc-800 bg-black/20 p-3">
                <div className="font-mono text-[10px] uppercase text-zinc-600">Scheduler Snapshot Interval</div>
                <div className="mt-1 text-sm text-zinc-300">60 minutes display placeholder</div>
              </div>
              <div className="border border-zinc-800 bg-black/20 p-3">
                <div className="font-mono text-[10px] uppercase text-zinc-600">Skip News In Scheduler</div>
                <div className="mt-1 text-sm text-zinc-300">Default safe mode: enabled</div>
              </div>
              <div className="border border-zinc-800 bg-black/20 p-3">
                <div className="font-mono text-[10px] uppercase text-zinc-600">Memory Window</div>
                <div className="mt-1 text-sm text-zinc-300">7d / 30d / 90d</div>
              </div>
              <label className="border border-zinc-800 bg-black/20 p-3">
                <span className="block font-mono text-[10px] uppercase text-zinc-600">Risk Mode Preference</span>
                <select
                  className="mt-2 w-full border border-zinc-700 bg-black px-2 py-2 text-sm text-zinc-200"
                  onChange={(event) => updatePreferences({ riskInterpretationMode: event.target.value as RiskInterpretationMode })}
                  value={preferences.riskInterpretationMode}
                >
                  <option value="conservative">Conservative interpretation</option>
                  <option value="balanced">Balanced interpretation</option>
                  <option value="aggressive">Aggressive interpretation</option>
                </select>
              </label>
            </div>
            <div className="mt-3 text-xs text-zinc-500">
              Interpretation mode changes future UX tone only and does not generate trading instruction.
            </div>
          </TerminalPanel>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <TerminalPanel title={t("settings.workspace")} meta="persisted local state">
            <label className="block border-b border-zinc-900 py-2">
              <span className="block text-sm text-zinc-200">Default landing page</span>
              <select
                className="mt-2 w-full border border-zinc-700 bg-black px-2 py-2 text-sm text-zinc-200"
                onChange={(event) => updatePreferences({ defaultLandingPage: event.target.value as DefaultLandingPage })}
                value={preferences.defaultLandingPage}
              >
                {landingPages.map((page) => (
                  <option key={page} value={page}>{`/${page}`}</option>
                ))}
              </select>
            </label>
            <Toggle
              checked={preferences.compactMode}
              description="Favor terminal density and compact rows."
              label="Compact mode"
              onChange={() => setToggle("compactMode")}
            />
            <Toggle
              checked={preferences.terminalMode}
              description="Use Bloomberg-like terminal visual hierarchy."
              label="Terminal mode"
              onChange={() => setToggle("terminalMode")}
            />
            <Toggle
              checked={preferences.showAdvancedIntelligence}
              description="Show advanced intelligence panels by default in future workspace."
              label="Show advanced intelligence"
              onChange={() => setToggle("advancedIntelligence")}
            />
            <button
              className="mt-3 border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-yellow-500/50 hover:text-yellow-200"
              onClick={resetPreferences}
              type="button"
            >
              Reset preferences
            </button>
          </TerminalPanel>

          <TerminalPanel title={t("settings.compliance")} meta="always visible">
            <div className="space-y-3 text-sm leading-6 text-zinc-300">
              <p>IXAI 提供風險情報與投資組合分析。</p>
              <p>IXAI 不提供個別買賣建議，不提供保證收益，也不提供自動交易指令。</p>
              <p>投資有風險，市場價格、匯率、FCN KI/KO 條件與加密資產波動都可能造成損失。</p>
              <p className="font-mono text-xs text-zinc-500">
                Risk intelligence only · 非交易指令 · No guaranteed return
              </p>
            </div>
          </TerminalPanel>
        </section>
      </div>
    </AppShell>
  );
}
