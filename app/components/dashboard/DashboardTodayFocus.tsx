"use client";

import Link from "next/link";

import { useI18n } from "../../lib/i18n";
import {
  sanitizeAdviceText,
  type TodayFocusItem,
} from "../../lib/intelligence-priority";
import { TerminalPanel } from "../layout/TerminalPanel";

function severityClass(value?: string | null) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("critical")) return "border-[var(--ixai-risk-critical)] text-[var(--ixai-risk-critical)]";
  if (normalized.includes("elevated")) return "border-[var(--ixai-risk-elevated)] text-[var(--ixai-risk-elevated)]";
  if (normalized.includes("watch")) return "border-[var(--ixai-risk-watch)] text-[var(--ixai-risk-watch)]";
  return "border-[var(--ixai-accent)] text-[var(--ixai-risk-clear)]";
}

/** v3E: top-3 Today Focus mirror on /dashboard. /intelligence keeps full
 *  detail. All wording compliance-safe — monitoring actions only.
 */
export function DashboardTodayFocus({
  items,
  status,
}: {
  items: TodayFocusItem[];
  status: string;
}) {
  const { t } = useI18n();
  const top = items.slice(0, 3);

  return (
    <TerminalPanel
      title={t("dashboard.todayFocus")}
      meta={`top 3 · ${status.toLowerCase()}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className={`border px-2 py-1 uppercase ${severityClass(status)}`}>
          {t("intelligence.statusLabel")}: {status}
        </span>
        <span className="text-[var(--ixai-text-subtle)]">{t("dashboard.todayFocus.subtitle")}</span>
        <Link className="ml-auto text-[var(--ixai-risk-clear)] hover:text-[var(--ixai-risk-clear)]" href="/intelligence">
          {t("dashboard.todayFocus.openIntelligence")} →
        </Link>
      </div>
      {top.length === 0 ? (
        <div className="border border-dashed border-[var(--ixai-border-subtle)] px-3 py-3 font-mono text-xs text-[var(--ixai-text-subtle)]">
          {t("empty.todayFocusBuilding")}
        </div>
      ) : (
        <div className="divide-y divide-[var(--ixai-border-subtle)] border border-[var(--ixai-border-subtle)]">
          {top.map((item) => (
            <div
              className="grid gap-2 px-3 py-2 text-xs md:grid-cols-[0.7fr_1fr_1.6fr_0.9fr]"
              key={`${item.category}-${item.symbol}-${item.title}`}
            >
              <div>
                <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${severityClass(item.severity)}`}>
                  {item.severity}
                </span>
                <div className="mt-1 font-mono text-[var(--ixai-text-subtle)]">{item.category}</div>
              </div>
              <div>
                <div className="font-semibold text-[var(--ixai-text-strong)]">{item.title}</div>
                <div className="font-mono text-[10px] text-[var(--ixai-text-subtle)]">{item.symbol}</div>
              </div>
              <div className="text-[var(--ixai-text-muted)]">{sanitizeAdviceText(item.reason)}</div>
              <div className="font-mono text-[var(--ixai-text-strong)]">
                {t("dashboard.todayFocus.action")}:{" "}
                {t(`intelligence.actions.${item.recommended_monitoring_action}`)}
              </div>
            </div>
          ))}
        </div>
      )}
    </TerminalPanel>
  );
}
