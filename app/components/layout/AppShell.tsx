"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import {
  AccountPortfolioResponse,
  AccountResponse,
  getAccountPortfolios,
  getAccounts,
  getToken,
  logout,
} from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { ixaiEcosystem } from "../../lib/ecosystem";
import { landingPath, usePreferences } from "../../lib/preferences";
import { useWorkspaceContext } from "../../lib/workspace-context";
import { EcosystemBridge } from "./EcosystemBridge";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", shortKey: "nav.short.dashboard" },
  { href: "/portfolio", labelKey: "nav.portfolio", shortKey: "nav.short.portfolio" },
  { href: "/fcn", labelKey: "nav.fcn", shortKey: "nav.short.fcn" },
  { href: "/intelligence", labelKey: "nav.intelligence", shortKey: "nav.short.intelligence" },
  { href: "/market", labelKey: "nav.market", shortKey: "nav.short.market" },
  { href: "/alerts", labelKey: "nav.alerts", shortKey: "nav.short.alerts" },
  { href: "/input", labelKey: "nav.input", shortKey: "nav.short.input" },
  { href: "/import", labelKey: "nav.import", shortKey: "nav.short.import" },
  { href: "/accounts", labelKey: "nav.accounts", shortKey: "nav.short.accounts" },
  { href: "/settings", labelKey: "nav.settings", shortKey: "nav.short.settings" },
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
  const { context, setWorkspaceContext } = useWorkspaceContext();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [portfolios, setPortfolios] = useState<AccountPortfolioResponse[]>([]);
  const [contextError, setContextError] = useState("");

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  useEffect(() => {
    const workspace = pathname.replace("/", "") || "dashboard";
    setWorkspaceContext({ lastActiveWorkspace: workspace });
  }, [pathname, setWorkspaceContext]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await getAccounts();
        const items = Array.isArray(response.items) ? response.items : [];
        setAccounts(items);
        setContextError("");
        const activeAccountId = context.selectedAccountId || items[0]?.id || "";
        const activeAccount = items.find((item) => item.id === activeAccountId) || items[0];
        if (activeAccount?.id && activeAccount.id !== context.selectedAccountId) {
          setWorkspaceContext({
            selectedAccountId: activeAccount.id,
            selectedAccountName: activeAccount.name || "",
          });
        }
      } catch {
        setAccounts([]);
        setContextError("context unavailable");
      }
    }
    const timer = window.setTimeout(() => {
      void loadAccounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [context.selectedAccountId, setWorkspaceContext]);

  useEffect(() => {
    async function loadPortfolios() {
      if (!context.selectedAccountId) {
        setPortfolios([]);
        return;
      }
      try {
        const response = await getAccountPortfolios(context.selectedAccountId);
        const items = Array.isArray(response.items) ? response.items : [];
        setPortfolios(items);
        const activePortfolioId = context.selectedPortfolioId || items[0]?.id || "";
        const activePortfolio = items.find((item) => item.id === activePortfolioId) || items[0];
        if (activePortfolio?.id && activePortfolio.id !== context.selectedPortfolioId) {
          setWorkspaceContext({
            selectedPortfolioId: activePortfolio.id,
            selectedPortfolioName: activePortfolio.name || "",
          });
        }
      } catch {
        setPortfolios([]);
      }
    }
    const timer = window.setTimeout(() => {
      void loadPortfolios();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [context.selectedAccountId, context.selectedPortfolioId, setWorkspaceContext]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function handleAccountChange(accountId: string) {
    const account = accounts.find((item) => item.id === accountId);
    setWorkspaceContext({
      selectedAccountId: accountId,
      selectedAccountName: account?.name || "",
      selectedPortfolioId: "",
      selectedPortfolioName: "",
    });
  }

  function handlePortfolioChange(portfolioId: string) {
    const portfolio = portfolios.find((item) => item.id === portfolioId);
    setWorkspaceContext({
      selectedPortfolioId: portfolioId,
      selectedPortfolioName: portfolio?.name || "",
    });
  }

  return (
    <main
      className={`min-h-screen bg-black text-white ${terminal ? "font-sans" : ""}`}
      data-compact={compact ? "1" : "0"}
      data-terminal={terminal ? "1" : "0"}
    >
      <div className={`min-h-screen md:grid ${compact ? "md:grid-cols-[224px_1fr]" : "md:grid-cols-[260px_1fr]"}`}>
        <aside className={`hidden border-r border-zinc-800 bg-zinc-950/70 px-4 md:block ${compact ? "py-4" : "py-5"}`}>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">
            IXAI
          </div>
          <Link className="mt-1 block text-sm text-zinc-500 hover:text-zinc-300" href={defaultPath}>
            {t("common.portfolioOS")}
          </Link>

          <div className="mt-4 space-y-2 border border-zinc-800 bg-black/20 p-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase text-zinc-600">{t("common.account")}</span>
              <select
                className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-300 outline-none"
                onChange={(event) => handleAccountChange(event.target.value)}
                value={context.selectedAccountId}
              >
                <option value="">{t("common.selectAccount")}</option>
                {accounts.map((account) => (
                  <option key={account.id || account.name} value={account.id || ""}>
                    {account.name || t("common.account")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase text-zinc-600">{t("common.portfolio")}</span>
              <select
                className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-300 outline-none"
                onChange={(event) => handlePortfolioChange(event.target.value)}
                value={context.selectedPortfolioId}
              >
                <option value="">{t("common.selectPortfolio")}</option>
                {portfolios.map((portfolio) => (
                  <option key={portfolio.id || portfolio.name} value={portfolio.id || ""}>
                    {portfolio.name || t("common.portfolio")}
                  </option>
                ))}
              </select>
            </label>
            <div className="truncate font-mono text-[10px] text-zinc-600">
              {t("common.workspace")}: {context.lastActiveWorkspace || "dashboard"}
            </div>
            {contextError && (
              <Link className="font-mono text-[10px] text-yellow-300" href="/accounts">
                {t("common.selectPortfolio")}
              </Link>
            )}
          </div>

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

          <div className="mt-5 border border-emerald-400/20 bg-emerald-400/[0.045] p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
              Public Intelligence
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Daily Brief 與公開市場研究入口。
            </p>
            <a
              className="mt-3 inline-flex border border-emerald-400/40 px-3 py-1.5 text-xs text-emerald-200 transition hover:bg-emerald-400/10"
              href={`${ixaiEcosystem.publicAppUrl}/daily-brief`}
              rel="noopener noreferrer"
              target="_blank"
            >
              Daily Brief
            </a>
          </div>

          <button
            className="mt-8 w-full border border-zinc-700 px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900"
            onClick={handleLogout}
            type="button"
          >
            {t("common.logout")}
          </button>
        </aside>

        <section className="min-w-0 overflow-x-hidden">
          <div className="sticky top-0 z-20 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">
                  IXAI
                </div>
                <Link className="text-xs text-zinc-500" href={defaultPath}>{t("common.portfolioOS")}</Link>
              </div>
              <button
                className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300"
                onClick={handleLogout}
                type="button"
              >
                {t("common.logout")}
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
                    {t(item.shortKey)}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              <a
                className="shrink-0 border border-emerald-400/30 px-3 py-1.5 text-xs text-emerald-200"
                href={`${ixaiEcosystem.publicAppUrl}/daily-brief`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Public Intelligence
              </a>
              <a
                className="shrink-0 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400"
                href={`${ixaiEcosystem.publicAppUrl}/market`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Market Intelligence
              </a>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 font-mono text-[10px] text-zinc-500">
              <Link className="shrink-0 border border-zinc-800 px-2 py-1" href="/accounts">
                {context.selectedAccountName || t("common.selectAccount")}
              </Link>
              <Link className="shrink-0 border border-zinc-800 px-2 py-1" href="/accounts">
                {context.selectedPortfolioName || t("common.selectPortfolio")}
              </Link>
            </div>
          </div>

          <div className={`mx-auto max-w-7xl px-4 md:px-6 ${compact ? "py-4 md:py-6" : "py-6 md:py-8"}`}>
            <header className={`border-b border-zinc-800 ${compact ? "mb-4 pb-4" : "mb-6 pb-5"}`}>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                {t("common.productName")} · {preferences.locale}
              </div>
              <h1 className={`${compact ? "mt-1 text-xl md:text-2xl" : "mt-2 text-2xl md:text-3xl"} font-semibold`}>{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] text-zinc-500">
                <Link className="border border-zinc-800 px-2 py-1 hover:text-emerald-300" href="/accounts">
                  {context.selectedAccountName || t("common.selectAccount")}
                </Link>
                <Link className="border border-zinc-800 px-2 py-1 hover:text-emerald-300" href="/accounts">
                  {context.selectedPortfolioName || t("common.selectPortfolio")}
                </Link>
                <span className="border border-zinc-800 px-2 py-1">
                  {t("common.lastActive")}: {context.lastActiveWorkspace || "dashboard"}
                </span>
              </div>
            </header>
            <EcosystemBridge />
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
