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
import { ixaiIdentity } from "../lib/identity";
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
    return "border-[var(--ixai-accent)]/50 text-[var(--ixai-risk-clear)]";
  }
  if (normalized.includes("limited")) return "border-[var(--ixai-risk-watch)]/50 text-[var(--ixai-risk-watch)]";
  if (normalized.includes("not configured")) return "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-muted)]";
  return "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-subtle)]";
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
      className="flex w-full items-center justify-between gap-3 border-b border-[var(--ixai-border-subtle)] py-2 text-left"
      onClick={onChange}
      type="button"
    >
      <span>
        <span className="block text-sm text-[var(--ixai-text-strong)]">{label}</span>
        <span className="block text-xs text-[var(--ixai-text-subtle)]">{description}</span>
      </span>
      <span
        className={`shrink-0 border px-2 py-1 font-mono text-[10px] ${
          checked ? "border-[var(--ixai-accent)]/50 text-[var(--ixai-risk-clear)]" : "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-subtle)]"
        }`}
      >
        {checked ? "ON" : "OFF"}
      </span>
    </button>
  );
}

function SourceRow({ name, status, detail }: { name: string; status: string; detail: string }) {
  return (
    <div className="grid gap-2 border-b border-[var(--ixai-border-subtle)] py-2 font-mono text-xs md:grid-cols-[1fr_auto]">
      <div>
        <div className="text-[var(--ixai-text-strong)]">{name}</div>
        <div className="mt-1 text-[10px] text-[var(--ixai-text-subtle)]">{detail}</div>
      </div>
      <span className={`h-fit border px-2 py-1 text-[10px] uppercase ${statusClass(status)}`}>
        {status}
      </span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--ixai-border-subtle)] py-2 font-mono text-xs">
      <span className="uppercase text-[var(--ixai-text-subtle)]">{label}</span>
      <span className="text-right text-[var(--ixai-text-strong)]">{textValue(value)}</span>
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
      subtitle={t("settings.subtitle")}
    >
      <div className="space-y-5">
        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <TerminalPanel title={t("settings.profile")} meta="account context">
            <MetricRow label="USER" value={userEmail || "token profile unavailable"} />
            <MetricRow label={t("common.account")} value={currentAccount?.name || t("settings.personalWorkspace")} />
            <MetricRow label={t("settings.accountId")} value={currentAccount?.id || t("common.dataPending")} />
            <MetricRow label={t("common.workspace")} value={summary?.portfolio_name || t("portfolio.primaryPortfolio")} />
            <MetricRow label="ROLE" value="owner / admin / viewer ready" />
            <div className="mt-3 border border-[var(--ixai-accent)]/20 bg-[var(--ixai-accent)]/[0.045] px-3 py-2 text-xs leading-5 text-[var(--ixai-text-muted)]">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ixai-risk-clear)]">
                {ixaiIdentity.syncPendingBadge}
              </div>
              <p className="mt-1">{ixaiIdentity.sharedAccountMessage}</p>
              <p className="mt-1">{ixaiIdentity.preferencesSyncCopy}</p>
            </div>
            <Link
              className="mt-3 inline-block border border-[var(--ixai-border-subtle)] px-3 py-2 text-xs text-[var(--ixai-text-strong)] hover:border-[var(--ixai-accent)] hover:text-[var(--ixai-risk-clear)]"
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
                      ? "border-[var(--ixai-accent)]/50 bg-[rgba(176,141,87,0.08)] text-[var(--ixai-risk-clear)]"
                      : "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-muted)]"
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
            <div className="mt-3 border border-[var(--ixai-border-subtle)] bg-black/20 px-3 py-2 text-xs text-[var(--ixai-text-subtle)]">
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
            <label className="block border-b border-[var(--ixai-border-subtle)] py-2">
              <span className="block text-sm text-[var(--ixai-text-strong)]">{t("settings.alertMode")}</span>
              <select
                className="mt-2 w-full border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-elevated)] px-2 py-2 text-sm text-[var(--ixai-text-strong)]"
                onChange={(event) => updatePreferences({ alertMode: event.target.value as AlertMode })}
                value={preferences.alertMode}
              >
                <option value="criticalOnly">{t("settings.criticalOnly")}</option>
                <option value="all">{t("settings.allAlerts")}</option>
                <option value="dailyBrief">{t("settings.dailyBrief")}</option>
              </select>
            </label>
          </TerminalPanel>

          <TerminalPanel title={t("settings.dataSources")} meta={t("settings.safePlaceholders")}>
            {dataSources.map((source) => (
              <SourceRow detail={source.detail} key={source.name} name={source.name} status={source.status} />
            ))}
          </TerminalPanel>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <TerminalPanel title={t("settings.system")} meta={healthStatus}>
            <MetricRow label={t("settings.backendHealth")} value={healthStatus} />
            <MetricRow label={t("settings.databaseReadiness")} value={health?.database || t("common.unknown")} />
            <MetricRow label={t("settings.requestStatus")} value={healthError ? t("status.partial") : health ? t("status.healthy") : t("common.unknown")} />
            <MetricRow label={t("settings.lastChecked")} value={lastChecked || t("common.dataPending")} />
            {healthError && (
              <div className="mt-3 border border-[var(--ixai-risk-watch)]/30 bg-[var(--ixai-surface-card)] px-3 py-2 text-xs text-[var(--ixai-risk-watch)]">
                {t("settings.healthUnavailable")}: {healthError}
              </div>
            )}
          </TerminalPanel>

          <TerminalPanel title={t("settings.intelligence")} meta={t("settings.riskInterpretationOnly")}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-[var(--ixai-border-subtle)] bg-black/20 p-3">
                <div className="font-mono text-[10px] uppercase text-[var(--ixai-text-subtle)]">{t("settings.schedulerSnapshotInterval")}</div>
                <div className="mt-1 text-sm text-[var(--ixai-text-strong)]">{t("settings.snapshotIntervalPlaceholder")}</div>
              </div>
              <div className="border border-[var(--ixai-border-subtle)] bg-black/20 p-3">
                <div className="font-mono text-[10px] uppercase text-[var(--ixai-text-subtle)]">Skip News In Scheduler</div>
                <div className="mt-1 text-sm text-[var(--ixai-text-strong)]">Default safe mode: enabled</div>
              </div>
              <div className="border border-[var(--ixai-border-subtle)] bg-black/20 p-3">
                <div className="font-mono text-[10px] uppercase text-[var(--ixai-text-subtle)]">Memory Window</div>
                <div className="mt-1 text-sm text-[var(--ixai-text-strong)]">7d / 30d / 90d</div>
              </div>
              <label className="border border-[var(--ixai-border-subtle)] bg-black/20 p-3">
                <span className="block font-mono text-[10px] uppercase text-[var(--ixai-text-subtle)]">Risk Mode Preference</span>
                <select
                  className="mt-2 w-full border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-elevated)] px-2 py-2 text-sm text-[var(--ixai-text-strong)]"
                  onChange={(event) => updatePreferences({ riskInterpretationMode: event.target.value as RiskInterpretationMode })}
                  value={preferences.riskInterpretationMode}
                >
                  <option value="conservative">Conservative interpretation</option>
                  <option value="balanced">Balanced interpretation</option>
                  <option value="aggressive">Aggressive interpretation</option>
                </select>
              </label>
            </div>
            <div className="mt-3 text-xs text-[var(--ixai-text-subtle)]">
              Interpretation mode changes future UX tone only and does not generate trading instruction.
            </div>
          </TerminalPanel>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <TerminalPanel title={t("settings.workspace")} meta="persisted local state">
            <label className="block border-b border-[var(--ixai-border-subtle)] py-2">
              <span className="block text-sm text-[var(--ixai-text-strong)]">Default landing page</span>
              <select
                className="mt-2 w-full border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-elevated)] px-2 py-2 text-sm text-[var(--ixai-text-strong)]"
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
            <div className="mt-3 border border-[var(--ixai-border-subtle)] bg-black/20 px-3 py-2 text-xs leading-5 text-[var(--ixai-text-subtle)]">
              {ixaiIdentity.watchlistSyncCopy}
            </div>
            <button
              className="mt-3 border border-[var(--ixai-border-subtle)] px-3 py-2 text-xs text-[var(--ixai-text-strong)] hover:border-[var(--ixai-risk-watch)]/50 hover:text-[var(--ixai-risk-watch)]"
              onClick={resetPreferences}
              type="button"
            >
              Reset preferences
            </button>
          </TerminalPanel>

          <TerminalPanel title={t("settings.compliance")} meta="always visible">
            <div className="space-y-3 text-sm leading-6 text-[var(--ixai-text-strong)]">
              <p>IXAI 提供風險情報與投資組合分析。</p>
              <p>IXAI 不提供個別買賣建議，不提供保證收益，也不提供自動交易指令。</p>
              <p>投資有風險，市場價格、匯率、FCN KI/KO 條件與加密資產波動都可能造成損失。</p>
              <p className="font-mono text-xs text-[var(--ixai-text-subtle)]">
                Risk intelligence only · 非交易指令 · No guaranteed return
              </p>
            </div>
          </TerminalPanel>
        </section>
      </div>
    </AppShell>
  );
}
