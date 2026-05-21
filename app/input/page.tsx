"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

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
import { resolveStockSymbol, type StockMarket } from "../lib/workflow-utils";

type AssetType = "stock" | "fcn" | "crypto" | "cash";
type CryptoMode = "spot" | "grid" | "dual" | "earn";
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

const stockMarkets: StockMarket[] = ["Auto", "US", "TW", "HK", "JP", "KR"];
const cashCurrencies = ["USD", "TWD", "HKD", "JPY", "KRW", "EUR", "GBP", "USDT", "USDC"];
const observationTypes = ["American", "European"];
const couponFrequencies = ["monthly", "quarterly"];
const cryptoModes: CryptoMode[] = ["spot", "grid", "dual", "earn"];

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() !== day) date.setDate(0);
  return date.toISOString().slice(0, 10);
}

function addBusinessDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining -= 1;
  }
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
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
      stock: t("input.asset.stock"),
      crypto: t("input.asset.crypto"),
      cash: t("input.asset.cash"),
      awaitingReferenceData: t("input.awaitingReferenceData"),
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

  const [stock, setStock] = useState({ symbol: "", market: "Auto" as StockMarket, quantity: "", avg_price: "" });
  const [fcn, setFcn] = useState({
    name: "",
    issuer: "",
    currency: "USD",
    issue_date: "",
    coupon_rate: "",
    tenor_months: "",
    payment_lag_days: "3",
    notional: "",
    strike: "",
    ki: "",
    ko: "",
    observation_type: "American",
    coupon_frequency: "monthly",
    observation_dates: "",
    coupon_dates: "",
  });
  const [underlyings, setUnderlyings] = useState([{ symbol: "", initial_price: "", weight: "" }]);
  const [cryptoMode, setCryptoMode] = useState<CryptoMode>("spot");
  const [crypto, setCrypto] = useState({ symbol: "", quantity: "", avg_price: "", current_price: "" });
  const [cryptoGrid, setCryptoGrid] = useState({ symbol: "", lower: "", upper: "", grid_count: "", leverage: "", margin: "", direction: "Long grid" });
  const [cryptoDual, setCryptoDual] = useState({ asset: "BTC", direction: "Buy low", target_price: "", apr: "", settlement_date: "" });
  const [cryptoEarn, setCryptoEarn] = useState({ asset: "USDT", apr: "", amount: "", duration: "" });
  const [cash, setCash] = useState({ currency: "USD", amount: "" });
  const stockResolution = useMemo(() => resolveStockSymbol(stock.symbol, stock.market), [stock.market, stock.symbol]);
  const fcnSchedulePreview = useMemo(() => {
    const tenor = positiveNumber(fcn.tenor_months);
    const lag = positiveNumber(fcn.payment_lag_days) || 3;
    if (!fcn.issue_date || tenor === null) return [];
    const step = fcn.coupon_frequency === "quarterly" ? 3 : 1;
    const rows = [];
    for (let offset = step; offset <= tenor; offset += step) {
      const observationDate = addMonths(fcn.issue_date, offset);
      rows.push({ observationDate, paymentDate: addBusinessDays(observationDate, lag) });
    }
    return rows;
  }, [fcn.coupon_frequency, fcn.issue_date, fcn.payment_lag_days, fcn.tenor_months]);

  const loadAccounts = useCallback(async () => {
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
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const [stocks, fcns, cryptos, cashItems] = await Promise.all([
        getStocks().catch(() => []),
        getFcns().catch(() => []),
        getCrypto().catch(() => []),
        getCash().catch(() => []),
      ]);
      const rows: RecentPosition[] = [
        ...stocks.slice(0, 3).map((item) => ({
          type: labels.stock,
          label: textValue(item.symbol, "STOCK"),
          detail: `${t("input.shares")} ${textValue(item.quantity, "0")} · ${t("input.avgCost")} ${money(item.avg_price)} · ${t("input.currentPrice")} ${money(item.current_price)}`,
        })),
        ...fcns.slice(0, 3).map((item) => ({
          type: "FCN",
          label: textValue(item.fcn_code || item.name, "FCN"),
          detail:
            Number(item.notional_amount || item.notional || 0) > 0
              ? `notional ${money(item.notional_amount || item.notional)}`
              : labels.awaitingReferenceData,
        })),
        ...cryptos.slice(0, 3).map((item) => ({
          type: labels.crypto,
          label: textValue(item.symbol, "CRYPTO"),
          detail: `${textValue(item.quantity, "0")} · ${money(item.current_value)}`,
        })),
        ...cashItems.slice(0, 3).map((item) => ({
          type: labels.cash,
          label: textValue(item.currency, "USD"),
          detail: money(item.amount),
        })),
      ];
      setRecent(rows.slice(0, 8));
    } catch {
      setRecent([]);
    }
  }, [labels.awaitingReferenceData, labels.cash, labels.crypto, labels.stock, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccounts();
      void loadRecent();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccounts, loadRecent]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      if (assetType === "stock") {
        const symbol = stockResolution.normalizedSymbol;
        const quantity = positiveNumber(stock.quantity);
        const avgPrice = positiveNumber(stock.avg_price);
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
        if (process.env.NODE_ENV === "development") {
          console.debug("IXAI stock payload", { symbol, quantity, avg_price: avgPrice, current_price: avgPrice });
        }
        await addStock({
          symbol,
          quantity,
          avg_price: avgPrice,
          current_price: avgPrice,
        });
        setStock({ symbol: "", market: "Auto", quantity: "", avg_price: "" });
      } else if (assetType === "crypto") {
        if (cryptoMode === "spot") {
          const symbol = crypto.symbol.trim().toUpperCase();
          const quantity = positiveNumber(crypto.quantity);
          const avgPrice = positiveNumber(crypto.avg_price);
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
          await addCrypto({ symbol, quantity, avg_price: avgPrice, current_price: currentPrice, asset_type: "spot" });
          setCrypto({ symbol: "", quantity: "", avg_price: "", current_price: "" });
        } else if (cryptoMode === "grid") {
          const symbol = cryptoGrid.symbol.trim().toUpperCase();
          const lower = positiveNumber(cryptoGrid.lower);
          const upper = positiveNumber(cryptoGrid.upper);
          const gridCount = positiveNumber(cryptoGrid.grid_count);
          const leverage = positiveNumber(cryptoGrid.leverage);
          const margin = positiveNumber(cryptoGrid.margin);
          if (!symbol || lower === null || upper === null || gridCount === null || leverage === null || margin === null) {
            setError(t("input.errors.cryptoStrategyRequired"));
            setSaving(false);
            return;
          }
          await addCrypto({ symbol, quantity: margin, avg_price: lower, current_price: upper, asset_type: `grid:${cryptoGrid.direction}`, leverage, grid_lower: lower, grid_upper: upper });
          setCryptoGrid({ symbol: "", lower: "", upper: "", grid_count: "", leverage: "", margin: "", direction: "Long grid" });
        } else if (cryptoMode === "dual") {
          const target = positiveNumber(cryptoDual.target_price);
          const apr = positiveNumber(cryptoDual.apr);
          if (!cryptoDual.asset.trim() || target === null || apr === null || !cryptoDual.settlement_date.trim()) {
            setError(t("input.errors.cryptoStrategyRequired"));
            setSaving(false);
            return;
          }
          await addCrypto({ symbol: cryptoDual.asset.trim().toUpperCase(), quantity: 1, avg_price: apr, current_price: target, asset_type: `dual:${cryptoDual.direction}` });
          setCryptoDual({ asset: "BTC", direction: "Buy low", target_price: "", apr: "", settlement_date: "" });
        } else {
          const amount = positiveNumber(cryptoEarn.amount);
          const apr = positiveNumber(cryptoEarn.apr);
          if (!cryptoEarn.asset.trim() || amount === null || apr === null || !cryptoEarn.duration.trim()) {
            setError(t("input.errors.cryptoStrategyRequired"));
            setSaving(false);
            return;
          }
          await addCrypto({ symbol: cryptoEarn.asset.trim().toUpperCase(), quantity: amount, avg_price: 1, current_price: 1, asset_type: `stablecoin_earn:${cryptoEarn.duration}:${apr}` });
          setCryptoEarn({ asset: "USDT", apr: "", amount: "", duration: "" });
        }
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
        const notionalNum = positiveNumber(fcn.notional);
        const strikeNum = positiveNumber(fcn.strike);
        if (notionalNum === null) {
          setError(t("input.errors.fcnNotionalRequired"));
          setSaving(false);
          return;
        }
        if (strikeNum === null) {
          setError(t("input.errors.fcnInvalidStrike"));
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
        if (kiNum === null || koNum === null) {
          setError(t("input.errors.fcnBarrierRequired"));
          setSaving(false);
          return;
        }
        const normalizedUnderlyings = underlyings
          .map((item) => ({
            symbol: item.symbol.trim().toUpperCase(),
            initial_price: positiveNumber(item.initial_price),
            weight: item.weight.trim() ? positiveNumber(item.weight) : null,
          }))
          .filter((item) => item.symbol);
        if (normalizedUnderlyings.length === 0) {
          setError(t("input.errors.fcnUnderlyingRequired"));
          setSaving(false);
          return;
        }
        const worstOfSymbol = normalizedUnderlyings[0]?.symbol || "";
        await addFcn({
          name: fcn.name.trim(),
          fcn_code: fcn.name.trim().toUpperCase(),
          issuer: fcn.issuer.trim() || null,
          notional_amount: notionalNum,
          settlement_currency: fcn.currency,
          coupon_rate: positiveNumber(fcn.coupon_rate),
          tenor_months: positiveNumber(fcn.tenor_months),
          issue_date: fcn.issue_date || null,
          coupon_frequency: fcn.coupon_frequency,
          coupon_payment_lag_days: positiveNumber(fcn.payment_lag_days) || 3,
          observation_dates_json: fcn.observation_dates.trim() || null,
          coupon_dates_json: fcn.coupon_dates.trim() || null,
          worst_of_symbol: worstOfSymbol,
          ki_level: kiNum,
          ko_level: koNum,
          strike_level: strikeNum,
          underlyings: normalizedUnderlyings.map((item) => item.symbol).join(","),
          underlying_details: normalizedUnderlyings,
        });
        setFcn({
          name: "",
          issuer: "",
          currency: "USD",
          issue_date: "",
          coupon_rate: "",
          tenor_months: "",
          payment_lag_days: "3",
          notional: "",
          strike: "",
          ki: "",
          ko: "",
          observation_type: "American",
          coupon_frequency: "monthly",
          observation_dates: "",
          coupon_dates: "",
        });
        setUnderlyings([{ symbol: "", initial_price: "", weight: "" }]);
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
      <div className="mb-4 border border-zinc-800 bg-zinc-950/70 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {t("input.activeWriteHint")}
        </div>
        <div className="mt-2 text-sm leading-6 text-zinc-300">
          {t("input.workspaceGuide")}
        </div>
      </div>
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
                    ? item.id === "fcn"
                      ? "border-yellow-400/70 bg-yellow-400/10 text-yellow-100"
                      : "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                } ${item.id === "fcn" ? "sm:scale-[1.02]" : ""}`}
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
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <Field label={t("input.stockNameTicker")} value={stock.symbol} onChange={(value) => setStock({ ...stock, symbol: value })} placeholder={t("input.stockPlaceholder")} />
                  <Field label={t("input.shares")} value={stock.quantity} onChange={(value) => setStock({ ...stock, quantity: value })} />
                  <Field label={t("input.avgCost")} value={stock.avg_price} onChange={(value) => setStock({ ...stock, avg_price: value })} />
                  <SelectField
                    label={t("input.market")}
                    value={stock.market}
                    options={stockMarkets}
                    onChange={(value) => setStock({ ...stock, market: value as StockMarket })}
                  />
                </div>
                <div className="border border-zinc-800 bg-black/30 px-3 py-2 font-mono text-xs text-zinc-500">
                  <span className="text-zinc-400">{t("input.selectedTicker")}:</span>{" "}
                  <span className="text-emerald-200">{stockResolution.normalizedSymbol || t("common.dataPending")}</span>
                  {stockResolution.candidates.length > 1 && (
                    <span className="ml-2 text-zinc-600">
                      {t("input.candidates")}: {stockResolution.candidates.join(" / ")}
                    </span>
                  )}
                  <div className="mt-1 text-[11px] text-zinc-600">{t("input.stockPriceSystem")}</div>
                </div>
              </div>
            )}
            {assetType === "crypto" && (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-4">
                  {cryptoModes.map((mode) => (
                    <button
                      className={`border px-3 py-2 text-left font-mono text-xs ${
                        cryptoMode === mode
                          ? "border-emerald-400/70 text-emerald-200"
                          : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                      }`}
                      key={mode}
                      onClick={() => setCryptoMode(mode)}
                      type="button"
                    >
                      {t(`input.crypto.${mode}`)}
                    </button>
                  ))}
                </div>
                {cryptoMode === "spot" && (
                  <div className="grid gap-3 md:grid-cols-4">
                    <Field label={t("input.symbol")} value={crypto.symbol} onChange={(value) => setCrypto({ ...crypto, symbol: value })} placeholder="BTC / ETH" />
                    <Field label={t("input.quantity")} value={crypto.quantity} onChange={(value) => setCrypto({ ...crypto, quantity: value })} />
                    <Field label={t("input.avgCost")} value={crypto.avg_price} onChange={(value) => setCrypto({ ...crypto, avg_price: value })} />
                    <Field label={t("input.currentPrice")} value={crypto.current_price} onChange={(value) => setCrypto({ ...crypto, current_price: value })} />
                  </div>
                )}
                {cryptoMode === "grid" && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label={t("input.symbol")} value={cryptoGrid.symbol} onChange={(value) => setCryptoGrid({ ...cryptoGrid, symbol: value })} placeholder="BTC" />
                    <Field label={t("input.lowerRange")} value={cryptoGrid.lower} onChange={(value) => setCryptoGrid({ ...cryptoGrid, lower: value })} />
                    <Field label={t("input.upperRange")} value={cryptoGrid.upper} onChange={(value) => setCryptoGrid({ ...cryptoGrid, upper: value })} />
                    <Field label={t("input.gridCount")} value={cryptoGrid.grid_count} onChange={(value) => setCryptoGrid({ ...cryptoGrid, grid_count: value })} />
                    <Field label={t("input.leverage")} value={cryptoGrid.leverage} onChange={(value) => setCryptoGrid({ ...cryptoGrid, leverage: value })} />
                    <Field label={t("input.margin")} value={cryptoGrid.margin} onChange={(value) => setCryptoGrid({ ...cryptoGrid, margin: value })} />
                    <SelectField label={t("input.direction")} value={cryptoGrid.direction} options={["Long grid", "Neutral grid"]} onChange={(value) => setCryptoGrid({ ...cryptoGrid, direction: value })} />
                  </div>
                )}
                {cryptoMode === "dual" && (
                  <div className="grid gap-3 md:grid-cols-5">
                    <Field label={t("input.asset")} value={cryptoDual.asset} onChange={(value) => setCryptoDual({ ...cryptoDual, asset: value })} />
                    <SelectField label={t("input.direction")} value={cryptoDual.direction} options={["Buy low", "Sell high"]} onChange={(value) => setCryptoDual({ ...cryptoDual, direction: value })} />
                    <Field label={t("input.targetPrice")} value={cryptoDual.target_price} onChange={(value) => setCryptoDual({ ...cryptoDual, target_price: value })} />
                    <Field label="APR" value={cryptoDual.apr} onChange={(value) => setCryptoDual({ ...cryptoDual, apr: value })} />
                    <Field label={t("input.settlementDate")} value={cryptoDual.settlement_date} onChange={(value) => setCryptoDual({ ...cryptoDual, settlement_date: value })} placeholder="2026-06-30" />
                  </div>
                )}
                {cryptoMode === "earn" && (
                  <div className="grid gap-3 md:grid-cols-4">
                    <SelectField label={t("input.asset")} value={cryptoEarn.asset} options={["USDT", "USDC"]} onChange={(value) => setCryptoEarn({ ...cryptoEarn, asset: value })} />
                    <Field label="APR" value={cryptoEarn.apr} onChange={(value) => setCryptoEarn({ ...cryptoEarn, apr: value })} />
                    <Field label={t("input.amount")} value={cryptoEarn.amount} onChange={(value) => setCryptoEarn({ ...cryptoEarn, amount: value })} />
                    <Field label={t("input.duration")} value={cryptoEarn.duration} onChange={(value) => setCryptoEarn({ ...cryptoEarn, duration: value })} />
                  </div>
                )}
              </div>
            )}
            {assetType === "cash" && (
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label={t("input.currency")} value={cash.currency} options={cashCurrencies} onChange={(value) => setCash({ ...cash, currency: value })} />
                <Field label={t("input.cashBalance")} value={cash.amount} onChange={(value) => setCash({ ...cash, amount: value })} />
              </div>
            )}
            {assetType === "fcn" && (
              <div className="border border-yellow-400/30 bg-yellow-400/[0.04] p-3">
                <div className="mb-3 text-sm leading-6 text-zinc-300">
                  {t("input.fcnFlagship")}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      {t("input.fcnTerms")}
                    </div>
                    <div className="grid gap-3">
                      <Field label={t("input.nameCode")} value={fcn.name} onChange={(value) => setFcn({ ...fcn, name: value })} />
                      <Field label={t("input.issuer")} value={fcn.issuer} onChange={(value) => setFcn({ ...fcn, issuer: value })} />
                      <SelectField label={t("input.currency")} value={fcn.currency} options={cashCurrencies} onChange={(value) => setFcn({ ...fcn, currency: value })} />
                      <Field label={t("input.issueDate")} value={fcn.issue_date} onChange={(value) => setFcn({ ...fcn, issue_date: value })} placeholder="2026-05-16" />
                      <Field label={t("input.couponRate")} value={fcn.coupon_rate} onChange={(value) => setFcn({ ...fcn, coupon_rate: value })} />
                      <Field label={t("input.tenorMonths")} value={fcn.tenor_months} onChange={(value) => setFcn({ ...fcn, tenor_months: value })} />
                      <Field label={t("input.paymentLagDays")} value={fcn.payment_lag_days} onChange={(value) => setFcn({ ...fcn, payment_lag_days: value })} />
                      <Field label={t("input.notional")} value={fcn.notional} onChange={(value) => setFcn({ ...fcn, notional: value })} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      {t("input.fcnBarriers")}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Strike" value={fcn.strike} onChange={(value) => setFcn({ ...fcn, strike: value })} />
                      <Field label="KI" value={fcn.ki} onChange={(value) => setFcn({ ...fcn, ki: value })} />
                      <Field label="KO" value={fcn.ko} onChange={(value) => setFcn({ ...fcn, ko: value })} />
                      <SelectField label={t("input.observationType")} value={fcn.observation_type} options={observationTypes} onChange={(value) => setFcn({ ...fcn, observation_type: value })} />
                      <SelectField label={t("input.observationFrequency")} value={fcn.coupon_frequency} options={couponFrequencies} onChange={(value) => setFcn({ ...fcn, coupon_frequency: value })} />
                      <Field label={t("input.observationDates")} value={fcn.observation_dates} onChange={(value) => setFcn({ ...fcn, observation_dates: value })} />
                      <Field label={t("input.paymentDates")} value={fcn.coupon_dates} onChange={(value) => setFcn({ ...fcn, coupon_dates: value })} />
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      {t("input.schedulePreview")}
                    </div>
                    <div className="grid gap-2 border border-zinc-800 bg-black/20 p-2 font-mono text-xs sm:grid-cols-3">
                      {fcnSchedulePreview.length === 0 && <div className="text-zinc-500">{t("input.schedulePreviewPending")}</div>}
                      {fcnSchedulePreview.slice(0, 6).map((row, index) => (
                        <div className="border border-zinc-900 px-2 py-1 text-zinc-400" key={`${row.observationDate}-${index}`}>
                          <span className="text-zinc-600">T{index + 1}</span> {row.observationDate} → {row.paymentDate}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        {t("input.fcnUnderlyings")}
                      </div>
                      {underlyings.length > 1 && (
                        <div className="font-mono text-xs text-yellow-200">
                          {t("input.worstOfActive")}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {underlyings.map((item, index) => (
                        <div className="grid gap-2 border border-zinc-800 bg-black/20 p-2 sm:grid-cols-[1fr_1fr_0.7fr_auto]" key={index}>
                          <Field label={t("input.underlyingAsset")} value={item.symbol} onChange={(value) => setUnderlyings((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, symbol: value } : row))} placeholder="MDB" />
                          <Field label={t("input.initialPrice")} value={item.initial_price} onChange={(value) => setUnderlyings((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, initial_price: value } : row))} />
                          <Field label={t("input.weightOptional")} value={item.weight} onChange={(value) => setUnderlyings((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, weight: value } : row))} />
                          <button
                            className="self-end border border-zinc-700 px-2 py-2 font-mono text-xs text-zinc-400 disabled:opacity-40"
                            disabled={underlyings.length === 1}
                            onClick={() => setUnderlyings((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                            type="button"
                          >
                            {t("input.remove")}
                          </button>
                        </div>
                      ))}
                      <button
                        className="border border-yellow-400/40 px-3 py-2 font-mono text-xs text-yellow-100"
                        onClick={() => setUnderlyings((rows) => [...rows, { symbol: "", initial_price: "", weight: "" }])}
                        type="button"
                      >
                        {t("input.addUnderlying")}
                      </button>
                    </div>
                  </div>
                </div>
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

        <TerminalPanel title={labels.recent} meta={t("dashboard.meta.overview")}>
          <div className="divide-y divide-zinc-800 border border-zinc-800">
            {recent.length === 0 && <EmptyLine>{t("input.noRecentActivity")}</EmptyLine>}
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

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block font-mono text-xs text-zinc-500">
      {label}
      <select
        className={`${inputClass()} mt-2`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
