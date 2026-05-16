"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { getToken, logout } from "../../lib/api";

const labels = {
  dashboard: "Dashboard / 投資總覽",
  portfolio: "Portfolio / 資產",
  fcn: "FCN / FCN 監控",
  intelligence: "Intelligence / AI 分析",
  market: "Market / 市場",
  alerts: "Alerts / 警示",
  input: "Input / 資產輸入",
  import: "Import / 匯入",
  accounts: "Accounts / 帳戶",
  settings: "Settings / 設定",
};

const navItems = [
  { href: "/dashboard", label: labels.dashboard, short: "Home" },
  { href: "/portfolio", label: labels.portfolio, short: "Portfolio" },
  { href: "/fcn", label: labels.fcn, short: "FCN" },
  { href: "/intelligence", label: labels.intelligence, short: "AI" },
  { href: "/market", label: labels.market, short: "Market" },
  { href: "/alerts", label: labels.alerts, short: "Alerts" },
  { href: "/input", label: labels.input, short: "Input" },
  { href: "/import", label: labels.import, short: "Import" },
  { href: "/accounts", label: labels.accounts, short: "Accounts" },
  { href: "/settings", label: labels.settings, short: "Settings" },
];

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-zinc-800 bg-zinc-950/70 px-4 py-5 md:block">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">
            IXAI
          </div>
          <div className="mt-1 text-sm text-zinc-500">Portfolio OS</div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  className={`block border-l-2 px-3 py-2 text-sm transition ${
                    active
                      ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                      : "border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            className="mt-8 w-full border border-zinc-700 px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </aside>

        <section className="min-w-0">
          <div className="sticky top-0 z-20 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">
                  IXAI
                </div>
                <div className="text-xs text-zinc-500">Portfolio OS</div>
              </div>
              <button
                className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    className={`shrink-0 border px-3 py-1.5 text-xs ${
                      active
                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                        : "border-zinc-800 text-zinc-400"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    {item.short}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
            <header className="mb-6 border-b border-zinc-800 pb-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                IXAI Agent / 一玄AI
              </div>
              <h1 className="mt-2 text-2xl font-semibold md:text-3xl">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}
            </header>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export { labels };
