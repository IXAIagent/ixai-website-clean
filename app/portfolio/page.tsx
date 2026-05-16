"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  AccountResponse,
  AllocationItem,
  CashPositionResponse,
  CryptoPositionResponse,
  deleteCash,
  deleteCrypto,
  deleteFcn,
  deleteStock,
  FCNPositionResponse,
  getAccounts,
  getCash,
  getCrypto,
  getFcns,
  getMyAssetAllocation,
  getMySummary,
  getStocks,
  StockPositionResponse,
  SummaryResponse,
} from "../lib/api";
import { useI18n } from "../lib/i18n";

type HoldingRow = {
  id?: string | number | null;
  label: string;
  assetType: "Stock" | "Crypto Spot" | "Crypto Grid" | "Dual Investment" | "Stablecoin Earn" | "Cash" | "FCN";
  quantity?: number;
  notional?: number;
  avgPrice?: number;
  currentPrice?: number;
  marketValue: number;
  source?: string | null;
  stale?: boolean | null;
  risk?: string | null;
  detail?: string | null;
  deleteKind?: "stock" | "crypto" | "cash" | "fcn";
};

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: unknown) {
  const parsed = numberValue(value);
  return parsed > 0 ? parsed : null;
}

function money(value: unknown) {
  return `$${numberValue(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function price(value: unknown) {
  const parsed = optionalNumber(value);
  if (parsed === null) return "待更新";
  return `$${parsed.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function percent(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return "0.0%";
  return `${parsed.toFixed(1)}%`;
}

function riskClass(risk?: string | null) {
  const key = (risk || "").toLowerCase();
  if (key.includes("high") || key.includes("critical")) return "text-red-300 border-red-500/40";
  if (key.includes("medium") || key.includes("watch")) return "text-yellow-300 border-yellow-500/40";
  if (key.includes("low") || key.includes("safe")) return "text-emerald-300 border-emerald-500/40";
  return "text-zinc-400 border-zinc-700";
}

function sourceLabel(source?: string | null, stale?: boolean | null) {
  if (stale) return "STALE";
  const normalized = (source || "").toLowerCase();
  if (normalized.includes("yahoo") || normalized.includes("binance")) return "LIVE";
  if (normalized.includes("input")) return "INPUT";
  if (normalized.includes("stored") || normalized.includes("manual")) return "STORED";
  return source || "SOURCE PENDING";
}

function sourceClass(source?: string | null, stale?: boolean | null) {
  const label = sourceLabel(source, stale);
  if (label === "LIVE") return "text-emerald-300";
  if (label === "STALE") return "text-yellow-300";
  return "text-zinc-500";
}

function displayStock(stock: StockPositionResponse) {
  const symbol = stock.symbol || "STOCK";
  return stock.display_name && stock.display_name !== symbol
    ? `${stock.display_name} ${symbol}`
    : symbol;
}

function displayCrypto(crypto: CryptoPositionResponse) {
  const symbol = crypto.symbol || "CRYPTO";
  return crypto.display_name && crypto.display_name !== symbol
    ? `${crypto.display_name} ${symbol}`
    : symbol;
}

function cryptoSubtype(crypto: CryptoPositionResponse): HoldingRow["assetType"] {
  const assetType = (crypto.asset_type || "").toLowerCase();
  if (assetType.startsWith("grid")) return "Crypto Grid";
  if (assetType.startsWith("dual")) return "Dual Investment";
  if (assetType.includes("earn") || assetType.includes("stablecoin")) return "Stablecoin Earn";
  return "Crypto Spot";
}

function cryptoDetail(crypto: CryptoPositionResponse) {
  const assetType = (crypto.asset_type || "").toLowerCase();
  if (assetType.startsWith("grid")) {
    const direction = crypto.asset_type?.split(":")[1] || "grid";
    return `Range ${price(crypto.grid_lower)}-${price(crypto.grid_upper)} · Lev ${optionalNumber(crypto.leverage) || "-"} · ${direction}`;
  }
  if (assetType.startsWith("dual")) {
    const direction = crypto.asset_type?.split(":")[1] || "Dual";
    return `${direction} · Target ${price(crypto.current_price)} · APR ${optionalNumber(crypto.avg_price) || "-"}%`;
  }
  if (assetType.includes("earn") || assetType.includes("stablecoin")) {
    const [, duration, apr] = crypto.asset_type?.split(":") || [];
    return `APR ${apr || "-"}% · Duration ${duration || "-"}`;
  }
  return null;
}

function displayFcn(fcn: FCNPositionResponse) {
  return fcn.fcn_code || fcn.name || fcn.code || "FCN";
}

function uniqueById<T extends { id?: string | number | null }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item, index) => {
    const key = item.id === undefined || item.id === null ? `idx-${index}` : String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeAllocation(items: AllocationItem[] | null | undefined) {
  return Array.isArray(items) ? items : [];
}

function stockRows(summary: SummaryResponse | null, raw: StockPositionResponse[]) {
  const source = Array.isArray(summary?.stock_positions)
    ? summary?.stock_positions
    : Array.isArray(summary?.stocks)
      ? summary?.stocks
      : raw;
  return uniqueById(source || []).map<HoldingRow>((stock) => {
    const quantity = numberValue(stock.quantity);
    const currentPrice = numberValue(stock.current_price);
    const fallbackValue = quantity * currentPrice;
    return {
      id: stock.id,
      label: displayStock(stock),
      assetType: "Stock",
      quantity,
      avgPrice: optionalNumber(stock.avg_price) || undefined,
      currentPrice: optionalNumber(stock.current_price) || undefined,
      marketValue: numberValue(stock.current_value) || fallbackValue,
      source: stock.price_source,
      stale: stock.is_stale,
      deleteKind: "stock",
    };
  });
}

function cryptoRows(summary: SummaryResponse | null, raw: CryptoPositionResponse[]) {
  const source = Array.isArray(summary?.crypto_positions) ? summary?.crypto_positions : raw;
  return uniqueById(source || []).map<HoldingRow>((crypto) => {
    const quantity = numberValue(crypto.quantity);
    const currentPrice = numberValue(crypto.current_price);
    const avgPrice = numberValue(crypto.avg_price);
    const fallbackValue = quantity * (currentPrice || avgPrice);
    return {
      id: crypto.id,
      label: displayCrypto(crypto),
      assetType: cryptoSubtype(crypto),
      quantity,
      avgPrice: optionalNumber(crypto.avg_price) || undefined,
      currentPrice: optionalNumber(crypto.current_price) || undefined,
      marketValue: numberValue(crypto.current_value) || fallbackValue,
      source: currentPrice > 0 ? crypto.price_source : "input estimate",
      stale: crypto.is_stale || currentPrice <= 0,
      detail: cryptoDetail(crypto),
      deleteKind: "crypto",
    };
  });
}

function cashRows(summary: SummaryResponse | null, raw: CashPositionResponse[]) {
  const source = Array.isArray(summary?.cash_summary) ? summary?.cash_summary : raw;
  return uniqueById(source || []).map<HoldingRow>((cash) => ({
    id: cash.id,
    label: cash.currency || "CASH",
    assetType: "Cash",
    marketValue: numberValue(cash.amount),
    source: "manual",
    deleteKind: "cash",
  }));
}

function fcnRows(summary: SummaryResponse | null, raw: FCNPositionResponse[]) {
  const positionSource = Array.isArray(summary?.fcn_positions) ? summary?.fcn_positions : raw;
  const analysisSource = Array.isArray(summary?.fcn_analysis) ? summary?.fcn_analysis : [];
  const analysisByCode = new Map<string, FCNPositionResponse>();

  analysisSource.forEach((item, index) => {
    const key = item.fcn_code || item.name || item.code || String(item.id ?? index);
    analysisByCode.set(key, item);
  });

  return uniqueById(positionSource || []).map<HoldingRow>((position, index) => {
    const key = position.fcn_code || position.name || position.code || String(position.id ?? index);
    const analysis = analysisByCode.get(key);
    return {
      id: position.id,
      label: displayFcn(position),
      assetType: "FCN",
      notional: numberValue(position.notional_amount || position.notional),
      marketValue: numberValue(position.notional_amount || position.notional),
      source: analysis?.price_source || position.price_source || "monitor",
      stale: analysis?.is_stale || position.is_stale,
      risk: analysis?.risk_level || position.risk_level,
      deleteKind: "fcn",
    };
  });
}

function plText(row: HoldingRow) {
  if (!row.quantity || !row.avgPrice || !row.currentPrice) return "-";
  const value = (row.currentPrice - row.avgPrice) * row.quantity;
  const tone = value >= 0 ? "text-emerald-300" : "text-red-300";
  return <span className={tone}>{money(value)}</span>;
}

function HoldingSection({ title, rows, onDelete }: { title: string; rows: HoldingRow[]; onDelete: (row: HoldingRow) => void }) {
  const { t } = useI18n();
  return (
    <div className="border border-zinc-800 bg-zinc-950/70">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-300">{title}</h3>
        <span className="font-mono text-[10px] text-zinc-500">{rows.length} {t("portfolio.positions")}</span>
      </div>
      <div className="divide-y divide-zinc-900">
        {rows.length === 0 && <EmptyLine>{t("common.dataPending")}</EmptyLine>}
        {rows.map((row, index) => (
          <div className="grid gap-2 px-3 py-2 text-xs md:grid-cols-[1.5fr_0.7fr_0.9fr_0.9fr_0.8fr_0.7fr]" key={`${row.assetType}-${row.id ?? row.label}-${index}`}>
            <div>
              <div className="font-semibold text-zinc-100">{row.label}</div>
              <div className="font-mono text-[10px] text-zinc-500">{row.assetType}</div>
              {row.detail && <div className="mt-1 font-mono text-[10px] text-zinc-600">{row.detail}</div>}
            </div>
            <div className="font-mono text-zinc-400">
              {row.notional ? money(row.notional) : row.quantity ? row.quantity.toLocaleString() : "-"}
            </div>
            <div>
              <div className="text-zinc-400">{price(row.currentPrice)}</div>
              <div className={`font-mono text-[10px] ${sourceClass(row.source, row.stale)}`}>
                {sourceLabel(row.source, row.stale)}
              </div>
            </div>
            <div className="font-semibold text-zinc-100">{money(row.marketValue)}</div>
            <div className="font-mono text-zinc-400">{plText(row)}</div>
            <div className="flex gap-2 md:justify-end">
              <button className="border border-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-500" disabled type="button">
                Edit next
              </button>
              <button
                className="border border-red-500/40 px-2 py-1 font-mono text-[10px] text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                disabled={!row.id || !row.deleteKind}
                onClick={() => onDelete(row)}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { t } = useI18n();
  const labels = useMemo(
    () => ({
      title: t("page.portfolio"),
      subtitle: t("portfolio.subtitle"),
      header: t("portfolio.header"),
      allocation: t("portfolio.allocation"),
      holdings: t("portfolio.holdings"),
      exposure: t("portfolio.exposure"),
    }),
    [t],
  );
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [allocation, setAllocation] = useState<AllocationItem[]>([]);
  const [stocks, setStocks] = useState<StockPositionResponse[]>([]);
  const [crypto, setCrypto] = useState<CryptoPositionResponse[]>([]);
  const [cash, setCash] = useState<CashPositionResponse[]>([]);
  const [fcns, setFcns] = useState<FCNPositionResponse[]>([]);
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  async function loadPortfolio() {
    setLoading(true);
    setError("");
    try {
      const [
        summaryData,
        allocationData,
        stockData,
        cryptoData,
        cashData,
        fcnData,
        accountData,
      ] = await Promise.all([
        getMySummary(),
        getMyAssetAllocation(),
        getStocks().catch(() => []),
        getCrypto().catch(() => []),
        getCash().catch(() => []),
        getFcns().catch(() => []),
        getAccounts().catch(() => ({ items: [] })),
      ]);
      setSummary(summaryData);
      setAllocation(normalizeAllocation(allocationData.items));
      setStocks(Array.isArray(stockData) ? stockData : []);
      setCrypto(Array.isArray(cryptoData) ? cryptoData : []);
      setCash(Array.isArray(cashData) ? cashData : []);
      setFcns(Array.isArray(fcnData) ? fcnData : []);
      setAccounts(Array.isArray(accountData.items) ? accountData.items : []);
      setUpdatedAt(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portfolio workspace unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPortfolio();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleDelete(row: HoldingRow) {
    if (!row.id || !row.deleteKind) return;
    if (!window.confirm(t("portfolio.deleteConfirm"))) return;
    try {
      if (row.deleteKind === "stock") await deleteStock(row.id);
      if (row.deleteKind === "crypto") await deleteCrypto(row.id);
      if (row.deleteKind === "cash") await deleteCash(row.id);
      if (row.deleteKind === "fcn") await deleteFcn(row.id);
      await loadPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const rows = useMemo(() => {
    const stock = stockRows(summary, stocks);
    const cryptoRowsValue = cryptoRows(summary, crypto);
    const cashRowsValue = cashRows(summary, cash);
    const fcnRowsValue = fcnRows(summary, fcns);
    return {
      stock,
      crypto: cryptoRowsValue,
      cash: cashRowsValue,
      fcn: fcnRowsValue,
      all: [...stock, ...cryptoRowsValue, ...cashRowsValue, ...fcnRowsValue],
    };
  }, [cash, crypto, fcns, stocks, summary]);

  const totalValue = numberValue(summary?.total_value) || rows.all.reduce((sum, row) => sum + row.marketValue, 0);
  const topHolding = rows.all
    .filter((row) => row.marketValue > 0)
    .sort((a, b) => b.marketValue - a.marketValue)[0];
  const stockValue = rows.stock.reduce((sum, row) => sum + row.marketValue, 0);
  const cryptoValue = rows.crypto.reduce((sum, row) => sum + row.marketValue, 0);
  const fcnValue = rows.fcn.reduce((sum, row) => sum + row.marketValue, 0);
  const cashValue = rows.cash.reduce((sum, row) => sum + row.marketValue, 0);
  const stockRatio = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;
  const cryptoRatio = totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0;
  const fcnRatio = totalValue > 0 ? (fcnValue / totalValue) * 100 : 0;
  const cashRatio = totalValue > 0 ? (cashValue / totalValue) * 100 : 0;
  const accountName = accounts[0]?.name || "Personal account context";
  const isEmpty = !loading && rows.all.length === 0;

  return (
    <AppShell title={t("page.portfolio")} subtitle={labels.subtitle}>
      <div className="space-y-5">
        {error && (
          <div className="border border-red-500/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
          <TerminalPanel title={labels.header} meta={loading ? "loading" : "live workspace"}>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <div className="font-mono text-[10px] uppercase text-zinc-500">{t("common.portfolio")}</div>
                <div className="mt-1 text-lg font-semibold text-zinc-100">
                  {summary?.portfolio_name || t("portfolio.primaryPortfolio")}
                </div>
                <div className="mt-1 text-xs text-zinc-500">{accountName}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-zinc-500">Total Value</div>
                <div className="mt-1 text-2xl font-semibold text-zinc-100">{money(totalValue)}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-zinc-500">Last Updated</div>
                <div className="mt-1 text-sm text-zinc-300">{updatedAt || "waiting for data"}</div>
              </div>
              <div className="flex flex-wrap content-start gap-2">
                <Link className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-emerald-400 hover:text-emerald-200" href="/input">
                  Input
                </Link>
                <Link className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-emerald-400 hover:text-emerald-200" href="/import">
                  Import
                </Link>
                <Link className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-emerald-400 hover:text-emerald-200" href="/dashboard">
                  Dashboard
                </Link>
              </div>
            </div>
          </TerminalPanel>

          <TerminalPanel title={labels.exposure} meta="management lens">
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between gap-3 border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">TOP SINGLE</span>
                <span className="text-zinc-200">{topHolding ? `${topHolding.label} ${percent((topHolding.marketValue / Math.max(totalValue, 1)) * 100)}` : "-"}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">STOCK CONCENTRATION</span>
                <span className={stockRatio > 60 ? "text-yellow-300" : "text-zinc-200"}>{percent(stockRatio)}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">FCN-LINKED EXPOSURE</span>
                <span className={fcnRatio > 35 ? "text-yellow-300" : "text-zinc-200"}>{percent(fcnRatio)}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">CRYPTO EXPOSURE</span>
                <span className={cryptoRatio > 20 ? "text-yellow-300" : "text-zinc-200"}>{percent(cryptoRatio)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">CASH RATIO</span>
                <span className={cashRatio < 5 && totalValue > 0 ? "text-red-300" : "text-zinc-200"}>{percent(cashRatio)}</span>
              </div>
              <p className="pt-2 text-[11px] leading-5 text-zinc-500">
                {stockRatio > 60
                  ? "單一或股票曝險偏高，建議提高監控頻率。"
                  : fcnRatio > 35
                    ? "FCN-linked exposure is meaningful; monitor KI / worst-of movement."
                    : cryptoRatio > 20
                      ? "Crypto exposure is visible; volatility can drive short-term portfolio swings."
                      : "Portfolio exposure appears balanced at a high level."}
              </p>
            </div>
          </TerminalPanel>
        </section>

        <TerminalPanel title={labels.allocation} meta="stocks / fcn / crypto / cash">
          <div className="grid gap-2 md:grid-cols-4">
            {(allocation.length > 0
              ? allocation
              : [
                  { asset_class: "stocks", value: stockValue, percentage: stockRatio },
                  { asset_class: "fcn", value: fcnValue, percentage: fcnRatio },
                  { asset_class: "crypto", value: cryptoValue, percentage: cryptoRatio },
                  { asset_class: "cash", value: cashValue, percentage: cashRatio },
                ]).map((item) => {
              const percentage = numberValue(item.percentage);
              const risk = percentage > 50 ? "high concentration" : percentage > 25 ? "watch" : "balanced";
              return (
                <div className="border border-zinc-800 bg-black/20 p-3" key={item.asset_class}>
                  <div className="font-mono text-xs uppercase text-zinc-500">{item.asset_class}</div>
                  <div className="mt-1 text-lg font-semibold text-zinc-100">{money(item.value)}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-zinc-500">{percent(percentage)}</span>
                    <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${riskClass(risk)}`}>
                      {risk}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </TerminalPanel>

        {isEmpty ? (
          <TerminalPanel title={labels.holdings} meta="empty portfolio">
            <div className="py-8 text-center">
              <div className="font-mono text-sm text-zinc-300">No portfolio positions yet</div>
              <p className="mt-2 text-sm text-zinc-500">新增資產或匯入 CSV 後，這裡會成為完整持倉管理工作區。</p>
              <div className="mt-4 flex justify-center gap-2">
                <Link className="border border-emerald-500/50 px-3 py-2 text-xs text-emerald-200" href="/input">
                  Go to Input
                </Link>
                <Link className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300" href="/import">
                  Go to Import
                </Link>
              </div>
            </div>
          </TerminalPanel>
        ) : (
          <TerminalPanel title={labels.holdings} meta="edit / delete persistence coming next">
            <div className="grid gap-3 xl:grid-cols-2">
              <HoldingSection rows={rows.stock} title="Stocks" onDelete={handleDelete} />
              <HoldingSection rows={rows.crypto} title="Crypto" onDelete={handleDelete} />
              <HoldingSection rows={rows.cash} title="Cash" onDelete={handleDelete} />
              <HoldingSection rows={rows.fcn} title="FCN Summary" onDelete={handleDelete} />
            </div>
          </TerminalPanel>
        )}
      </div>
    </AppShell>
  );
}
