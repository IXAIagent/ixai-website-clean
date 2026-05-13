"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";

import {
  ApiError,
  apiFetch,
  AssetCandidate,
  getToken,
  logout,
  searchAssets,
  updateCash,
  updateCrypto,
  updateStock,
} from "../lib/api";

type Stock = {
  id?: string | number | null;
  symbol?: string | null;
  quantity?: number | string | null;
  avg_price?: number | string | null;
  current_price?: number | string | null;
  current_value?: number | string | null;
};

type FCN = {
  id?: string | number | null;
  name?: string | null;
  fcn_code?: string | null;
  code?: string | null;
  issuer?: string | null;
  notional?: number | string | null;
  notional_amount?: number | string | null;
  tenor_months?: number | string | null;
  maturity_date?: string | null;
  next_observation_date?: string | null;
  next_coupon_date?: string | null;
  settlement_currency?: string | null;
  worst_of_symbol?: string | null;
  worst_of?: string | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_ko_pct?: number | string | null;
  risk_level?: string | null;
};

type Crypto = {
  id?: string | number | null;
  symbol?: string | null;
  asset_type?: string | null;
  quantity?: number | string | null;
  avg_price?: number | string | null;
  current_price?: number | string | null;
  current_value?: number | string | null;
  leverage?: number | string | null;
  grid_lower?: number | string | null;
  grid_upper?: number | string | null;
};

type Cash = {
  id?: string | number | null;
  currency?: string | null;
  amount?: number | string | null;
};

type Notice = {
  type: "success" | "error" | "info";
  message: string;
};

type AssetMode = "stock" | "cash" | "fcn" | "crypto";

type FCNUnderlying = {
  symbol: string;
  initial_price: string;
};

type FCNForm = {
  name: string;
  fcn_code: string;
  issuer: string;
  notional_amount: string;
  underlyings: FCNUnderlying[] | string;
  tenor_months: string;
  issue_date: string;
  maturity_date: string;
  settlement_currency: string;
  coupon_frequency: string;
  next_observation_date: string;
  next_coupon_date: string;
  observation_dates_json: string;
  coupon_dates_json: string;
  ki_level: string;
  ko_level: string;
  strike_level: string;
  coupon_rate: string;
};

type CryptoForm = {
  symbol: string;
  asset_type: string;
  quantity: string;
  avg_price: string;
  current_price: string;
  leverage: string;
  grid_lower: string;
  grid_upper: string;
};

type CashForm = {
  currency: string;
  amount: string;
};

type EditFormState = {
  id: string;
  type: "stock" | "crypto" | "cash";
  quantity?: string;
  avg_price?: string;
  current_price?: string;
  leverage?: string;
  grid_lower?: string;
  grid_upper?: string;
  amount?: string;
};

const emptyFcnForm: FCNForm = {
  name: "",
  fcn_code: "",
  issuer: "",
  notional_amount: "",
  underlyings: [
    { symbol: "", initial_price: "" },
    { symbol: "", initial_price: "" },
    { symbol: "", initial_price: "" },
  ],
  tenor_months: "",
  issue_date: "",
  maturity_date: "",
  settlement_currency: "USD",
  coupon_frequency: "monthly",
  next_observation_date: "",
  next_coupon_date: "",
  observation_dates_json: "",
  coupon_dates_json: "",
  ki_level: "",
  ko_level: "",
  strike_level: "",
  coupon_rate: "",
};

const emptyCryptoForm: CryptoForm = {
  symbol: "",
  asset_type: "grid",
  quantity: "",
  avg_price: "",
  current_price: "",
  leverage: "",
  grid_lower: "",
  grid_upper: "",
};

const emptyCashForm: CashForm = {
  currency: "USD",
  amount: "",
};

function parseFcnUnderlyings(
  underlyings: FCNForm["underlyings"],
): FCNUnderlying[] {
  let parsedUnderlyings: unknown = [];

  try {
    if (typeof underlyings === "string") {
      parsedUnderlyings = JSON.parse(underlyings);
    } else if (Array.isArray(underlyings)) {
      parsedUnderlyings = underlyings;
    }
  } catch {
    parsedUnderlyings = [];
  }

  if (!Array.isArray(parsedUnderlyings)) {
    return [];
  }

  return parsedUnderlyings.map((item) => ({
    symbol:
      typeof item === "object" && item !== null && "symbol" in item
        ? String(item.symbol ?? "")
        : "",
    initial_price:
      typeof item === "object" && item !== null && "initial_price" in item
        ? String(item.initial_price ?? "")
        : "",
  }));
}

const assetModes: Array<{
  id: AssetMode;
  label: string;
  title: string;
  description: string;
}> = [
  {
    id: "stock",
    label: "Stock",
    title: "股票部位",
    description: "代號、股數、成本與目前價格。",
  },
  {
    id: "cash",
    label: "Cash",
    title: "現金部位",
    description: "現金會進入總資產與風險分母。",
  },
  {
    id: "fcn",
    label: "FCN",
    title: "FCN 結構型商品",
    description: "名目本金、標的進場價、KI / KO 條件。",
  },
  {
    id: "crypto",
    label: "Crypto",
    title: "Crypto / Grid",
    description: "幣種、價格、槓桿與 Grid 區間。",
  },
];

function numberValue(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function money(v: unknown) {
  return `$${numberValue(v).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}`;
}

function textValue(v: unknown, fallback = "-") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function apiMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError && err.status === 401) {
    logout();
    return "登入已失效，請重新登入。";
  }

  if (err instanceof ApiError) {
    return err.message || fallback;
  }

  return "無法連線後端 API，請確認 FastAPI 是否啟動。";
}

