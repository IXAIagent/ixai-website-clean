"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  AccountPortfolioResponse,
  AccountResponse,
  addCash,
  addCrypto,
  addFcn,
  addStock,
  getAccounts,
  getAccountPortfolios,
  getCash,
  getCrypto,
  getFcns,
  getStocks,
} from "../lib/api";
import { useI18n } from "../lib/i18n";

type AssetType = "stock" | "fcn" | "crypto" | "cash";
type RecentPosition = { type: string; label: string; detail: string };

// v4.9D: labels resolved through useI18n inside the component (was hardcoded
// bilingual "Input / 資產輸入" etc., which never reflected the active locale).

function positiveNumber(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function textValue(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function money(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return `$${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function inputClass() {
  return "w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-400";
}

export default function InputWorkspacePage() {
  const { t } = useI18n();
  const labels = useMemo(
    () => ({
      input: t("page.input"),
      account: t("input.account"),
      portfolio: t("input.portfolio"),
      assetType: t("input.assetType"),
      recent: t("input.recent"),
      submitAsset: t("input.submitAsset"),
      dataPending: t("common.dataPending"),
    }),
    [t],
  );
  const assetTypes = useMemo<Array<{ id: AssetType; label: string; hint: string }>>(
    () => [
      { id: "stock", label: t("input.asset.stock"), hint: t("input.hints.stock") },
      { id: "fcn", label: "FCN", hint: t("input.fcnHint") },
      { id: "crypto", label: t("input.asset.crypto"), hint: t("input.hints.crypto") },
      { id: "cash", label: t("input.asset.cash"), hint: t("input.hints.cash") },
    ],
    [t],
  );
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [portfolios, setPortfolios] = useState<AccountPortfolioResponse[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState("");
  const [recent, setRecent] = useState<RecentPosition[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [stock, setStock] = useState({ symbol: "", quantity: "", avg_price: "", current_price: "" });
  const [fcn, setFcn] = useState({ name: "", worst_of: "", notional: "", ki: "", ko: "" });
  const [crypto, setCrypto] = useState({ symbol: "", quantity: "", avg_price: "", current_price: "" });
  const [cash, setCash] = useState({ currency: "USD", amount: "" });

  async function loadAccounts() {
    try {
      const response = await getAccounts();
      const items = Array.isArray(response.items) ? response.items : [];
      setAccounts(items);
      const firstAccount = items[0]?.id || "";
      setSelectedAccount((current) => current || firstAccount);
      if (firstAccount) {
        const portfolioResponse = await getAccountPortfolios(firstAccount);
        const portfolioItems = Array.isArray(portfolioResponse.items) ? portfolioResponse.items : [];
        setPortfolios(portfolioItems);
        setSelectedPortfolio((current) => current || portfolioItems[0]?.id || "");
      }
    } catch {
      setAccounts([]);
      setPortfolios([]);
    }
  }

  async function loadRecent() {
    try {
      const [stocks, fcns, cryptos, cashItems] = await Promise.all([
        getStocks().catch(() => []),
        getFcns().catch(() => []),
        getCrypto().catch(() => []),
        getCash().catch(() => []),
      ]);
      const rows: RecentPosition[] = [
        ...stocks.slice(0, 3).map((item) => ({
          type: "Stock",
          label: textValue(item.symbol, "STOCK"),
          detail: `${textValue(item.quantity, "0")} sh · ${money(item.current_value)}`,
        })),
        ...fcns.slice(0, 3).map((item) => ({
          type: "FCN",
          label: textValue(item.fcn_code || item.name, "FCN"),
          detail:
            Number(item.notional_amount || item.notional || 0) > 0
              ? `notional ${money(item.notional_amount || item.notional)}`
              : labels.dataPending,
        })),
        ...cryptos.slice(0, 3).map((item) => ({
          type: "Crypto",
          label: textValue(item.symbol, "CRYPTO"),
          detail: `${textValue(item.quantity, "0")} · ${money(item.current_value)}`,
        })),
        ...cashItems.slice(0, 3).map((item) => ({
          type: "Cash",
          label: textValue(item.currency, "USD"),
          detail: money(item.amount),
        })),
      ];
      setRecent(rows.slice(0, 8));
    } catch {
      setRecent([]);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccounts();
      void loadRecent();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      if (assetType === "stock") {
        const symbol = stock.symbol.trim().toUpperCase();
        const quantity = positiveNumber(stock.quantity);
        const avgPrice = positiveNumber(stock.avg_price);
        const currentPrice = positiveNumber(stock.current_price);
        if (!symbol) {
          setError(t("input.errors.symbolRequired"));
          setSaving(false);
          return;
        }
        if (quantity === null) {
          setError(t("input.errors.quantityRequired"));
          setSaving(false);
          return;
        }
        if (avgPrice === null) {
          setError(t("input.errors.avgPriceRequired"));
          setSaving(false);
          return;
        }
        if (currentPrice === null) {
          setError(t("input.errors.currentPriceRequired"));
          setSaving(false);
          return;
        }
        if (process.env.NODE_ENV === "development") {
          console.debug("IXAI stock payload", { symbol, quantity, avg_price: avgPrice, current_price: currentPrice });
        }
        await addStock({
          symbol,
          quantity,
          avg_price: avgPrice,
          current_price: currentPrice,
        });
        setStock({ symbol: "", quantity: "", avg_price: "", current_price: "" });
      } else if (assetType === "crypto") {
        const symbol = crypto.symbol.trim().toUpperCase();
        const quantity = positiveNumber(crypto.quantity);
        const avgPrice = crypto.avg_price.trim() ? positiveNumber(crypto.avg_price) : null;
        const currentPrice = positiveNumber(crypto.current_price);
        if (!symbol) {
          setError(t("input.errors.symbolRequired"));
          setSaving(false);
          return;
        }
        if (quantity === null) {
          setError(t("input.errors.quantityRequired"));
          setSaving(false);
          return;
        }
        if (crypto.avg_price.trim() && avgPrice === null) {
          setError(t("input.errors.avgPriceRequired"));
          setSaving(false);
          return;
        }
        if (currentPrice === null) {
          setError(t("input.errors.currentPriceRequired"));
          setSaving(false);
          return;
        }
        if (process.env.NODE_ENV === "development") {
          console.debug("IXAI crypto payload", {
            symbol,
            quantity,
            avg_price: avgPrice,
            current_price: currentPrice,
            asset_type: "spot",
          });
        }
        await addCrypto({
          symbol,
          quantity,
          avg_price: avgPrice,
          current_price: currentPrice,
          asset_type: "spot",
        });
        setCrypto({ symbol: "", quantity: "", avg_price: "", current_price: "" });
      } else if (assetType === "cash") {
        const currency = cash.currency.trim().toUpperCase();
        const amount = positiveNumber(cash.amount);
        if (!currency) {
          setError(t("input.errors.currencyRequired"));
          setSaving(false);
          return;
        }
        if (amount === null) {
          setError(t("input.errors.amountRequired"));
          setSaving(false);
          return;
        }
        await addCash({
          currency,
          amount,
        });
        setCash({ currency: "USD", amount: "" });
      } else {
        // v4.9E: FCN validation — `numberValue("")` silently returned 0 so
        // empty notional was submitted as $0. Validate explicitly and surface
        // a localized error before sending the payload.
        const notionalRaw = fcn.notional.trim();
        const notionalNum = Number(notionalRaw);
        if (!notionalRaw || !Number.isFinite(notionalNum) || notionalNum <= 0) {
          setError(t("input.errors.fcnNotionalRequired"));
          setSaving(false);
          return;
        }
        const kiRaw = fcn.ki.trim();
        let kiNum: number | null = null;
        if (kiRaw) {
          const parsedKi = Number(kiRaw);
          if (!Number.isFinite(parsedKi) || parsedKi <= 0) {
            setError(t("input.errors.fcnInvalidKi"));
            setSaving(false);
            return;
          }
          kiNum = parsedKi;
        }
        const koRaw = fcn.ko.trim();
        let koNum: number | null = null;
        if (koRaw) {
          const parsedKo = Number(koRaw);
          if (!Number.isFinite(parsedKo) || parsedKo <= 0) {
            setError(t("input.errors.fcnInvalidKo"));
            setSaving(false);
            return;
          }
          koNum = parsedKo;
        }
        await addFcn({
          name: fcn.name.trim(),
          fcn_code: fcn.name.trim().toUpperCase(),
          notional_amount: notionalNum,
          worst_of_symbol: fcn.worst_of.trim().toUpperCase(),
          ki_level: kiNum,
          ko_level: koNum,
          underlying_details: fcn.worst_of.trim()
            ? [{ symbol: fcn.worst_of.trim().toUpperCase(), initial_price: null }]
            : [],
        });
        setFcn({ name: "", worst_of: "", notional: "", ki: "", ko: "" });
      }
      setStatus(t("input.statusOk"));
      await loadRecent();
    } catch (err) {
      const detail = err instanceof Error ? err.message : t("input.statusError");
      setError(`${t("input.statusError")} ${detail}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title={labels.input}
      subtitle={t("input.subtitle")}
    >
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <TerminalPanel title={t("input.context")} meta="account">
          <div className="space-y-3 font-mono text-xs">
            <label className="block text-zinc-500">
              {labels.account}
              <select
                className={`${inputClass()} mt-2`}
                value={selectedAccount}
                onChange={async (event) => {
                  const accountId = event.target.value;
                  setSelectedAccount(accountId);
                  setSelectedPortfolio("");
                  try {
                    const response = await getAccountPortfolios(accountId);
                    const items = Array.isArray(response.items) ? response.items : [];
                    setPortfolios(items);
                    setSelectedPortfolio(items[0]?.id || "");
                  } catch {
                    setPortfolios([]);
                  }
                }}
              >
                <option value="">{t("input.defaultUserPortfolio")}</option>
                {accounts.map((account) => (
                  <option key={account.id || account.name} value={account.id || ""}>
                    {textValue(account.name, t("common.account"))}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-zinc-500">
              {labels.portfolio}
              <select
                className={`${inputClass()} mt-2`}
                value={selectedPortfolio}
                onChange={(event) => setSelectedPortfolio(event.target.value)}
              >
                <option value="">{t("input.currentWritePortfolio")}</option>
                {portfolios.map((portfolio) => (
                  <option key={portfolio.id || portfolio.name} value={portfolio.id || ""}>
                    {textValue(portfolio.name, t("common.portfolio"))}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-zinc-600">
              {t("input.selectorHint")}
            </div>
          </div>
        </TerminalPanel>

        <TerminalPanel title={t("input.addAsset")} meta={t("input.ticketMeta")}>
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            {assetTypes.map((item) => (
              <button
                className={`border px-3 py-2 text-left text-xs transition ${
                  assetType === item.id
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
                key={item.id}
                onClick={() => setAssetType(item.id)}
                type="button"
              >
                <div className="font-semibold">{item.label}</div>
                <div className="mt-1 text-[11px] text-zinc-500">{item.hint}</div>
              </button>
            ))}
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            {assetType === "stock" && (
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Symbol" value={stock.symbol} onChange={(value) => setStock({ ...stock, symbol: value })} placeholder="AAPL / 2330" />
                <Field label={t("input.quantity")} value={stock.quantity} onChange={(value) => setStock({ ...stock, quantity: value })} />
                <Field label={t("input.avgCost")} value={stock.avg_price} onChange={(value) => setStock({ ...stock, avg_price: value })} />
                <Field label={t("input.currentPrice")} value={stock.current_price} onChange={(value) => setStock({ ...stock, current_price: value })} />
              </div>
            )}
            {assetType === "crypto" && (
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Symbol" value={crypto.symbol} onChange={(value) => setCrypto({ ...crypto, symbol: value })} placeholder="BTC / ETH" />
                <Field label={t("input.quantity")} value={crypto.quantity} onChange={(value) => setCrypto({ ...crypto, quantity: value })} />
                <Field label={t("input.avgCost")} value={crypto.avg_price} onChange={(value) => setCrypto({ ...crypto, avg_price: value })} />
                <Field label={t("input.currentPrice")} value={crypto.current_price} onChange={(value) => setCrypto({ ...crypto, current_price: value })} />
              </div>
            )}
            {assetType === "cash" && (
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Currency" value={cash.currency} onChange={(value) => setCash({ ...cash, currency: value })} />
                <Field label={t("input.amount")} value={cash.amount} onChange={(value) => setCash({ ...cash, amount: value })} />
              </div>
            )}
            {assetType === "fcn" && (
              <div className="grid gap-3 md:grid-cols-5">
                <Field label="Name / Code" value={fcn.name} onChange={(value) => setFcn({ ...fcn, name: value })} />
                <Field label="Worst-of" value={fcn.worst_of} onChange={(value) => setFcn({ ...fcn, worst_of: value })} placeholder="MDB" />
                <Field label="Notional" value={fcn.notional} onChange={(value) => setFcn({ ...fcn, notional: value })} />
                <Field label="KI" value={fcn.ki} onChange={(value) => setFcn({ ...fcn, ki: value })} />
                <Field label="KO" value={fcn.ko} onChange={(value) => setFcn({ ...fcn, ko: value })} />
              </div>
            )}

            {status && <div className="border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">{status}</div>}
            {error && <div className="border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}

            <button
              className="border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/10 disabled:opacity-50"
              disabled={saving}
              type="submit"
            >
              {saving ? t("input.submitting") : labels.submitAsset}
            </button>
          </form>
        </TerminalPanel>

        <TerminalPanel title={labels.recent} meta="preview">
          <div className="divide-y divide-zinc-800 border border-zinc-800">
            {recent.length === 0 && <EmptyLine>No recent positions yet.</EmptyLine>}
            {recent.map((item) => (
              <div className="px-3 py-2 font-mono text-xs" key={`${item.type}-${item.label}-${item.detail}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">{item.type}</span>
                  <span className="text-zinc-100">{item.label}</span>
                </div>
                <div className="mt-1 truncate text-zinc-500">{item.detail}</div>
              </div>
            ))}
          </div>
        </TerminalPanel>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block font-mono text-xs text-zinc-500">
      {label}
      <input
        className={`${inputClass()} mt-2`}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
