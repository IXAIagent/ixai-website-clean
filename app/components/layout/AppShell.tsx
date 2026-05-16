"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { getToken, logout } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { landingPath, usePreferences } from "../../lib/preferences";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", short: "Home" },
  { href: "/portfolio", labelKey: "nav.portfolio", short: "Portfolio" },
  { href: "/fcn", labelKey: "nav.fcn", short: "FCN" },
  { href: "/intelligence", labelKey: "nav.intelligence", short: "AI" },
  { href: "/market", labelKey: "nav.market", short: "Market" },
  { href: "/alerts", labelKey: "nav.alerts", short: "Alerts" },
  { href: "/input", labelKey: "nav.input", short: "Input" },
  { href: "/import", labelKey: "nav.import", short: "Import" },
  { href: "/accounts", labelKey: "nav.accounts", short: "Accounts" },
  { href: "/settings", labelKey: "nav.settings", short: "Settings" },
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
  const { preferences } = usePreferences();
  const { t } = useI18n();
  const compact = preferences.compactMode;
  const terminal = preferences.terminalMode;
  const defaultPath = landingPath(preferences.defaultLandingPage);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <main className={`min-h-screen bg-black text-white ${terminal ? "font-sans" : ""}`}>
      <div className={`min-h-screen md:grid ${compact ? "md:grid-cols-[224px_1fr]" : "md:grid-cols-[260px_1fr]"}`}>
        <aside className={`hidden border-r border-zinc-800 bg-zinc-950/70 px-4 md:block ${compact ? "py-4" : "py-5"}`}>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">
            IXAI
          </div>
          <Link className="mt-1 block text-sm text-zinc-500 hover:text-zinc-300" href={defaultPath}>
            Portfolio OS
          </Link>

          <nav className={`${compact ? "mt-6" : "mt-8"} space-y-1`}>
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  className={`block truncate border-l-2 px-3 text-sm transition ${compact ? "py-1.5" : "py-2"} ${
                    active
                      ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                      : "border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {t(item.labelKey)}
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

        <section className="min-w-0 overflow-x-hidden">
          <div className="sticky top-0 z-20 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">
                  IXAI
                </div>
                <Link className="text-xs text-zinc-500" href={defaultPath}>Portfolio OS</Link>
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

          <div className={`mx-auto max-w-7xl px-4 md:px-6 ${compact ? "py-4 md:py-6" : "py-6 md:py-8"}`}>
            <header className={`border-b border-zinc-800 ${compact ? "mb-4 pb-4" : "mb-6 pb-5"}`}>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                IXAI Agent / 一玄AI · {preferences.locale}
              </div>
              <h1 className={`${compact ? "mt-1 text-xl md:text-2xl" : "mt-2 text-2xl md:text-3xl"} font-semibold`}>{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}
            </header>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