function noticeClass(type: Notice["type"]) {
  if (type === "success")
    return "border-emerald-500/50 bg-emerald-500/10 text-emerald-100";
  if (type === "error") return "border-red-500/50 bg-red-500/10 text-red-100";
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

function inputClass() {
  return "w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-white";
}

function emptyAssetMessage(asset: AssetMode) {
  if (asset === "stock") return "No stock positions yet";
  if (asset === "crypto") return "No crypto positions yet";
  if (asset === "cash") return "No cash positions yet";
  return "No FCN positions yet";
}

export default function InputPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [activeAsset, setActiveAsset] = useState<AssetMode>("stock");
  const [symbol, setSymbol] = useState("");
  const [selectedStock, setSelectedStock] = useState<AssetCandidate | null>(null);
  const [stockCandidates, setStockCandidates] = useState<AssetCandidate[]>([]);
  const [stockSearchLoading, setStockSearchLoading] = useState(false);
  const [stockSearchStatus, setStockSearchStatus] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [cashForm, setCashForm] = useState<CashForm>(emptyCashForm);
  const [fcnForm, setFcnForm] = useState<FCNForm>(emptyFcnForm);
  const [cryptoForm, setCryptoForm] = useState<CryptoForm>(emptyCryptoForm);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [cashPositions, setCashPositions] = useState<Cash[]>([]);
  const [fcns, setFcns] = useState<FCN[]>([]);
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [savingAsset, setSavingAsset] = useState<AssetMode | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [editingPosition, setEditingPosition] = useState<EditFormState | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [showFcnAdvanced, setShowFcnAdvanced] = useState(false);
  const parsedUnderlyings = parseFcnUnderlyings(fcnForm.underlyings);

  function returnToDashboard() {
    router.push("/dashboard");
  }

  function updateStockSymbol(value: string) {
    setSymbol(value);
    setSelectedStock(null);
    if (value.trim().length < 2) {
      setStockCandidates([]);
      setStockSearchLoading(false);
      setStockSearchStatus("");
    }
  }

  function selectStockCandidate(candidate: AssetCandidate) {
    const canonicalSymbol = textValue(candidate.canonical_symbol, "");
    if (!canonicalSymbol) return;
    setSymbol(canonicalSymbol);
    setSelectedStock(candidate);
    setStockCandidates([]);
    setStockSearchStatus("");
  }

  function updateFcnField(
    key: Exclude<keyof FCNForm, "underlyings">,
    value: string,
  ) {
    setFcnForm((current) => ({ ...current, [key]: value }));
  }

  function addMonthsToDate(value: string, months: number) {
    if (!value || months <= 0) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setMonth(date.getMonth() + months);
    return date.toISOString().slice(0, 10);
  }

  function updateFcnIssueDate(value: string) {
    setFcnForm((current) => {
      const tenor = Number(current.tenor_months);
      return {
        ...current,
        issue_date: value,
        maturity_date:
          value && Number.isFinite(tenor) && tenor > 0
            ? addMonthsToDate(value, tenor)
            : current.maturity_date,
      };
    });
  }

  function setFcnTenor(months: number) {
    setFcnForm((current) => ({
      ...current,
      tenor_months: String(months),
      maturity_date: current.issue_date
        ? addMonthsToDate(current.issue_date, months)
        : current.maturity_date,
    }));
  }

  function updateFcnUnderlying(
    index: number,
    key: keyof FCNUnderlying,
    value: string,
  ) {
    setFcnForm((current) => {
      const underlyings = parseFcnUnderlyings(current.underlyings).map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: key === "symbol" ? value.toUpperCase() : value,
            }
          : item,
      );

      return { ...current, underlyings };
    });
  }

  function addFcnUnderlying() {
    setFcnForm((current) => ({
      ...current,
      underlyings: [
        ...parseFcnUnderlyings(current.underlyings),
        { symbol: "", initial_price: "" },
      ],
    }));
  }

  function removeFcnUnderlying(index: number) {
    setFcnForm((current) => ({
      ...current,
      underlyings:
        parseFcnUnderlyings(current.underlyings).length > 1
          ? parseFcnUnderlyings(current.underlyings).filter(
              (_, itemIndex) => itemIndex !== index,
            )
          : parseFcnUnderlyings(current.underlyings),
    }));
  }

  function normalizeStockSymbol(value: string) {
    const clean = value.trim().toUpperCase();
    if (/^\d{4}$/.test(clean)) return `${clean}.TW`;
    return clean;
  }

  function updateCryptoField(key: keyof CryptoForm, value: string) {
    setCryptoForm((current) => ({ ...current, [key]: value }));
  }

  function updateCashField(key: keyof CashForm, value: string) {
    setCashForm((current) => ({ ...current, [key]: value }));
  }

  function assetCount(asset: AssetMode) {
    if (asset === "stock") return stocks.length;
    if (asset === "cash") return cashPositions.length;
    if (asset === "fcn") return fcns.length;
    return cryptos.length;
  }

  async function loadAssets(options: { clearNotice?: boolean } = {}) {
    setLoadingAssets(true);
    if (options.clearNotice ?? true) {
      setNotice(null);
    }

    try {
      const [stockData, cashData, fcnData, cryptoData] = await Promise.all([
        apiFetch<Stock[]>("/api/v1/portfolio/stocks"),
        apiFetch<Cash[]>("/api/v1/portfolio/cash"),
        apiFetch<FCN[]>("/api/v1/portfolio/fcns"),
        apiFetch<Crypto[]>("/api/v1/portfolio/crypto"),
      ]);

      setStocks(Array.isArray(stockData) ? stockData : []);
      setCashPositions(Array.isArray(cashData) ? cashData : []);
      setFcns(Array.isArray(fcnData) ? fcnData : []);
      setCryptos(Array.isArray(cryptoData) ? cryptoData : []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
      }
      setStocks([]);
      setCashPositions([]);
      setFcns([]);
      setCryptos([]);
      setNotice({
        type: "error",
        message: apiMessage(err, "讀取資產清單失敗，請稍後再試。"),
      });
    } finally {
      setLoadingAssets(false);
    }
  }

  async function addStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanSymbol = normalizeStockSymbol(symbol);
    const quantityValue = Number(quantity);
    const avgPriceValue = Number(avgPrice);
    const currentPriceValue = Number(currentPrice);

    if (!cleanSymbol) {
      setNotice({ type: "error", message: "請輸入股票代號。" });
      return;
    }

    if (
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0 ||
      !Number.isFinite(avgPriceValue) ||
      avgPriceValue < 0 ||
      !Number.isFinite(currentPriceValue) ||
      currentPriceValue < 0
    ) {
      setNotice({
        type: "error",
        message: "請輸入有效的股數、平均成本與目前價格。",
      });
      return;
    }

    setSavingAsset("stock");
    setNotice({ type: "info", message: "新增股票中..." });

    try {
      await apiFetch("/api/v1/portfolio/stock", {
        method: "POST",
        body: JSON.stringify({
          symbol: cleanSymbol,
          quantity: quantityValue,
          avg_price: avgPriceValue,
          current_price: currentPriceValue,
        }),
      });

      setNotice({ type: "success", message: "股票已新增。" });
      setSymbol("");
      setSelectedStock(null);
      setStockCandidates([]);
      setStockSearchStatus("");
      setQuantity("");
      setAvgPrice("");
      setCurrentPrice("");
      await loadAssets({ clearNotice: false });
      returnToDashboard();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
      }
      setNotice({
        type: "error",
        message: apiMessage(err, "新增股票失敗，請稍後再試。"),
      });
    } finally {
      setSavingAsset(null);
    }
  }

  async function addCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const currency = cashForm.currency.trim().toUpperCase() || "USD";
    const amount = Number(cashForm.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      setNotice({ type: "error", message: "請輸入有效的現金金額。" });
      return;
    }

    setSavingAsset("cash");
    setNotice({ type: "info", message: "更新 Cash 中..." });

    try {
      await apiFetch("/api/v1/portfolio/cash", {
        method: "POST",
        body: JSON.stringify({
          currency,
          amount,
        }),
      });

      setNotice({ type: "success", message: "Cash 已更新。" });
      setCashForm({ ...emptyCashForm });
      await loadAssets({ clearNotice: false });
      returnToDashboard();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
      }
      setNotice({
        type: "error",
        message: apiMessage(err, "更新 Cash 失敗，請稍後再試。"),
      });
    } finally {
      setSavingAsset(null);
    }
  }

  async function addFcn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = fcnForm.fcn_code.trim().toUpperCase();
    const notionalAmount = Number(fcnForm.notional_amount);
    const tenorMonths = optionalNumber(fcnForm.tenor_months);
    const kiLevel = optionalNumber(fcnForm.ki_level);
    const koLevel = optionalNumber(fcnForm.ko_level);
    const strikeLevel = optionalNumber(fcnForm.strike_level);
    const couponRate = optionalNumber(fcnForm.coupon_rate);
    const validUnderlyings = parsedUnderlyings
      .map((item) => ({
        symbol: item.symbol.trim().toUpperCase(),
        initial_price: Number(item.initial_price),
      }))
      .filter(
        (item) =>
          item.symbol &&
          Number.isFinite(item.initial_price) &&
          item.initial_price > 0,
      );

    if (!code && !fcnForm.name.trim()) {
      setNotice({ type: "error", message: "請輸入 FCN 名稱或 FCN Code。" });
      return;
    }

    if (!Number.isFinite(notionalAmount) || notionalAmount <= 0) {
      setNotice({ type: "error", message: "請輸入有效的 FCN 名目本金。" });
      return;
    }

    if (validUnderlyings.length === 0) {
      setNotice({ type: "error", message: "請至少輸入一個標的與進場價格。" });
      return;
    }

    setSavingAsset("fcn");
    setNotice({ type: "info", message: "新增 FCN 中..." });

    try {
      await apiFetch("/api/v1/portfolio/fcn", {
        method: "POST",
        body: JSON.stringify({
          name: fcnForm.name.trim() || code,
          fcn_code: code,
          issuer: fcnForm.issuer.trim() || null,
          notional_amount: notionalAmount,
          notional: notionalAmount,
          underlyings: validUnderlyings.map((item) => item.symbol).join(","),
          underlying_details: validUnderlyings,
          tenor_months: tenorMonths,
          issue_date: fcnForm.issue_date || null,
          maturity_date: fcnForm.maturity_date || null,
          settlement_currency: fcnForm.settlement_currency.trim().toUpperCase() || "USD",
          coupon_frequency: fcnForm.coupon_frequency.trim() || null,
          next_observation_date: fcnForm.next_observation_date || null,
          next_coupon_date: fcnForm.next_coupon_date || null,
          observation_dates_json: fcnForm.observation_dates_json.trim() || null,
          coupon_dates_json: fcnForm.coupon_dates_json.trim() || null,
          initial_price: validUnderlyings[0]?.initial_price ?? null,
          ki_level: kiLevel,
          ko_level: koLevel,
          strike_level: strikeLevel,
          coupon_rate: couponRate,
        }),
      });

      setNotice({ type: "success", message: "FCN 已新增。" });
      setFcnForm({
        ...emptyFcnForm,
        underlyings: parseFcnUnderlyings(emptyFcnForm.underlyings).map((item) => ({
          ...item,
        })),
      });
      await loadAssets({ clearNotice: false });
      returnToDashboard();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
      }
      setNotice({
        type: "error",
        message: apiMessage(err, "新增 FCN 失敗，請稍後再試。"),
      });
    } finally {
      setSavingAsset(null);
    }
  }

  async function addCrypto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanSymbol = cryptoForm.symbol.trim().toUpperCase();
    const quantityValue = Number(cryptoForm.quantity);
    const currentCryptoPrice = Number(cryptoForm.current_price);
    const avgCryptoPrice = optionalNumber(cryptoForm.avg_price);
    const leverage = optionalNumber(cryptoForm.leverage);
    const gridLower = optionalNumber(cryptoForm.grid_lower);
    const gridUpper = optionalNumber(cryptoForm.grid_upper);

    if (!cleanSymbol) {
      setNotice({ type: "error", message: "請輸入 Crypto Symbol。" });
      return;
    }

    if (
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0 ||
      !Number.isFinite(currentCryptoPrice) ||
      currentCryptoPrice < 0
    ) {
      setNotice({
        type: "error",
        message: "請輸入有效的 Quantity 與 Current price。",
      });
      return;
    }

    if (gridLower !== null && gridUpper !== null && gridLower >= gridUpper) {
      setNotice({ type: "error", message: "Grid upper 必須大於 Grid lower。" });
      return;
    }

    setSavingAsset("crypto");
    setNotice({ type: "info", message: "新增 Crypto / Grid 中..." });

    try {
      await apiFetch("/api/v1/portfolio/crypto", {
        method: "POST",
        body: JSON.stringify({
          symbol: cleanSymbol,
          asset_type: cryptoForm.asset_type,
          quantity: quantityValue,
          avg_price: avgCryptoPrice,
          current_price: currentCryptoPrice,
          leverage,
          grid_lower: gridLower,
          grid_upper: gridUpper,
        }),
      });

      setNotice({ type: "success", message: "Crypto / Grid 已新增。" });
      setCryptoForm({ ...emptyCryptoForm });
      await loadAssets({ clearNotice: false });
      returnToDashboard();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
      }
      setNotice({
        type: "error",
        message: apiMessage(err, "新增 Crypto / Grid 失敗，請稍後再試。"),
      });
    } finally {
      setSavingAsset(null);
    }
  }

  function startEditStock(stock: Stock) {
    const id = String(stock.id || "");
    if (!id) return;
    setEditingPosition({
      id,
      type: "stock",
      quantity: String(stock.quantity ?? ""),
      avg_price: String(stock.avg_price ?? ""),
      current_price: String(stock.current_price ?? ""),
    });
    setConfirmingDeleteId(null);
  }

  function startEditCrypto(crypto: Crypto) {
    const id = String(crypto.id || "");
    if (!id) return;
    setEditingPosition({
      id,
      type: "crypto",
      quantity: String(crypto.quantity ?? ""),
      avg_price: String(crypto.avg_price ?? ""),
      current_price: String(crypto.current_price ?? ""),
      leverage: String(crypto.leverage ?? ""),
      grid_lower: String(crypto.grid_lower ?? ""),
      grid_upper: String(crypto.grid_upper ?? ""),
    });
    setConfirmingDeleteId(null);
  }

  function startEditCash(cash: Cash) {
    const id = String(cash.id || "");
    if (!id) return;
    setEditingPosition({
      id,
      type: "cash",
      amount: String(cash.amount ?? ""),
    });
    setConfirmingDeleteId(null);
  }

  function updateEditField(key: keyof EditFormState, value: string) {
    setEditingPosition((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  function editNumber(value: string, field: string, allowBlank = false) {
    if (allowBlank && !value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`${field} 必須是有效數字。`);
    }
    return parsed;
  }

  async function saveEdit() {
    if (!editingPosition) return;

    setSavingEditId(`${editingPosition.type}:${editingPosition.id}`);
    setNotice(null);

    try {
      if (editingPosition.type === "stock") {
        await updateStock(editingPosition.id, {
          quantity: editNumber(editingPosition.quantity || "", "Quantity"),
          avg_price: editNumber(editingPosition.avg_price || "", "Avg price"),
          current_price: editNumber(editingPosition.current_price || "", "Current price"),
        });
      } else if (editingPosition.type === "crypto") {
        await updateCrypto(editingPosition.id, {
          quantity: editNumber(editingPosition.quantity || "", "Quantity"),
          avg_price: editNumber(editingPosition.avg_price || "", "Avg price", true),
          current_price: editNumber(editingPosition.current_price || "", "Current price"),
          leverage: editNumber(editingPosition.leverage || "", "Leverage", true),
          grid_lower: editNumber(editingPosition.grid_lower || "", "Grid lower", true),
          grid_upper: editNumber(editingPosition.grid_upper || "", "Grid upper", true),
        });
      } else {
        await updateCash(editingPosition.id, {
          amount: editNumber(editingPosition.amount || "", "Amount"),
        });
      }

      setNotice({ type: "success", message: "部位已更新。" });
      setEditingPosition(null);
      await loadAssets({ clearNotice: false });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
      }
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : apiMessage(err, "更新部位失敗，請稍後再試。"),
      });
    } finally {
      setSavingEditId(null);
    }
  }

  async function deleteAsset(path: string, id: string, label: string) {
    setDeletingId(`${label}:${id}`);
    setNotice(null);

    try {
      await apiFetch(path, { method: "DELETE" });
      setNotice({ type: "success", message: `${label} 已刪除。` });
      setConfirmingDeleteId(null);
      setEditingPosition(null);
      await loadAssets({ clearNotice: false });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
      }
      setNotice({
        type: "error",
        message: apiMessage(err, `刪除 ${label} 失敗，請稍後再試。`),
      });
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedToken = getToken();
      setToken(storedToken);
      setCheckedAuth(true);

      if (storedToken) {
        void loadAssets({ clearNotice: false });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const query = symbol.trim();
    if (activeAsset !== "stock" || query.length < 2 || selectedStock) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setStockSearchLoading(true);
      setStockSearchStatus("");

      void searchAssets(query, "stock")
        .then((candidates) => {
          if (cancelled) return;
          const safeCandidates = Array.isArray(candidates) ? candidates : [];
          setStockCandidates(safeCandidates);
          setStockSearchStatus(
            safeCandidates.length === 0
              ? "找不到匹配資產，將以原輸入送出"
              : "",
          );
        })
        .catch(() => {
          if (cancelled) return;
          setStockCandidates([]);
          setStockSearchStatus("找不到匹配資產，將以原輸入送出");
        })
        .finally(() => {
          if (!cancelled) {
            setStockSearchLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeAsset, selectedStock, symbol]);

  const activeMode =
    assetModes.find((mode) => mode.id === activeAsset) || assetModes[0];
  const activeCount =
    activeAsset === "stock"
      ? stocks.length
      : activeAsset === "cash"
        ? cashPositions.length
        : activeAsset === "fcn"
          ? fcns.length
          : cryptos.length;

  if (!checkedAuth) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 text-gray-300">
            載入資產管理...
          </div>
        </section>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <section className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
                IXAI AGENT
              </div>
              <h1 className="text-3xl font-bold">資產管理</h1>
              <p className="mt-2 text-gray-400">請先登入。</p>
            </div>

            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-700 px-5 py-3 font-semibold transition hover:bg-white hover:text-black"
            >
              回 Dashboard
            </Link>
          </div>

          <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
            <div className="text-sm font-semibold text-gray-500">帳號狀態</div>
            <h2 className="mt-2 text-2xl font-bold">請先登入</h2>
            <p className="mt-3 max-w-2xl leading-7 text-gray-400">
              登入後才能新增、查看與刪除你的股票、Cash、FCN 與 Crypto / Grid
              資產。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200"
              >
                前往登入
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-gray-700 px-5 py-3 font-semibold transition hover:bg-white hover:text-black"
              >
                回 Dashboard
              </Link>
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
              IXAI AGENT
            </div>
            <h1 className="text-3xl font-bold">資產管理</h1>
            <p className="mt-2 leading-7 text-gray-400">
              新增、查看與刪除股票、Cash、FCN、Crypto / Grid 資產
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void loadAssets()}
              className="rounded-lg border border-gray-700 px-5 py-3 font-semibold transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loadingAssets}
              type="button"
            >
              {loadingAssets ? "更新中..." : "更新清單"}
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-700 px-5 py-3 font-semibold transition hover:bg-white hover:text-black"
            >
              回 Dashboard
            </Link>
          </div>
        </div>

        {notice && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm leading-6 shadow-lg ${noticeClass(notice.type)}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium">{notice.message}</span>
              <button
                className="w-fit rounded-lg border border-current/30 px-3 py-1 text-xs font-semibold opacity-80 transition hover:opacity-100"
                onClick={() => setNotice(null)}
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_360px]">
          <nav className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {assetModes.map((mode) => (
              <button
                key={mode.id}
                className={`rounded-xl border p-4 text-left shadow-lg transition ${
                  activeAsset === mode.id
                    ? "border-emerald-400 bg-emerald-400/10 text-white"
                    : "border-gray-800 bg-gray-950 text-gray-300 hover:border-gray-500"
                }`}
                onClick={() => setActiveAsset(mode.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                    {mode.label}
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      activeAsset === mode.id
                        ? "border-emerald-300/50 text-emerald-100"
                        : "border-gray-700 text-gray-500"
                    }`}
                  >
                    {assetCount(mode.id)}
                  </span>
                </div>
                <div className="mt-2 font-bold">{mode.title}</div>
                <div className="mt-2 text-sm leading-6 opacity-70">
                  {mode.description}
                </div>
              </button>
            ))}
          </nav>

          <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-xl">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Asset Ticket
                </div>
                <h2 className="mt-2 text-2xl font-bold">{activeMode.title}</h2>
              </div>
              <span className="w-fit rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-400">
                {activeCount} 筆
              </span>
            </div>

            {activeAsset === "stock" && (
              <form className="space-y-4" onSubmit={addStock}>
                <Field
                  label="股票代號"
                  placeholder="AAPL"
                  value={symbol}
                  onChange={updateStockSymbol}
                />
                <div className="rounded-lg border border-gray-800 bg-black/40 p-3">
                  {selectedStock ? (
                    <div className="text-sm text-green-300">
                      已選擇：{textValue(selectedStock.display_name)}{" "}
                      {textValue(selectedStock.canonical_symbol)}
                    </div>
                  ) : stockSearchLoading ? (
                    <div className="text-sm text-gray-400">搜尋資產中...</div>
                  ) : stockCandidates.length > 0 ? (
                    <div className="space-y-2">
                      {stockCandidates.slice(0, 6).map((candidate, index) => (
                        <button
                          className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-3 text-left transition hover:border-gray-500"
                          key={`${textValue(candidate.canonical_symbol, "asset")}-${index}`}
                          onClick={() => selectStockCandidate(candidate)}
                          type="button"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold text-white">
                              {textValue(candidate.display_name, "Asset")}
                            </div>
                            <div className="text-sm text-gray-300">
                              {textValue(candidate.canonical_symbol)}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {textValue(candidate.market, "market")} · confidence{" "}
                            {numberValue(candidate.confidence).toFixed(2)}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      {stockSearchStatus || "可輸入股票代號或名稱搜尋候選資產"}
                    </div>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="股數"
                    inputMode="decimal"
                    placeholder="10"
                    value={quantity}
                    onChange={setQuantity}
                  />
                  <Field
                    label="平均成本"
                    inputMode="decimal"
                    placeholder="150"
                    value={avgPrice}
                    onChange={setAvgPrice}
                  />
                  <Field
                    label="目前價格"
                    inputMode="decimal"
                    placeholder="180"
                    value={currentPrice}
                    onChange={setCurrentPrice}
                  />
                </div>
                <SubmitButton
                  loading={savingAsset === "stock"}
                  label="儲存股票"
                  loadingLabel="儲存中..."
                />
              </form>
            )}

            {activeAsset === "cash" && (
              <form className="space-y-4" onSubmit={addCash}>
                <Field
                  label="幣別"
                  placeholder="USD"
                  value={cashForm.currency}
                  onChange={(v) => updateCashField("currency", v)}
                />
                <Field
                  label="現金金額"
                  inputMode="decimal"
                  placeholder="50000"
                  value={cashForm.amount}
                  onChange={(v) => updateCashField("amount", v)}
                />
                <SubmitButton
                  loading={savingAsset === "cash"}
                  label="更新 Cash"
                  loadingLabel="更新中..."
                />
              </form>
            )}

            {activeAsset === "fcn" && (
              <form className="space-y-5" onSubmit={addFcn}>
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    1. Basic terms
                  </div>
                  <div className="mt-2 text-sm font-semibold text-emerald-100">
                    Quick Add
                  </div>
                  <div className="mt-1 text-xs leading-5 text-emerald-100/70">
                    先輸入 FCN 監控需要的核心條件；進階條款可展開後補充。
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="FCN 名稱"
                    placeholder="FCN219M"
                    value={fcnForm.name}
                    onChange={(v) => updateFcnField("name", v)}
                  />
                  <Field
                    label="FCN Code"
                    placeholder="FCN219M"
                    value={fcnForm.fcn_code}
                    onChange={(v) =>
                      updateFcnField("fcn_code", v.toUpperCase())
                    }
                  />
                </div>
                <div className="rounded-xl border border-gray-800 bg-black/40 p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Tenor presets
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[3, 6, 9, 12].map((months) => (
                      <button
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          fcnForm.tenor_months === String(months)
                            ? "border-emerald-400 bg-emerald-400 text-black"
                            : "border-gray-700 text-gray-300 hover:border-emerald-400 hover:text-emerald-200"
                        }`}
                        key={months}
                        onClick={() => setFcnTenor(months)}
                        type="button"
                      >
                        {months}M
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-gray-500">
                    若 Advanced 裡已填 issue date，選擇 tenor 會自動預填 maturity date。
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="名目本金"
                    inputMode="decimal"
                    placeholder="30000"
                    value={fcnForm.notional_amount}
                    onChange={(v) => updateFcnField("notional_amount", v)}
                  />
                  <Field
                    label="Coupon rate"
                    inputMode="decimal"
                    placeholder="0"
                    value={fcnForm.coupon_rate}
                    onChange={(v) => updateFcnField("coupon_rate", v)}
                  />
                  <Field
                    label="Maturity date"
                    type="date"
                    value={fcnForm.maturity_date}
                    onChange={(v) => updateFcnField("maturity_date", v)}
                  />
                </div>
                <div className="rounded-xl border border-gray-800 bg-black/40 p-4">
                  <div className="mb-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      3. Barrier / Strike
                    </div>
                    <div className="mt-1 text-xs leading-5 text-gray-500">
                      KI/KO/Strike 以初始價格百分比輸入，例如 65 代表 65%。
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field
                      label="KI level"
                      inputMode="decimal"
                      placeholder="65"
                      value={fcnForm.ki_level}
                      onChange={(v) => updateFcnField("ki_level", v)}
                    />
                    <Field
                      label="KO level"
                      inputMode="decimal"
                      placeholder="100"
                      value={fcnForm.ko_level}
                      onChange={(v) => updateFcnField("ko_level", v)}
                    />
                    <Field
                      label="Strike level"
                      inputMode="decimal"
                      placeholder="95"
                      value={fcnForm.strike_level}
                      onChange={(v) => updateFcnField("strike_level", v)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-gray-800 bg-black p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                        2. Underlyings
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        標的與進場價格
                      </div>
                      <div className="mt-1 text-xs leading-5 text-gray-500">
                        系統會自動抓目前價格並計算風險，不需要手動輸入即時價格。
                      </div>
                    </div>
                    <button
                      className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold transition hover:bg-white hover:text-black"
                      onClick={addFcnUnderlying}
                      type="button"
                    >
                      + 新增標的
                    </button>
                  </div>

                  <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px] gap-3 border-b border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid">
                    <div>Symbol</div>
                    <div>Initial Price</div>
                    <div>Action</div>
                  </div>
                  <div className="space-y-3 pt-3">
                    {parsedUnderlyings.map((underlying, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px] sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0"
                      >
                        <Field
                          label={`標的 ${index + 1}`}
                          placeholder="MDB"
                          value={underlying.symbol}
                          onChange={(v) =>
                            updateFcnUnderlying(index, "symbol", v)
                          }
                        />
                        <Field
                          label="進場價格"
                          inputMode="decimal"
                          placeholder="406.61"
                          value={underlying.initial_price}
                          onChange={(v) =>
                            updateFcnUnderlying(index, "initial_price", v)
                          }
                        />
                        <div className="flex items-end">
                          <button
                            className="w-full rounded-lg border border-red-500/70 px-3 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={parsedUnderlyings.length <= 1}
                            onClick={() => removeFcnUnderlying(index)}
                            type="button"
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-800 bg-black/40 p-4">
                  <button
                    className="flex w-full items-center justify-between gap-4 text-left"
                    onClick={() => setShowFcnAdvanced((current) => !current)}
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-white">
                        Advanced terms
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-gray-500">
                        Issuer、tenor、settlement、observation 與 coupon schedule。
                      </span>
                    </span>
                    <span className="rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300">
                      {showFcnAdvanced ? "Hide" : "Show"}
                    </span>
                  </button>

                  {showFcnAdvanced && (
                    <div className="mt-4 space-y-4 border-t border-gray-800 pt-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <Field
                          label="Issuer"
                          placeholder="Bank / Issuer"
                          value={fcnForm.issuer}
                          onChange={(v) => updateFcnField("issuer", v)}
                        />
                        <Field
                          label="Tenor months"
                          inputMode="decimal"
                          placeholder="6"
                          value={fcnForm.tenor_months}
                          onChange={(v) => updateFcnField("tenor_months", v)}
                        />
                        <Field
                          label="Settlement currency"
                          placeholder="USD"
                          value={fcnForm.settlement_currency}
                          onChange={(v) =>
                            updateFcnField("settlement_currency", v.toUpperCase())
                          }
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <Field
                          label="Issue date"
                          type="date"
                          value={fcnForm.issue_date}
                          onChange={updateFcnIssueDate}
                        />
                        <Field
                          label="Next observation date"
                          type="date"
                          value={fcnForm.next_observation_date}
                          onChange={(v) => updateFcnField("next_observation_date", v)}
                        />
                        <Field
                          label="Next coupon date"
                          type="date"
                          value={fcnForm.next_coupon_date}
                          onChange={(v) => updateFcnField("next_coupon_date", v)}
                        />
                      </div>
                      <Field
                        label="Coupon frequency"
                        placeholder="monthly"
                        value={fcnForm.coupon_frequency}
                        onChange={(v) => updateFcnField("coupon_frequency", v)}
                      />
                      <div className="rounded-lg border border-gray-800 bg-black/30 p-3 text-xs leading-5 text-gray-500">
                        issuer / settlement / coupon frequency 是 optional product
                        metadata；next observation / next coupon 是 optional monitoring
                        shortcut；JSON schedule 欄位是 optional technical schedule fields。
                      </div>
                      <TextareaField
                        label="Observation dates JSON"
                        placeholder='["2026-06-13","2026-07-13"]'
                        value={fcnForm.observation_dates_json}
                        onChange={(v) => updateFcnField("observation_dates_json", v)}
                      />
                      <TextareaField
                        label="Coupon dates JSON"
                        placeholder='["2026-06-15","2026-07-15"]'
                        value={fcnForm.coupon_dates_json}
                        onChange={(v) => updateFcnField("coupon_dates_json", v)}
                      />
                    </div>
                  )}
                </div>
                <SubmitButton
                  loading={savingAsset === "fcn"}
                  label="儲存 FCN"
                  loadingLabel="儲存中..."
                />
              </form>
            )}

            {activeAsset === "crypto" && (
              <form className="space-y-5" onSubmit={addCrypto}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Symbol"
                    placeholder="BTCUSDT"
                    value={cryptoForm.symbol}
                    onChange={(v) => updateCryptoField("symbol", v)}
                  />

                  <label className="block text-sm text-gray-400">
                    Asset type
                    <select
                      className={`${inputClass()} mt-2`}
                      value={cryptoForm.asset_type}
                      onChange={(e) =>
                        updateCryptoField("asset_type", e.target.value)
                      }
                    >
                      <option value="crypto">crypto</option>
                      <option value="grid">grid</option>
                      <option value="dual">dual</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="Quantity"
                    inputMode="decimal"
                    placeholder="0.03"
                    value={cryptoForm.quantity}
                    onChange={(v) => updateCryptoField("quantity", v)}
                  />
                  <Field
                    label="Avg price"
                    inputMode="decimal"
                    placeholder="72000"
                    value={cryptoForm.avg_price}
                    onChange={(v) => updateCryptoField("avg_price", v)}
                  />
                  <Field
                    label="Current price"
                    inputMode="decimal"
                    placeholder="97000"
                    value={cryptoForm.current_price}
                    onChange={(v) => updateCryptoField("current_price", v)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="Leverage"
                    inputMode="decimal"
                    placeholder="8"
                    value={cryptoForm.leverage}
                    onChange={(v) => updateCryptoField("leverage", v)}
                  />
                  <Field
                    label="Grid lower"
                    inputMode="decimal"
                    placeholder="72000"
                    value={cryptoForm.grid_lower}
                    onChange={(v) => updateCryptoField("grid_lower", v)}
                  />
                  <Field
                    label="Grid upper"
                    inputMode="decimal"
                    placeholder="82000"
                    value={cryptoForm.grid_upper}
                    onChange={(v) => updateCryptoField("grid_upper", v)}
                  />
                </div>
                <SubmitButton
                  loading={savingAsset === "crypto"}
                  label="儲存 Crypto / Grid"
                  loadingLabel="儲存中..."
                />
              </form>
            )}
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-xl">
            <div className="mb-5 flex flex-col gap-2 border-b border-gray-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Positions
                </div>
                <h2 className="mt-1 text-xl font-bold">{activeMode.title}清單</h2>
              </div>
              <span className="w-fit rounded-full border border-gray-700 px-3 py-1 text-sm font-semibold text-gray-400">
                {activeCount} positions
              </span>
            </div>

            {loadingAssets ? (
              <div className="rounded-xl border border-gray-800 bg-black/40 p-5 text-gray-400">
                清單載入中...
              </div>
            ) : activeAsset === "stock" ? (
              stocks.length === 0 ? (
                <EmptyAssetState message={emptyAssetMessage("stock")} />
              ) : (
                <div className="space-y-4">
                  {stocks.map((s, index) => {
                    const id = String(s.id || "");
                    const rowKey = `股票:${id}`;
                    return (
                      <AssetRow
                        key={id || `${s.symbol || "stock"}-${index}`}
                        title={textValue(s.symbol)}
                        detail={`股數：${numberValue(s.quantity)} | 成本：${money(s.avg_price)} | 現價：${money(s.current_price)}`}
                        subDetail={`市值：${money(s.current_value)}`}
                        deleting={deletingId === rowKey}
                        confirmingDelete={confirmingDeleteId === rowKey}
                        disabled={!id}
                        editing={editingPosition?.type === "stock" && editingPosition.id === id}
                        onEdit={() => startEditStock(s)}
                        onDelete={() => setConfirmingDeleteId(rowKey)}
                        onCancelDelete={() => setConfirmingDeleteId(null)}
                        onConfirmDelete={() =>
                          void deleteAsset(
                            `/api/v1/portfolio/stock/${id}`,
                            id,
                            "股票",
                          )
                        }
                      >
                        {editingPosition?.type === "stock" && editingPosition.id === id && (
                          <EditPanel
                            fields={[
                              { key: "quantity", label: "Quantity", value: editingPosition.quantity || "" },
                              { key: "avg_price", label: "Avg price", value: editingPosition.avg_price || "" },
                              { key: "current_price", label: "Current price", value: editingPosition.current_price || "" },
                            ]}
                            saving={savingEditId === `stock:${id}`}
                            onChange={updateEditField}
                            onCancel={() => setEditingPosition(null)}
                            onSave={() => void saveEdit()}
                          />
                        )}
                      </AssetRow>
                    );
                  })}
                </div>
              )
            ) : activeAsset === "cash" ? (
              cashPositions.length === 0 ? (
                <EmptyAssetState message={emptyAssetMessage("cash")} />
              ) : (
                <div className="space-y-4">
                  {cashPositions.map((cash, index) => {
                    const id = String(cash.id || "");
                    const currency = textValue(cash.currency, "USD");
                    const rowKey = `Cash:${id}`;
                    return (
                      <AssetRow
                        key={id || `${currency}-${index}`}
                        title={`${currency} Cash`}
                        detail={`金額：${money(cash.amount)}`}
                        subDetail="Cash 會納入總資產與風險分母。"
                        deleting={deletingId === rowKey}
                        confirmingDelete={confirmingDeleteId === rowKey}
                        disabled={!id}
                        editing={editingPosition?.type === "cash" && editingPosition.id === id}
                        onEdit={() => startEditCash(cash)}
                        onDelete={() => setConfirmingDeleteId(rowKey)}
                        onCancelDelete={() => setConfirmingDeleteId(null)}
                        onConfirmDelete={() =>
                          void deleteAsset(
                            `/api/v1/portfolio/cash/${id}`,
                            id,
                            "Cash",
                          )
                        }
                      >
                        {editingPosition?.type === "cash" && editingPosition.id === id && (
                          <EditPanel
                            fields={[
                              { key: "amount", label: "Amount", value: editingPosition.amount || "" },
                            ]}
                            saving={savingEditId === `cash:${id}`}
                            onChange={updateEditField}
                            onCancel={() => setEditingPosition(null)}
                            onSave={() => void saveEdit()}
                          />
                        )}
                      </AssetRow>
                    );
                  })}
                </div>
              )
            ) : activeAsset === "fcn" ? (
              fcns.length === 0 ? (
                <EmptyAssetState message={emptyAssetMessage("fcn")} />
              ) : (
                <div className="space-y-4">
                  {fcns.map((f, index) => {
                    const id = String(f.id || "");
                    const code = textValue(
                      f.fcn_code || f.code || f.name,
                      "FCN",
                    );
                    const rowKey = `FCN:${id}`;
                    return (
                      <AssetRow
                        key={id || `${code}-${index}`}
                        title={code}
                        detail={`本金：${money(f.notional_amount ?? f.notional)} | Issuer：${textValue(f.issuer)} | Tenor：${textValue(f.tenor_months, "-")}M`}
                        subDetail={`Maturity：${textValue(f.maturity_date)} | Next obs：${textValue(f.next_observation_date)} | Next coupon：${textValue(f.next_coupon_date)} | Worst-of：${textValue(f.worst_of_symbol || f.worst_of)} | 風險：${textValue(f.risk_level)}`}
                        deleting={deletingId === rowKey}
                        confirmingDelete={confirmingDeleteId === rowKey}
                        disabled={!id}
                        editing={false}
                        onDelete={() => setConfirmingDeleteId(rowKey)}
                        onCancelDelete={() => setConfirmingDeleteId(null)}
                        onConfirmDelete={() =>
                          void deleteAsset(
                            `/api/v1/portfolio/fcn/${id}`,
                            id,
                            "FCN",
                          )
                        }
                      />
                    );
                  })}
                </div>
              )
            ) : cryptos.length === 0 ? (
              <EmptyAssetState message={emptyAssetMessage("crypto")} />
            ) : (
              <div className="space-y-4">
                {cryptos.map((c, index) => {
                  const id = String(c.id || "");
                  const rowKey = `Crypto:${id}`;
                  return (
                    <AssetRow
                      key={id || `${c.symbol || "crypto"}-${index}`}
                      title={`${textValue(c.symbol, "CRYPTO")} · ${textValue(c.asset_type, "crypto")}`}
                      detail={`數量：${numberValue(c.quantity)} | 均價：${money(c.avg_price)} | 現價：${money(c.current_price)}`}
                      subDetail={`市值：${money(c.current_value)} | 槓桿：${numberValue(c.leverage)}x | Grid：${money(c.grid_lower)} - ${money(c.grid_upper)}`}
                      deleting={deletingId === rowKey}
                      confirmingDelete={confirmingDeleteId === rowKey}
                      disabled={!id}
                      editing={editingPosition?.type === "crypto" && editingPosition.id === id}
                      onEdit={() => startEditCrypto(c)}
                      onDelete={() => setConfirmingDeleteId(rowKey)}
                      onCancelDelete={() => setConfirmingDeleteId(null)}
                      onConfirmDelete={() =>
                        void deleteAsset(
                          `/api/v1/portfolio/crypto/${id}`,
                          id,
                          "Crypto",
                        )
                      }
                    >
                      {editingPosition?.type === "crypto" && editingPosition.id === id && (
                        <EditPanel
                          fields={[
                            { key: "quantity", label: "Quantity", value: editingPosition.quantity || "" },
                            { key: "avg_price", label: "Avg price", value: editingPosition.avg_price || "" },
                            { key: "current_price", label: "Current price", value: editingPosition.current_price || "" },
                            { key: "leverage", label: "Leverage", value: editingPosition.leverage || "" },
                            { key: "grid_lower", label: "Grid lower", value: editingPosition.grid_lower || "" },
                            { key: "grid_upper", label: "Grid upper", value: editingPosition.grid_upper || "" },
                          ]}
                          saving={savingEditId === `crypto:${id}`}
                          onChange={updateEditField}
                          onCancel={() => setEditingPosition(null)}
                          onSave={() => void saveEdit()}
                        />
                      )}
                    </AssetRow>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "decimal";
  type?: "text" | "date";
}) {
  return (
    <label className="block text-sm text-gray-400">
      {label}
      <input
        className={`${inputClass()} mt-2`}
        inputMode={inputMode}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextareaField({
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
    <label className="block text-sm text-gray-400">
      {label}
      <textarea
        className={`${inputClass()} mt-2 min-h-24 resize-y font-mono text-sm`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SubmitButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      className="w-full rounded-lg bg-white py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={loading}
      type="submit"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

function EditPanel({
  fields,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  fields: Array<{ key: keyof EditFormState; label: string; value: string }>;
  saving: boolean;
  onChange: (key: keyof EditFormState, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-5 rounded-xl border border-emerald-400/50 bg-emerald-400/10 p-4 shadow-lg shadow-emerald-950/20">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Editing position
          </div>
          <div className="mt-1 text-sm text-emerald-100">
            Update the fields below, then save or cancel.
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => (
          <Field
            inputMode="decimal"
            key={String(field.key)}
            label={field.label}
            value={field.value}
            onChange={(value) => onChange(field.key, value)}
          />
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded-xl border border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-white hover:text-black"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-xl border border-emerald-400 bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={onSave}
          type="button"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function AssetRow({
  title,
  detail,
  subDetail,
  deleting,
  confirmingDelete,
  disabled,
  editing,
  onEdit,
  onDelete,
  onCancelDelete,
  onConfirmDelete,
  children,
}: {
  title: string;
  detail: string;
  subDetail: string;
  deleting: boolean;
  confirmingDelete: boolean;
  disabled: boolean;
  editing: boolean;
  onEdit?: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-5 transition ${
        editing
          ? "border-emerald-400/70 bg-emerald-400/5 shadow-lg shadow-emerald-950/20"
          : "border-gray-800 bg-black"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="break-words text-lg font-bold text-white">{title}</div>
            {editing && (
              <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                Editing
              </span>
            )}
          </div>
          <div className="mt-3 text-sm leading-6 text-gray-300">{detail}</div>
          <div className="mt-1 text-sm leading-6 text-gray-400">
            {subDetail}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {onEdit && (
            <button
              onClick={onEdit}
              className="rounded-xl border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled || deleting}
              type="button"
            >
              {editing ? "Editing" : "Edit"}
            </button>
          )}
          <button
            onClick={onDelete}
            className="rounded-xl border border-red-500/70 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled || deleting}
            type="button"
          >
            {deleting ? "刪除中..." : "Delete"}
          </button>
        </div>
      </div>
      {confirmingDelete && (
        <div className="mt-5 rounded-xl border border-red-500/50 bg-red-500/10 p-4 shadow-lg shadow-red-950/20">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
            Delete confirmation
          </div>
          <div className="mt-2 text-sm font-semibold text-red-100">
            Are you sure you want to delete this position?
          </div>
          <div className="mt-1 text-sm leading-6 text-red-100/80">
            This action removes the position from your portfolio and cannot be undone in this MVP.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-xl border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white hover:text-black"
              onClick={onCancelDelete}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl border border-red-500 bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={deleting}
              onClick={onConfirmDelete}
              type="button"
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

function EmptyAssetState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-800 bg-black/40 p-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 text-lg text-gray-500">
        +
      </div>
      <div className="mt-3 font-semibold text-gray-200">{message}</div>
      <div className="mt-2 text-sm leading-6 text-gray-500">
        Use the asset ticket to add the first position in this section.
      </div>
    </div>
  );
}
