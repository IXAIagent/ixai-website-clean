"use client";

import Link from "next/link";

import { useI18n } from "../../lib/i18n";

export type OnboardingStatus = {
  hasAccount: boolean;
  hasPortfolio: boolean;
  hasHoldings: boolean;
};

/** v3E: dashboard-top onboarding CTA, only rendered when something is
 *  missing. Compliance-safe wording — no trading instructions.
 */
export function OnboardingChecklist({ status }: { status: OnboardingStatus }) {
  const { t } = useI18n();
  const steps = [
    {
      key: "step1",
      done: status.hasAccount,
      label: t("dashboard.onboarding.step1"),
      href: "/accounts",
    },
    {
      key: "step2",
      done: status.hasPortfolio,
      label: t("dashboard.onboarding.step2"),
      href: "/accounts",
    },
    {
      key: "step3",
      done: status.hasHoldings,
      label: t("dashboard.onboarding.step3"),
      href: "/input",
    },
    {
      key: "step4",
      done: status.hasAccount && status.hasPortfolio && status.hasHoldings,
      label: t("dashboard.onboarding.step4"),
      href: "/intelligence",
    },
  ];
  const completed = steps.filter((step) => step.done).length;

  return (
    <section className="min-w-0 overflow-hidden border border-[var(--ixai-accent)]/30 bg-[var(--ixai-surface-card)] p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-base font-semibold text-[var(--ixai-risk-clear)]">
          {t("dashboard.onboarding.title")}
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-wide text-[var(--ixai-risk-clear)]">
          {completed} / {steps.length} · {t("dashboard.onboarding.meta")}
        </span>
      </div>
      <p className="mt-2 font-mono text-xs leading-5 text-[var(--ixai-text-muted)]">
        {t("dashboard.onboarding.hint")}
      </p>
      <ol className="mt-3 grid gap-2 md:grid-cols-2">
        {steps.map((step, index) => (
          <li className="flex items-start gap-2 border border-[var(--ixai-border-subtle)] bg-black/30 px-3 py-2" key={step.key}>
            <span
              className={`mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center border font-mono text-[10px] ${
                step.done
                  ? "border-[var(--ixai-accent)] bg-[rgba(176,141,87,0.10)] text-[var(--ixai-risk-clear)]"
                  : "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-subtle)]"
              }`}
            >
              {step.done ? "✓" : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                className="block truncate text-sm text-[var(--ixai-text-strong)] hover:text-[var(--ixai-risk-clear)]"
                href={step.href}
              >
                {step.label}
              </Link>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
        <Link
          className="border border-[var(--ixai-accent)]/50 px-3 py-1.5 text-[var(--ixai-risk-clear)] transition hover:bg-[rgba(176,141,87,0.10)]"
          href="/onboarding"
        >
          {t("dashboard.onboarding.openGuide")}
        </Link>
        <Link
          className="border border-[var(--ixai-border-subtle)] px-3 py-1.5 text-[var(--ixai-text-strong)] transition hover:border-[var(--ixai-accent)]/60 hover:text-[var(--ixai-risk-clear)]"
          href="/import"
        >
          {t("dashboard.onboarding.importCsv")}
        </Link>
      </div>
    </section>
  );
}
