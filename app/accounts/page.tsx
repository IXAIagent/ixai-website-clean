"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  AccountPortfolioResponse,
  AccountResponse,
  createAccount,
  createAccountPortfolio,
  getAccountIntelligenceSummary,
  getAccountPortfolios,
  getAccounts,
  PortfolioSummaryV2AResponse,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useWorkspaceContext } from "../lib/workspace-context";

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export default function AccountsPage() {
  const { t } = useI18n();
  const { context, setWorkspaceContext } = useWorkspaceContext();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [portfolios, setPortfolios] = useState<AccountPortfolioResponse[]>([]);
  const [accountIntel, setAccountIntel] = useState<PortfolioSummaryV2AResponse | null>(null);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("individual");
  const [portfolioName, setPortfolioName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadPortfolios = useCallback(async (accountId: string) => {
    if (!accountId) {
      setPortfolios([]);
      return;
    }
    try {
      const response = await getAccountPortfolios(accountId);
      setPortfolios(Array.isArray(response.items) ? response.items : []);
      const intel = await getAccountIntelligenceSummary(accountId).catch(() => null);
      setAccountIntel(intel);
    } catch {
      setPortfolios([]);
      setAccountIntel(null);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await getAccounts();
      const items = Array.isArray(response.items) ? response.items : [];
      setAccounts(items);
      const firstId = context.selectedAccountId || items[0]?.id || "";
      setSelectedAccount((current) => current || firstId);
      if (firstId) await loadPortfolios(firstId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accounts unavailable.");
      setAccounts([]);
    }
  }, [context.selectedAccountId, loadPortfolios]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccounts]);

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const account = await createAccount(accountName, accountType);
      setStatus(t("accounts.accountCreated"));
      setAccountName("");
      await loadAccounts();
      if (account.id) {
        setSelectedAccount(account.id);
        setWorkspaceContext({
          selectedAccountId: account.id,
          selectedAccountName: account.name || "",
          selectedPortfolioId: "",
          selectedPortfolioName: "",
        });
        await loadPortfolios(account.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create account failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAccount) return;
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const portfolio = await createAccountPortfolio(selectedAccount, portfolioName || "New Portfolio");
      setStatus(t("accounts.portfolioCreated"));
      setPortfolioName("");
      if (portfolio.id) {
        setWorkspaceContext({
          selectedPortfolioId: portfolio.id,
          selectedPortfolioName: portfolio.name || portfolioName || "New Portfolio",
        });
      }
      await loadPortfolios(selectedAccount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create portfolio failed.");
    } finally {
      setLoading(false);
    }
  }

  const selected = accounts.find((account) => account.id === selectedAccount);
  const selectedPortfolio = portfolios.find((portfolio) => portfolio.id === context.selectedPortfolioId);

  return (
    <AppShell
      title={t("page.accounts")}
      subtitle={t("accounts.subtitle")}
    >
      <div className="space-y-4">
        {accounts.length === 0 && (
          <TerminalPanel title={t("accounts.onboarding")} meta="multi-portfolio">
            <div className="grid gap-2 font-mono text-xs md:grid-cols-4">
              <div className="border border-zinc-800 bg-black/20 p-3 text-zinc-300">{t("onboarding.step1")}</div>
              <div className="border border-zinc-800 bg-black/20 p-3 text-zinc-300">{t("onboarding.step2")}</div>
              <div className="border border-zinc-800 bg-black/20 p-3 text-zinc-300">{t("onboarding.step3")}</div>
              <div className="border border-zinc-800 bg-black/20 p-3 text-zinc-300">{t("onboarding.step4")}</div>
            </div>
            <div className="mt-3 text-sm text-zinc-500">
              {t("accounts.emptyOnboardingHint")}
            </div>
          </TerminalPanel>
        )}

        <TerminalPanel title={t("accounts.activeContext")} meta="workspace memory">
          <div className="grid gap-3 font-mono text-xs md:grid-cols-4">
            <div className="border border-zinc-800 bg-black/20 p-3">
              <div className="text-zinc-600">{t("common.account")}</div>
              <div className="mt-1 text-zinc-100">{context.selectedAccountName || selected?.name || t("common.selectAccount")}</div>
            </div>
            <div className="border border-zinc-800 bg-black/20 p-3">
              <div className="text-zinc-600">{t("common.portfolio")}</div>
              <div className="mt-1 text-zinc-100">{context.selectedPortfolioName || selectedPortfolio?.name || t("common.selectPortfolio")}</div>
            </div>
            <div className="border border-zinc-800 bg-black/20 p-3">
              <div className="text-zinc-600">LAST WORKSPACE</div>
              <div className="mt-1 text-zinc-100">{context.lastActiveWorkspace}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a className="border border-zinc-700 px-3 py-2 text-zinc-300 hover:text-emerald-200" href="/input">Input</a>
              <a className="border border-zinc-700 px-3 py-2 text-zinc-300 hover:text-emerald-200" href="/import">Import</a>
              <a className="border border-zinc-700 px-3 py-2 text-zinc-300 hover:text-emerald-200" href="/dashboard">Dashboard</a>
            </div>
          </div>
        </TerminalPanel>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <TerminalPanel title={t("accounts.createAccount")} meta="v3">
            <form className="space-y-3" onSubmit={handleCreateAccount}>
              <input
                className="w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400"
                placeholder={t("accounts.accountName")}
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
              />
              <select
                className="w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
              >
                <option value="individual">individual</option>
                <option value="family">family</option>
                <option value="business">business</option>
              </select>
              <button
                className="border border-emerald-400/60 px-4 py-2 text-sm text-emerald-100 disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {t("accounts.createAccount")}
              </button>
            </form>
          </TerminalPanel>

          <TerminalPanel title={t("accounts.accountList")} meta={`${accounts.length} ${t("accounts.accountsCount")}`}>
            <div className="divide-y divide-zinc-800 border border-zinc-800">
              {accounts.length === 0 && <EmptyLine>{t("accounts.noAccounts")}</EmptyLine>}
              {accounts.map((account) => (
                <button
                  className={`block w-full px-3 py-2 text-left font-mono text-xs ${
                    selectedAccount === account.id ? "bg-emerald-400/10 text-emerald-200" : "text-zinc-300"
                  }`}
                  key={account.id || account.name}
                  onClick={() => {
                    const accountId = account.id || "";
                    setSelectedAccount(accountId);
                    setWorkspaceContext({
                      selectedAccountId: accountId,
                      selectedAccountName: account.name || "",
                      selectedPortfolioId: "",
                      selectedPortfolioName: "",
                    });
                    void loadPortfolios(accountId);
                  }}
                  type="button"
                >
                  <div>{textValue(account.name, t("common.account"))}</div>
                  <div className="mt-1 text-zinc-500">{textValue(account.account_type, "individual")}</div>
                </button>
              ))}
            </div>
          </TerminalPanel>
        </div>

        <div className="space-y-4">
          <TerminalPanel title={t("accounts.accountSummary")} meta={textValue(selected?.account_type, t("accounts.type"))}>
            {error && <div className="mb-3 border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
            {status && <div className="mb-3 border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">{status}</div>}
            {!selected ? (
              <EmptyLine>{t("accounts.selectOrCreate")}</EmptyLine>
            ) : (
              <div className="grid gap-3 font-mono text-xs md:grid-cols-3">
                <div className="border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-600">{t("common.account")}</div>
                  <div className="mt-1 text-zinc-100">{textValue(selected.name, t("common.account"))}</div>
                </div>
                <div className="border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-600">ROLE</div>
                  <div className="mt-1 text-emerald-300">owner / admin / viewer ready</div>
                </div>
                <div className="border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-600">PORTFOLIOS</div>
                  <div className="mt-1 text-zinc-100">{portfolios.length}</div>
                </div>
                <div className="border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-600">INTEL</div>
                  <div className="mt-1 text-zinc-100">{textValue(accountIntel?.regime || accountIntel?.dominant_risk, "fail-soft ready")}</div>
                </div>
              </div>
            )}
          </TerminalPanel>

          <TerminalPanel title={t("accounts.portfolios")} meta={t("accounts.accountScope")}>
            <form className="mb-3 flex flex-col gap-2 sm:flex-row" onSubmit={handleCreatePortfolio}>
              <input
                className="min-w-0 flex-1 border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400"
                placeholder={t("accounts.newPortfolioName")}
                value={portfolioName}
                onChange={(event) => setPortfolioName(event.target.value)}
              />
              <button
                className="border border-emerald-400/60 px-4 py-2 text-sm text-emerald-100 disabled:opacity-50"
                disabled={!selectedAccount || loading}
                type="submit"
              >
                {t("accounts.createPortfolio")}
              </button>
            </form>
            <div className="divide-y divide-zinc-800 border border-zinc-800">
              {portfolios.length === 0 && <EmptyLine>{t("accounts.noPortfolios")}</EmptyLine>}
              {portfolios.map((portfolio) => (
                <div
                  className={`px-3 py-2 font-mono text-xs ${
                    context.selectedPortfolioId === portfolio.id ? "bg-emerald-400/10" : ""
                  }`}
                  key={portfolio.id || portfolio.name}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-zinc-100">{textValue(portfolio.name, t("common.portfolio"))}</div>
                    <button
                      className="border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:border-emerald-400/60 hover:text-emerald-200"
                      onClick={() => setWorkspaceContext({
                        selectedAccountId: selectedAccount,
                        selectedAccountName: selected?.name || "",
                        selectedPortfolioId: portfolio.id || "",
                        selectedPortfolioName: portfolio.name || "",
                      })}
                      type="button"
                    >
                      {context.selectedPortfolioId === portfolio.id ? t("status.active") : t("accounts.setActive")}
                    </button>
                  </div>
                  <div className="mt-1 text-zinc-500">
                    {textValue(portfolio.base_currency, "USD")} · {textValue(portfolio.id, "id pending")}
                  </div>
                </div>
              ))}
            </div>
          </TerminalPanel>
        </div>
      </div>
      </div>
    </AppShell>
  );
}
