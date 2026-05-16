"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  AccountPortfolioResponse,
  AccountResponse,
  createAccount,
  createAccountPortfolio,
  getAccountPortfolios,
  getAccounts,
} from "../lib/api";
import { useI18n } from "../lib/i18n";

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export default function AccountsPage() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [portfolios, setPortfolios] = useState<AccountPortfolioResponse[]>([]);
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
    } catch {
      setPortfolios([]);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await getAccounts();
      const items = Array.isArray(response.items) ? response.items : [];
      setAccounts(items);
      const firstId = items[0]?.id || "";
      setSelectedAccount((current) => current || firstId);
      if (firstId) await loadPortfolios(firstId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accounts unavailable.");
      setAccounts([]);
    }
  }, [loadPortfolios]);

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
      setStatus("Account created.");
      setAccountName("");
      await loadAccounts();
      if (account.id) {
        setSelectedAccount(account.id);
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
      await createAccountPortfolio(selectedAccount, portfolioName || "New Portfolio");
      setStatus("Portfolio created.");
      setPortfolioName("");
      await loadPortfolios(selectedAccount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create portfolio failed.");
    } finally {
      setLoading(false);
    }
  }

  const selected = accounts.find((account) => account.id === selectedAccount);

  return (
    <AppShell
      title={t("page.accounts")}
      subtitle="Multi-account and multi-portfolio foundation for future client/family/business workspaces."
    >
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <TerminalPanel title="Create Account" meta="v3">
            <form className="space-y-3" onSubmit={handleCreateAccount}>
              <input
                className="w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400"
                placeholder="Account name"
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
                Create Account
              </button>
            </form>
          </TerminalPanel>

          <TerminalPanel title="Account List" meta={`${accounts.length} accounts`}>
            <div className="divide-y divide-zinc-800 border border-zinc-800">
              {accounts.length === 0 && <EmptyLine>No accounts yet.</EmptyLine>}
              {accounts.map((account) => (
                <button
                  className={`block w-full px-3 py-2 text-left font-mono text-xs ${
                    selectedAccount === account.id ? "bg-emerald-400/10 text-emerald-200" : "text-zinc-300"
                  }`}
                  key={account.id || account.name}
                  onClick={() => {
                    const accountId = account.id || "";
                    setSelectedAccount(accountId);
                    void loadPortfolios(accountId);
                  }}
                  type="button"
                >
                  <div>{textValue(account.name, "Account")}</div>
                  <div className="mt-1 text-zinc-500">{textValue(account.account_type, "individual")}</div>
                </button>
              ))}
            </div>
          </TerminalPanel>
        </div>

        <div className="space-y-4">
          <TerminalPanel title="Account Summary" meta={textValue(selected?.account_type, "type")}>
            {error && <div className="mb-3 border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
            {status && <div className="mb-3 border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">{status}</div>}
            {!selected ? (
              <EmptyLine>Select or create an account.</EmptyLine>
            ) : (
              <div className="grid gap-3 font-mono text-xs md:grid-cols-3">
                <div className="border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-600">ACCOUNT</div>
                  <div className="mt-1 text-zinc-100">{textValue(selected.name, "Account")}</div>
                </div>
                <div className="border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-600">ROLE</div>
                  <div className="mt-1 text-emerald-300">owner / admin / viewer ready</div>
                </div>
                <div className="border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-600">PORTFOLIOS</div>
                  <div className="mt-1 text-zinc-100">{portfolios.length}</div>
                </div>
              </div>
            )}
          </TerminalPanel>

          <TerminalPanel title="Portfolios" meta="account scope">
            <form className="mb-3 flex flex-col gap-2 sm:flex-row" onSubmit={handleCreatePortfolio}>
              <input
                className="min-w-0 flex-1 border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400"
                placeholder="New portfolio name"
                value={portfolioName}
                onChange={(event) => setPortfolioName(event.target.value)}
              />
              <button
                className="border border-emerald-400/60 px-4 py-2 text-sm text-emerald-100 disabled:opacity-50"
                disabled={!selectedAccount || loading}
                type="submit"
              >
                Create Portfolio
              </button>
            </form>
            <div className="divide-y divide-zinc-800 border border-zinc-800">
              {portfolios.length === 0 && <EmptyLine>No portfolios in this account.</EmptyLine>}
              {portfolios.map((portfolio) => (
                <div className="px-3 py-2 font-mono text-xs" key={portfolio.id || portfolio.name}>
                  <div className="text-zinc-100">{textValue(portfolio.name, "Portfolio")}</div>
                  <div className="mt-1 text-zinc-500">
                    {textValue(portfolio.base_currency, "USD")} · {textValue(portfolio.id, "id pending")}
                  </div>
                </div>
              ))}
            </div>
          </TerminalPanel>
        </div>
      </div>
    </AppShell>
  );
}
