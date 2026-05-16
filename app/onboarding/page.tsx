"use client";

import Link from "next/link";

import { AppShell } from "../components/layout/AppShell";
import { TerminalPanel } from "../components/layout/TerminalPanel";

const steps = [
  {
    title: "1. Create Account",
    detail: "建立個人、家庭或 business account context。",
    href: "/accounts",
  },
  {
    title: "2. Create Portfolio",
    detail: "在 account 底下建立第一個 portfolio。",
    href: "/accounts",
  },
  {
    title: "3. Add Asset / Import CSV",
    detail: "手動新增資產，或匯入 CSV portfolio。",
    href: "/input",
  },
  {
    title: "4. Open Dashboard / Intelligence",
    detail: "查看總覽、FCN 風險與 intelligence workspace。",
    href: "/dashboard",
  },
];

export default function OnboardingPage() {
  return (
    <AppShell
      title="Onboarding / 啟動流程"
      subtitle="A lightweight path into IXAI multi-portfolio operating mode."
    >
      <div className="space-y-4">
        <TerminalPanel title="Start Here" meta="v3A">
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
