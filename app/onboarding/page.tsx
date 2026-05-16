"use client";

import Link from "next/link";

import { AppShell } from "../components/layout/AppShell";
import { TerminalPanel } from "../components/layout/TerminalPanel";
import { useI18n } from "../lib/i18n";

export default function OnboardingPage() {
  const { t } = useI18n();
  const steps = [
    { title: t("onboarding.step1"), detail: t("onboarding.step1Detail"), href: "/accounts" },
    { title: t("onboarding.step2"), detail: t("onboarding.step2Detail"), href: "/accounts" },
    { title: t("onboarding.step3"), detail: t("onboarding.step3Detail"), href: "/input" },
    { title: t("onboarding.step4"), detail: t("onboarding.step4Detail"), href: "/dashboard" },
  ];
  return (
    <AppShell
      title={t("page.onboarding")}
      subtitle={t("onboarding.subtitle")}
    >
      <div className="space-y-4">
        <TerminalPanel title={t("onboarding.startHere")} meta="v3A">
          <div className="grid gap-3 md:grid-cols-2">
            {steps.map((step) => (
              <Link
                className="border border-zinc-800 bg-black/20 p-4 transition hover:border-emerald-400/60"
                href={step.href}
                key={step.title}
              >
                <div className="font-mono text-sm text-zinc-100">{step.title}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-500">{step.detail}</div>
              </Link>
            ))}
          </div>
        </TerminalPanel>
      </div>
    </AppShell>
  );
}
