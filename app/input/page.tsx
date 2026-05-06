"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ApiError, apiFetch, getToken, logout } from "../lib/api";

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
  notional?: number | string | null;
  notional_amount?: number | string | null;
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
  notional_amount: string;
  underlyings: FCNUnderlying[] | string;
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

const emptyFcnForm: FCNForm = {
  name: "",
  fcn_code: "",
  notional_amount: "",
  underlyings: [
    { symbol: "", initial_price: "" },
    { symbol: "", initial_price: "" },
    { symbol: "", initial_price: "" },
  ],
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

function percent(v: unknown) {
  const n = numberValue(v, NaN);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "-";
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
    return "border-green-500/50 bg-green-500/10 text-green-200";
  if (type === "error") return "border-red-500/50 bg-red-500/10 text-red-200";
  return "border-gray-700 bg-gray-900 text-gray-300";
}

function inputClass() {
  return "w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-white";
}

export default function InputPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [activeAsset, setActiveAsset] = useState<AssetMode>("stock");
  const [symbol, setSymbol] = useState("");
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
  const parsedUnderlyings = parseFcnUnderlyings(fcnForm.underlyings);

  function returnToDashboard() {
    router.push("/dashboard");
  }

  function updateFcnField(
    key: Exclude<keyof FCNForm, "underlyings">,
    value: string,
  ) {
    setFcnForm((current) => ({ ...current, [key]: value }));
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

  async function loadAssets() {
    setLoadingAssets(true);
    setNotice(null);

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
      setQuantity("");
      setAvgPrice("");
      setCurrentPrice("");
      await loadAssets();
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
      await loadAssets();
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
          notional_amount: notionalAmount,
          notional: notionalAmount,
          underlyings: validUnderlyings.map((item) => item.symbol).join(","),
          underlying_details: validUnderlyings,
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
      await loadAssets();
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
      await loadAssets();
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

  async function deleteAsset(path: string, id: string, label: string) {
    setDeletingId(`${label}:${id}`);
    setNotice(null);

    try {
      await apiFetch(path, { method: "DELETE" });
      setNotice({ type: "success", message: `${label} 已刪除。` });
      await loadAssets();
      returnToDashboard();
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
        void loadAssets();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

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
              onClick={loadAssets}
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
            className={`mb-6 rounded-lg border p-4 text-sm leading-6 ${noticeClass(notice.type)}`}
          >
            {notice.message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_360px]">
          <nav className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {assetModes.map((mode) => (
              <button
                key={mode.id}
                className={`rounded-lg border p-4 text-left transition ${
                  activeAsset === mode.id
                    ? "border-white bg-white text-black"
                    : "border-gray-800 bg-gray-950 text-gray-300 hover:border-gray-500"
                }`}
                onClick={() => setActiveAsset(mode.id)}
                type="button"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                  {mode.label}
                </div>
                <div className="mt-2 font-bold">{mode.title}</div>
                <div className="mt-2 text-sm leading-6 opacity-70">
                  {mode.description}
                </div>
              </button>
            ))}
          </nav>

          <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
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
                  onChange={setSymbol}
                />
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
                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>

                <div className="rounded-lg border border-gray-800 bg-black p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white">
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

                  <div className="space-y-3">
                    {parsedUnderlyings.map((underlying, index) => (
                      <div
                        key={index}
                        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px]"
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

          <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">{activeMode.title}清單</h2>
              <span className="text-sm text-gray-500">{activeCount} 筆</span>
            </div>

            {loadingAssets ? (
              <p className="text-gray-400">清單載入中...</p>
            ) : activeAsset === "stock" ? (
              stocks.length === 0 ? (
                <p className="leading-7 text-gray-400">目前沒有股票資料</p>
              ) : (
                <div className="space-y-4">
                  {stocks.map((s, index) => {
                    const id = String(s.id || "");
                    return (
                      <AssetRow
                        key={id || `${s.symbol || "stock"}-${index}`}
                        title={textValue(s.symbol)}
                        detail={`股數：${numberValue(s.quantity)} | 成本：${money(s.avg_price)} | 現價：${money(s.current_price)}`}
                        subDetail={`市值：${money(s.current_value)}`}
                        deleting={deletingId === `股票:${id}`}
                        disabled={!id}
                        onDelete={() =>
                          void deleteAsset(
                            `/api/v1/portfolio/stock/${id}`,
                            id,
                            "股票",
                          )
                        }
                      />
                    );
                  })}
                </div>
              )
            ) : activeAsset === "cash" ? (
              cashPositions.length === 0 ? (
                <p className="leading-7 text-gray-400">目前沒有 Cash 資料</p>
              ) : (
                <div className="space-y-4">
                  {cashPositions.map((cash, index) => {
                    const id = String(cash.id || "");
                    const currency = textValue(cash.currency, "USD");
                    return (
                      <AssetRow
                        key={id || `${currency}-${index}`}
                        title={`${currency} Cash`}
                        detail={`金額：${money(cash.amount)}`}
                        subDetail="Cash 會納入總資產與風險分母。"
                        deleting={deletingId === `Cash:${id}`}
                        disabled={!id}
                        onDelete={() =>
                          void deleteAsset(
                            `/api/v1/portfolio/cash/${id}`,
                            id,
                            "Cash",
                          )
                        }
                      />
                    );
                  })}
                </div>
              )
            ) : activeAsset === "fcn" ? (
              fcns.length === 0 ? (
                <p className="leading-7 text-gray-400">目前沒有 FCN 資料</p>
              ) : (
                <div className="space-y-4">
                  {fcns.map((f, index) => {
                    const id = String(f.id || "");
                    const code = textValue(
                      f.fcn_code || f.code || f.name,
                      "FCN",
                    );
                    return (
                      <AssetRow
                        key={id || `${code}-${index}`}
                        title={code}
                        detail={`本金：${money(f.notional_amount ?? f.notional)} | Worst-of：${textValue(f.worst_of_symbol || f.worst_of)}`}
                        subDetail={`KI 距離：${percent(f.distance_to_ki_pct)} | KO 距離：${percent(f.distance_to_ko_pct)} | 風險：${textValue(f.risk_level)}`}
                        deleting={deletingId === `FCN:${id}`}
                        disabled={!id}
                        onDelete={() =>
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
              <p className="leading-7 text-gray-400">
                目前沒有 Crypto / Grid 資料
              </p>
            ) : (
              <div className="space-y-4">
                {cryptos.map((c, index) => {
                  const id = String(c.id || "");
                  return (
                    <AssetRow
                      key={id || `${c.symbol || "crypto"}-${index}`}
                      title={`${textValue(c.symbol, "CRYPTO")} · ${textValue(c.asset_type, "crypto")}`}
                      detail={`數量：${numberValue(c.quantity)} | 均價：${money(c.avg_price)} | 現價：${money(c.current_price)}`}
                      subDetail={`市值：${money(c.current_value)} | 槓桿：${numberValue(c.leverage)}x | Grid：${money(c.grid_lower)} - ${money(c.grid_upper)}`}
                      deleting={deletingId === `Crypto:${id}`}
                      disabled={!id}
                      onDelete={() =>
                        void deleteAsset(
                          `/api/v1/portfolio/crypto/${id}`,
                          id,
                          "Crypto",
                        )
                      }
                    />
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "decimal";
}) {
  return (
    <label className="block text-sm text-gray-400">
      {label}
      <input
        className={`${inputClass()} mt-2`}
        inputMode={inputMode}
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

function AssetRow({
  title,
  detail,
  subDetail,
  deleting,
  disabled,
  onDelete,
}: {
  title: string;
  detail: string;
  subDetail: string;
  deleting: boolean;
  disabled: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-black p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="break-words text-lg font-bold">{title}</div>
          <div className="mt-2 text-sm leading-6 text-gray-400">{detail}</div>
          <div className="mt-1 text-sm leading-6 text-gray-400">
            {subDetail}
          </div>
        </div>

        <button
          onClick={onDelete}
          className="rounded-lg border border-red-500/70 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || deleting}
          type="button"
        >
          {deleting ? "刪除中..." : "刪除"}
        </button>
      </div>
    </div>
  );
}
