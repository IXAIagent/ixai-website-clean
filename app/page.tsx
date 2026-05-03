"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ApiError, API_BASE, apiFetch, getToken, logout } from "./lib/api";

type AlertItem = {
  title?: string | null;
  severity?: string | null;
  level?: string | null;
  message?: string | null;
};

type RiskSourceObject = {
  asset_class?: string | null;
  score?: number | string | null;
  weight?: number | string | null;
  message?: string | null;
};

type RiskSource = string | RiskSourceObject;

type DecisionCardItem = {
  title?: string | null;
  level?: string | null;
  message?: string | null;
  action_label?: string | null;
};

type PriceSourceSummary = {
  yahoo?: number | string | null;
  binance?: number | string | null;
  manual?: number | string | null;
};

type FcnMonitorItem = {
  id?: string | number | null;
  name?: string | null;
  fcn_code?: string | null;
  code?: string | null;
  worst_symbol?: string | null;
  worst_of_symbol?: string | null;
  worst_of?: string | null;
  worst_performance?: number | string | null;
  distance_to_KI?: number | string | null;
  distance_to_KO?: number | string | null;
  distance_to_ki?: number | string | null;
  distance_to_ko?: number | string | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_ko_pct?: number | string | null;
  risk_level?: string | null;
  ai_comment?: string | null;
  price_source?: string | null;
};

type CryptoPosition = {
  id?: string | number | null;
  symbol?: string | null;
  asset_type?: string | null;
  current_price?: number | string | null;
  current_value?: number | string | null;
  leverage?: number | string | null;
  grid_lower?: number | string | null;
  grid_upper?: number | string | null;
  grid_out_of_range?: boolean | null;
};

type StockPosition = {
  id?: string | number | null;
  symbol?: string | null;
  quantity?: number | string | null;
  avg_price?: number | string | null;
  current_price?: number | string | null;
  current_value?: number | string | null;
  value?: number | string | null;
  risk_tag?: string | null;
};

type CashPosition = {
  id?: string | number | null;
  currency?: string | null;
  amount?: number | string | null;
};

type WarningItem =
  | string
  | {
      title?: string | null;
      message?: string | null;
    };

type DashboardData = {
  status?: string;
  message?: string;
  portfolio_name?: string | null;
  total_value?: number | string | null;
  stock_value?: number | string | null;
  fcn_value?: number | string | null;
  crypto_value?: number | string | null;
  cash_value?: number | string | null;
  risk_level?: string | null;
  overall_risk_level?: string | null;
  risk_score?: number | string | null;
  top_risk?: string | null;
  top_risk_reason?: string | null;
  ai_advice?: string | null;
  alerts?: AlertItem[] | null;
  latest_alerts?: AlertItem[] | null;
  risk_sources?: RiskSource[] | null;
  decision_cards?: DecisionCardItem[] | null;
  data_quality_warnings?: WarningItem[] | null;
  fcn_analysis?: FcnMonitorItem[] | FcnMonitorItem | null;
  fcn_positions?: FcnMonitorItem[] | null;
  fcn_summary?: FcnMonitorItem[] | null;
  stock_positions?: StockPosition[] | null;
  stocks?: StockPosition[] | null;
  cash_summary?: CashPosition[] | null;
  crypto_positions?: CryptoPosition[] | null;
  price_source_summary?: PriceSourceSummary | null;
  market_data_updated_at?: string | null;
  price_updated_at?: string | null;
  updated_at?: string | null;
};

type RefreshResult = {
  updated_count?: number | string | null;
  failed_symbols?: unknown;
  price_source_summary?: PriceSourceSummary | null;
  market_data_updated_at?: string | null;
  price_updated_at?: string | null;
  updated_at?: string | null;
  message?: string | null;
};

type UserData = {
  email?: string;
};

type ViewMode = "guest" | "user" | "demo";
type RiskTone = "high" | "medium" | "low";

function numberValue(v: unknown, fallback = 0) {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim()
        ? Number(v.replace(/,/g, ""))
        : NaN;

  return Number.isFinite(n) ? n : fallback;
}

function numberText(v: unknown, fallback = "-") {
  const n = numberValue(v, NaN);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : fallback;
}

function leverageText(v: unknown) {
  const n = numberText(v, "");
  return n ? `${n}x` : "-";
}

function money(v: unknown) {
  return `$${numberValue(v).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}`;
}

function percent(v: unknown, fallback = "-") {
  const n = numberValue(v, NaN);

  if (!Number.isFinite(n)) {
    return fallback;
  }

  const value = Math.abs(n) <= 1 && n !== 0 ? n * 100 : n;
  return `${value.toFixed(1)}%`;
}

function weightPercent(v: unknown) {
  const n = numberValue(v, NaN);

  if (!Number.isFinite(n)) {
    return "-";
  }

  const value = Math.abs(n) <= 1 ? n * 100 : n;
  return `${Math.round(value)}%`;
}

function safeText(v: unknown, fallback = "-") {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

function normalizeSeverity(severity?: unknown): RiskTone {
  if (typeof severity === "number") {
    if (severity >= 75) return "high";
    if (severity >= 45) return "medium";
    return "low";
  }

  const value = String(severity || "").toLowerCase();
  if (
    value.includes("high") ||
    value.includes("critical") ||
    value.includes("severe") ||
    value.includes("高")
  ) {
    return "high";
  }

  if (
    value.includes("medium") ||
    value.includes("moderate") ||
    value.includes("warning") ||
    value.includes("warn") ||
    value.includes("中")
  ) {
    return "medium";
  }

  return "low";
}

function riskTone(data?: DashboardData | null): RiskTone {
  const explicit = String(data?.risk_level || data?.overall_risk_level || "").trim();

  if (explicit) {
    return normalizeSeverity(explicit);
  }

  const score = numberValue(data?.risk_score, NaN);
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function riskScore(data?: DashboardData | null) {
  const score = numberValue(data?.risk_score, NaN);
  if (Number.isFinite(score)) return Math.max(0, Math.min(100, Math.round(score)));

  const tone = riskTone(data);
  if (tone === "high") return 82;
  if (tone === "medium") return 55;
  return 25;
}

function riskText(tone: RiskTone) {
  if (tone === "high") return "高風險，建議優先檢查 FCN / Crypto 部位";
  if (tone === "medium") return "中風險，需持續監控";
  return "風險可控";
}

function riskClasses(tone: RiskTone) {
  if (tone === "high") return "border-red-500/60 bg-red-500/10 text-red-200";
  if (tone === "medium") return "border-yellow-500/60 bg-yellow-500/10 text-yellow-100";
  return "border-green-500/60 bg-green-500/10 text-green-100";
}

function riskColor(value?: unknown) {
  return riskClasses(normalizeSeverity(value));
}

function riskBarColor(tone: RiskTone) {
  if (tone === "high") return "bg-red-500";
  if (tone === "medium") return "bg-yellow-400";
  return "bg-green-400";
}

function cardTone(level?: string | null): RiskTone {
  return normalizeSeverity(level);
}

function sourceTone(source: RiskSource, fallbackTone: RiskTone): RiskTone {
  if (typeof source === "string") {
    if (source.toLowerCase().includes("cash")) return "low";
    return fallbackTone;
  }

  const score = numberValue(source.score, NaN);
  if (Number.isFinite(score)) return normalizeSeverity(score);

  const assetClass = String(source.asset_class || "").toLowerCase();
  if (assetClass.includes("cash")) return "low";

  return fallbackTone;
}

function riskSourceTitle(source: RiskSource) {
  return typeof source === "string" ? safeText(source) : safeText(source.asset_class);
}

function riskSourceMessage(source: RiskSource) {
  if (typeof source === "string") return "後端標記此資產類別為主要風險來源。";
  return safeText(source.message, "目前無詳細風險說明");
}

function safeActionLabel(label?: string | null) {
  const text = safeText(label, "查看風險");
  const lower = text.toLowerCase();
  const blockedWords = ["買", "賣", "buy", "sell", "long", "short"];
  return blockedWords.some((word) => lower.includes(word)) ? "查看風險" : text;
}

function decisionCards(data: DashboardData | null, tone: RiskTone): DecisionCardItem[] {
  if (Array.isArray(data?.decision_cards) && data.decision_cards.length > 0) {
    return data.decision_cards;
  }

  return [
    {
      title: "整體配置",
      level: tone,
      message:
        data?.ai_advice ||
        (tone === "high"
          ? "目前風險偏高，建議優先檢視 FCN、Crypto 與單一資產集中度。"
          : "檢視資產配置與風險來源，避免單一曝險過度集中。"),
      action_label: "查看配置風險",
    },
    {
      title: "FCN 監控",
      level: "medium",
      message: "持續追蹤 Worst-of 標的、KI 距離與 KO 條件。",
      action_label: "查看 FCN 風險",
    },
    {
      title: "Crypto / Grid",
      level: numberValue(data?.crypto_value) > 0 && tone === "high" ? "high" : "low",
      message: "確認 Grid 是否超出原策略區間，並追蹤槓桿與波動曝險。",
      action_label: "查看 Grid 風險",
    },
  ];
}

function normalizePriceSourceSummary(summary?: PriceSourceSummary | null) {
  return {
    yahoo: numberValue(summary?.yahoo),
    binance: numberValue(summary?.binance),
    manual: numberValue(summary?.manual),
  };
}

function normalizeFailedSymbols(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => safeText(item, "")).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeWarnings(value?: WarningItem[] | null) {
  if (!Array.isArray(value)) return [];

  return value
    .map((warning) => {
      if (typeof warning === "string") return warning.trim();
      return safeText(warning.message || warning.title, "");
    })
    .filter(Boolean);
}

function stockPositionItems(data?: DashboardData | null) {
  if (Array.isArray(data?.stock_positions)) return data.stock_positions;
  if (Array.isArray(data?.stocks)) return data.stocks;
  return [];
}

function stockPositionValue(position: StockPosition) {
  const explicit = numberValue(position.current_value ?? position.value, NaN);
  if (Number.isFinite(explicit)) return explicit;

  return numberValue(position.quantity) * numberValue(position.current_price);
}

function cashItems(data?: DashboardData | null) {
  return Array.isArray(data?.cash_summary) ? data.cash_summary : [];
}

function allocationItems(data?: DashboardData | null) {
  const total = numberValue(data?.total_value);
  const items = [
    { label: "Stock", value: numberValue(data?.stock_value), color: "bg-cyan-400" },
    { label: "Cash", value: numberValue(data?.cash_value), color: "bg-green-400" },
    { label: "FCN", value: numberValue(data?.fcn_value), color: "bg-indigo-400" },
    { label: "Crypto", value: numberValue(data?.crypto_value), color: "bg-amber-400" },
  ];

  return items.map((item) => ({
    ...item,
    percent: total > 0 ? (item.value / total) * 100 : 0,
  }));
}

function fcnAnalysisItems(data?: DashboardData | null) {
  if (Array.isArray(data?.fcn_analysis)) return data.fcn_analysis;
  if (data?.fcn_analysis && typeof data.fcn_analysis === "object") return [data.fcn_analysis];
  return [];
}

function fcnMonitorItems(data?: DashboardData | null) {
  const analysis = fcnAnalysisItems(data);
  if (analysis.length > 0) return analysis;
  return data?.fcn_positions || data?.fcn_summary || [];
}

function fcnDistanceToKi(item: FcnMonitorItem) {
  return (
    item.distance_to_KI ??
    item.distance_to_ki ??
    item.distance_to_ki_pct
  );
}

function fcnDistanceToKo(item: FcnMonitorItem) {
  return (
    item.distance_to_KO ??
    item.distance_to_ko ??
    item.distance_to_ko_pct
  );
}

function gridStatus(position: CryptoPosition) {
  if (typeof position.grid_out_of_range === "boolean" && position.grid_out_of_range) {
    return "超出區間";
  }

  const current = numberValue(position.current_price, NaN);
  const lower = numberValue(position.grid_lower, NaN);
  const upper = numberValue(position.grid_upper, NaN);

  if (!Number.isFinite(current) || !Number.isFinite(lower) || !Number.isFinite(upper)) {
    return "-";
  }

  if (current < lower || current > upper) {
    return "超出區間";
  }

  const nearLower = lower > 0 && current <= lower * 1.05;
  const nearUpper = upper > 0 && current >= upper * 0.95;

  if (nearLower || nearUpper) {
    return "接近區間邊界";
  }

  return "區間內";
}

function gridStatusTone(status: string): RiskTone {
  if (status === "超出區間") return "high";
  if (status === "接近區間邊界") return "medium";
  return "low";
}

function dashboardError(err: unknown) {
  if (err instanceof ApiError && err.status === 401) {
    logout();
    return "登入已失效，請重新登入。";
  }

  if (err instanceof ApiError && err.status === 404) {
    return "此帳號尚未建立 Portfolio 或尚無資產資料。";
  }

  if (err instanceof ApiError) {
    return err.message || "Dashboard API 回傳錯誤，請稍後再試。";
  }

  return "無法連線後端 API，請確認 FastAPI 是否啟動。";
}

async function parseResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function readableApiError(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) return payload.trim();

  if (payload && typeof payload === "object") {
    const data = payload as { detail?: unknown; message?: unknown };
    return safeText(data.detail || data.message, fallback);
  }

  return fallback;
}

function refreshTimestamp(result?: RefreshResult | null, data?: DashboardData | null) {
  return (
    result?.market_data_updated_at ||
    result?.price_updated_at ||
    result?.updated_at ||
    data?.market_data_updated_at ||
    data?.price_updated_at ||
    data?.updated_at
  );
}

function formatDateTime(value: unknown) {
  const text = safeText(value, "");
  if (!text) return "-";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [mode, setMode] = useState<ViewMode>("guest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<RefreshResult | null>(null);
  const [refreshError, setRefreshError] = useState("");
  const [marketCheckedAt, setMarketCheckedAt] = useState("");

  async function loadUserDashboard() {
    setLoading(true);
    setError("");
    setMode("user");

    try {
      const [userResult, summaryResult] = await Promise.allSettled([
        apiFetch<UserData>("/api/v1/auth/auth/me"),
        apiFetch<DashboardData>("/api/v1/dashboard/my-summary"),
      ]);

      if (userResult.status === "fulfilled") {
        setUserEmail(userResult.value.email || "");
      } else if (userResult.reason instanceof ApiError && userResult.reason.status === 401) {
        throw userResult.reason;
      }

      if (summaryResult.status === "rejected") {
        throw summaryResult.reason;
      }

      setData(summaryResult.value);
      setMarketCheckedAt(new Date().toISOString());
    } catch (err) {
      const message = dashboardError(err);
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
        setMode("guest");
        setUserEmail("");
      }
      setData(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDemoDashboard() {
    setLoading(true);
    setError("");
    setMode("demo");
    setUserEmail("");

    try {
      const summary = await apiFetch<DashboardData>("/api/v1/dashboard/dev-real-summary");
      setData(summary);
      setMarketCheckedAt(new Date().toISOString());
    } catch (err) {
      setData(null);
      setError(dashboardError(err));
    } finally {
      setLoading(false);
    }
  }

  async function refreshMarketPrices() {
    setRefreshing(true);
    setRefreshError("");
    setRefreshResult(null);

    try {
      const headers = new Headers();
      const activeToken = mode === "demo" ? null : token || getToken();

      if (activeToken) {
        headers.set("Authorization", `Bearer ${activeToken}`);
      }

      const res = await fetch(`${API_BASE}/api/v1/market/refresh-prices`, {
        method: "POST",
        headers,
      });
      const payload = await parseResponse(res);

      if (!res.ok) {
        throw new ApiError(
          readableApiError(payload, `更新市場價格失敗 (${res.status})`),
          res.status,
          payload,
        );
      }

      const result = (payload || {}) as RefreshResult;
      setRefreshResult(result);
      setMarketCheckedAt(refreshTimestamp(result) || new Date().toISOString());

      if (mode === "demo" || !activeToken) {
        await loadDemoDashboard();
      } else {
        await loadUserDashboard();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        setToken(null);
        setMode("guest");
      }

      setRefreshError(
        err instanceof ApiError
          ? err.message || "更新市場價格失敗，請稍後再試。"
          : "無法連線更新市場價格 API，請確認 FastAPI 是否啟動。",
      );
    } finally {
      setRefreshing(false);
    }
  }

  function handleLogout() {
    logout();
    setToken(null);
    setUserEmail("");
    setMode("guest");
    setData(null);
    setError("");
    setRefreshError("");
    setRefreshResult(null);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedToken = getToken();
      setToken(storedToken);
      setCheckedAuth(true);
      setMarketCheckedAt(new Date().toISOString());

      if (storedToken) {
        void loadUserDashboard();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const tone = riskTone(data);
  const score = riskScore(data);
  const alerts = data?.latest_alerts || data?.alerts || [];
  const riskSources = Array.isArray(data?.risk_sources) ? data.risk_sources : [];
  const cards = decisionCards(data, tone);
  const stockPositions = stockPositionItems(data);
  const cashPositions = cashItems(data);
  const allocation = allocationItems(data);
  const fcnItems = fcnMonitorItems(data);
  const cryptoPositions = Array.isArray(data?.crypto_positions) ? data.crypto_positions : [];
  const dataQualityWarnings = normalizeWarnings(data?.data_quality_warnings);
  const sourceSummary = normalizePriceSourceSummary(
    refreshResult?.price_source_summary || data?.price_source_summary,
  );
  const failedSymbols = normalizeFailedSymbols(refreshResult?.failed_symbols);
  const isLoggedIn = Boolean(token);
  const lastMarketUpdate =
    refreshTimestamp(refreshResult, data) || marketCheckedAt || new Date().toISOString();
  const canRefresh = checkedAuth && (Boolean(data) || isLoggedIn || mode === "demo");
  const statusText =
    !checkedAuth
      ? "檢查登入狀態"
      : mode === "demo"
        ? "Demo 模式"
        : isLoggedIn
          ? `已登入使用者${userEmail ? `：${userEmail}` : ""}`
          : "尚未登入";

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-gray-800 bg-gray-950 px-4 py-2 text-sm text-gray-300">
              {statusText}
            </div>
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
              IXAI AGENT
            </div>
            <h1 className="text-4xl font-bold md:text-6xl">AI 個人資產管理與風險評估系統</h1>
            <p className="mt-6 max-w-2xl leading-7 text-gray-400">
              結合股票、Cash、FCN、Crypto 與 AI 風控，協助你把多資產曝險整理成可監控的風險視圖。
            </p>
          </div>

          <div className="flex flex-wrap gap-3 md:justify-end">
            {!checkedAuth ? (
              <button
                className="rounded-lg bg-white px-5 py-3 font-semibold text-black opacity-60"
                disabled
                type="button"
              >
                檢查中...
              </button>
            ) : isLoggedIn ? (
              <>
                <button
                  onClick={loadUserDashboard}
                  className="rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                  type="button"
                >
                  {loading && mode === "user" ? "載入中..." : "載入 Dashboard"}
                </button>
                <button
                  onClick={refreshMarketPrices}
                  className="rounded-lg border border-cyan-500/60 px-5 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={refreshing || !canRefresh}
                  type="button"
                >
                  {refreshing ? "更新中..." : "更新市場價格"}
                </button>
                <Link
                  href="/input"
                  className="rounded-lg border border-gray-700 px-5 py-3 font-semibold text-white transition hover:bg-white hover:text-black"
                >
                  新增資產
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-red-500/60 px-5 py-3 font-semibold text-red-200 transition hover:bg-red-500 hover:text-white"
                  type="button"
                >
                  登出
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200"
                >
                  前往登入
                </Link>
                <button
                  onClick={loadDemoDashboard}
                  className="rounded-lg border border-gray-700 px-5 py-3 font-semibold text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                  type="button"
                >
                  {loading && mode === "demo" ? "讀取 Demo..." : "查看 Demo"}
                </button>
                {mode === "demo" && (
                  <button
                    onClick={refreshMarketPrices}
                    className="rounded-lg border border-cyan-500/60 px-5 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={refreshing || !canRefresh}
                    type="button"
                  >
                    {refreshing ? "更新中..." : "更新市場價格"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-lg border border-red-500/60 bg-red-500/10 p-5 leading-7 text-red-200">
            {error}
          </div>
        )}

        {refreshError && (
          <div className="mb-8 rounded-lg border border-red-500/60 bg-red-500/10 p-5 leading-7 text-red-200">
            {refreshError}
          </div>
        )}

        {refreshResult && (
          <section className="mb-8 rounded-lg border border-green-500/50 bg-green-500/10 p-5 text-green-100">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="font-bold">市場價格已更新</div>
                <p className="mt-2 text-sm leading-6 opacity-90">
                  {safeText(refreshResult.message, "Dashboard 已自動重新載入。")}
                </p>
              </div>
              <div className="text-sm leading-6 text-green-100/90">
                <div>updated_count：{numberText(refreshResult.updated_count, "0")}</div>
                <div>
                  failed_symbols：
                  {failedSymbols.length > 0 ? failedSymbols.join(", ") : "-"}
                </div>
                <div>
                  price_source_summary：Yahoo {sourceSummary.yahoo} / Binance{" "}
                  {sourceSummary.binance} / Manual {sourceSummary.manual}
                </div>
              </div>
            </div>
          </section>
        )}

        {checkedAuth && !data && !isLoggedIn && (
          <section className="mb-8 rounded-lg border border-gray-800 bg-gray-950 p-6">
            <div className="text-sm font-semibold text-gray-500">帳號狀態</div>
            <h2 className="mt-2 text-2xl font-bold">請先登入</h2>
            <p className="mt-3 max-w-2xl leading-7 text-gray-400">
              登入後可讀取個人化 Dashboard 與資產資料；也可以先查看 Demo Dashboard。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200"
              >
                前往登入
              </Link>
              <button
                onClick={loadDemoDashboard}
                className="rounded-lg border border-gray-700 px-5 py-3 font-semibold transition hover:bg-white hover:text-black"
                type="button"
              >
                查看 Demo
              </button>
            </div>
          </section>
        )}

        {data && (
          <div className="space-y-8">
            <section className={`rounded-lg border p-6 ${riskClasses(tone)}`}>
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm opacity-75">今日狀態</div>
                  <div className="mt-2 text-2xl font-bold">{riskText(tone)}</div>
                  <div className="mt-2 text-sm opacity-75">
                    {safeText(data.portfolio_name, "IXAI Portfolio")}
                  </div>
                  <div className="mt-3 max-w-2xl text-sm leading-6 opacity-90">
                    {safeText(data.top_risk_reason || data.ai_advice, "請持續追蹤資產配置與風險來源。")}
                  </div>
                </div>

                <div className="min-w-full md:min-w-80">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Risk Index</span>
                    <span>{score}/100</span>
                  </div>
                  <div className="h-3 rounded-full bg-black/50">
                    <div
                      className={`h-3 rounded-full ${riskBarColor(tone)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-4">
              <Card title="總資產" value={money(data.total_value)} />
              <Card title="股票" value={money(data.stock_value)} />
              <Card title="Cash" value={money(data.cash_value)} />
              <Card title="FCN" value={money(data.fcn_value)} />
              <Card title="Crypto" value={money(data.crypto_value)} />
              <Card title="Risk Score" value={`${score}/100`} />
              <Card title="Top Risk" value={safeText(data.top_risk_reason || data.top_risk)} />
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">資產配置</h2>
                <span className="text-sm text-gray-500">Stock / Cash / FCN / Crypto</span>
              </div>

              <div className="space-y-4">
                {allocation.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-gray-400">
                        {money(item.value)} · {item.percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-black">
                      <div
                        className={`h-full ${item.color}`}
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">股票部位</h2>
                <span className="text-sm text-gray-500">{stockPositions.length} 筆</span>
              </div>

              {stockPositions.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {stockPositions.map((stock, index) => {
                    const symbol = safeText(stock.symbol, "STOCK");
                    const currentValue = stockPositionValue(stock);

                    return (
                      <div
                        key={`${stock.id || symbol}-${index}`}
                        className="rounded-lg border border-gray-800 bg-black p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="font-bold">{symbol}</div>
                          <div className={`rounded-full border px-3 py-1 text-xs ${riskColor(stock.risk_tag)}`}>
                            {safeText(stock.risk_tag, "tracked")}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm leading-6 text-gray-400 sm:grid-cols-2">
                          <Metric label="Quantity" value={numberText(stock.quantity)} />
                          <Metric label="Avg price" value={money(stock.avg_price)} />
                          <Metric label="Current price" value={money(stock.current_price)} />
                          <Metric label="Current value" value={money(currentValue)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="leading-7 text-gray-400">目前沒有股票部位</p>
              )}
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Cash Buffer</h2>
                <span className="text-sm text-gray-500">{cashPositions.length} 筆</span>
              </div>

              {cashPositions.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {cashPositions.map((cash, index) => (
                    <Metric
                      key={`${cash.id || cash.currency || "cash"}-${index}`}
                      label={safeText(cash.currency, "USD")}
                      value={money(cash.amount)}
                    />
                  ))}
                </div>
              ) : (
                <p className="leading-7 text-gray-400">目前沒有 Cash 部位，風險分母只會反映已輸入資產。</p>
              )}
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Market Data 狀態</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    最近更新時間：{formatDateTime(lastMarketUpdate)}
                  </p>
                </div>
                <button
                  onClick={refreshMarketPrices}
                  className="rounded-lg border border-cyan-500/60 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={refreshing}
                  type="button"
                >
                  {refreshing ? "更新中..." : "更新市場價格"}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <MarketStat label="Yahoo 更新數量" value={numberText(sourceSummary.yahoo, "0")} />
                <MarketStat label="Binance 更新數量" value={numberText(sourceSummary.binance, "0")} />
                <MarketStat label="Manual fallback 數量" value={numberText(sourceSummary.manual, "0")} />
              </div>

              <div className="mt-5 rounded-lg border border-gray-800 bg-black p-4 text-sm leading-6 text-gray-400">
                failed_symbols：{failedSymbols.length > 0 ? failedSymbols.join(", ") : "-"}
              </div>
            </section>

            {dataQualityWarnings.length > 0 && (
              <section className="rounded-lg border border-yellow-500/60 bg-yellow-500/10 p-5 text-yellow-100">
                <h2 className="text-xl font-bold">Data Quality Warnings</h2>
                <div className="mt-4 space-y-3 text-sm leading-6">
                  {dataQualityWarnings.map((warning, index) => (
                    <div key={`${warning}-${index}`}>{warning}</div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">風險來源拆解</h2>
                <span className="text-sm text-gray-500">{riskSources.length} 項</span>
              </div>

              {riskSources.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {riskSources.map((source, index) => {
                    const currentTone = sourceTone(source, tone);
                    const scoreValue =
                      typeof source === "string" ? "-" : numberText(source.score);
                    const weightValue =
                      typeof source === "string" ? "-" : weightPercent(source.weight);

                    return (
                      <div
                        key={`${riskSourceTitle(source)}-${index}`}
                        className={`rounded-lg border p-4 ${riskClasses(currentTone)}`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="font-bold">{riskSourceTitle(source)}</div>
                          <div className="text-sm opacity-80">
                            Score {scoreValue} · Weight {weightValue}
                          </div>
                        </div>
                        <p className="mt-3 leading-7 opacity-90">{riskSourceMessage(source)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="leading-7 text-gray-400">目前無明確風險來源</p>
              )}
            </section>

            <section>
              <h2 className="mb-5 text-2xl font-bold">AI 決策卡</h2>

              <div className="grid gap-5 md:grid-cols-3">
                {cards.map((card, index) => {
                  const currentTone = cardTone(card.level);
                  return (
                    <DecisionCard
                      key={`${card.title || "decision"}-${index}`}
                      title={safeText(card.title, "風險檢視")}
                      tag={
                        currentTone === "high"
                          ? "高風險"
                          : currentTone === "medium"
                            ? "需監控"
                            : "正常"
                      }
                      text={safeText(card.message, "持續檢視資產配置與風險來源。")}
                      button={safeActionLabel(card.action_label)}
                      tone={currentTone}
                    />
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">FCN Monitor</h2>
                <span className="text-sm text-gray-500">{fcnItems.length} 筆</span>
              </div>

              {fcnItems.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {fcnItems.map((fcn, index) => {
                    const code = safeText(fcn.fcn_code || fcn.code || fcn.name, "FCN");
                    const currentTone = cardTone(fcn.risk_level);

                    return (
                      <div
                        key={`${fcn.id || code}-${index}`}
                        className="rounded-lg border border-gray-800 bg-black p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="font-bold">{code}</div>
                          <div className={`rounded-full border px-3 py-1 text-xs ${riskColor(fcn.risk_level)}`}>
                            {safeText(fcn.risk_level, "low")}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm leading-6 text-gray-400 sm:grid-cols-2">
                          <Metric label="Worst-of" value={safeText(fcn.worst_symbol || fcn.worst_of_symbol || fcn.worst_of)} />
                          <Metric label="Worst performance" value={percent(fcn.worst_performance)} />
                          <Metric label="Distance to KI" value={percent(fcnDistanceToKi(fcn))} />
                          <Metric label="Distance to KO" value={percent(fcnDistanceToKo(fcn))} />
                          <Metric label="Price source" value={safeText(fcn.price_source)} />
                          <Metric label="Risk level" value={safeText(fcn.risk_level, currentTone)} />
                        </div>
                        {safeText(fcn.ai_comment, "") && (
                          <p className="mt-4 rounded-lg border border-gray-800 bg-gray-950 p-3 text-sm leading-6 text-gray-300">
                            {safeText(fcn.ai_comment)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="leading-7 text-gray-400">目前沒有 FCN 部位</p>
              )}
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Crypto / Grid Monitor</h2>
                <span className="text-sm text-gray-500">{cryptoPositions.length} 筆</span>
              </div>

              {cryptoPositions.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {cryptoPositions.map((position, index) => {
                    const status = gridStatus(position);
                    const statusTone = gridStatusTone(status);

                    return (
                      <div
                        key={`${position.id || position.symbol || "crypto"}-${index}`}
                        className="rounded-lg border border-gray-800 bg-black p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="font-bold">
                            {safeText(position.symbol, "CRYPTO")} ·{" "}
                            {safeText(position.asset_type, "crypto")}
                          </div>
                          <div className={`rounded-full border px-3 py-1 text-xs ${riskClasses(statusTone)}`}>
                            {status}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm leading-6 text-gray-400 sm:grid-cols-2">
                          <Metric label="Current price" value={money(position.current_price)} />
                          <Metric label="Current value" value={money(position.current_value)} />
                          <Metric label="Leverage" value={leverageText(position.leverage)} />
                          <Metric label="Grid lower" value={money(position.grid_lower)} />
                          <Metric label="Grid upper" value={money(position.grid_upper)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="leading-7 text-gray-400">目前沒有 Crypto / Grid 部位</p>
              )}
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-950 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">風險提醒</h2>
                <span className="text-sm text-gray-500">{alerts.length} 則</span>
              </div>

              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((a, i) => {
                    const alertTone = normalizeSeverity(a.severity || a.level);
                    return (
                      <div
                        key={`${a.title || "alert"}-${i}`}
                        className={`rounded-lg border p-5 ${riskClasses(alertTone)}`}
                      >
                        <div className="flex justify-between gap-4">
                          <div className="font-bold">{safeText(a.title, "風險提醒")}</div>
                          <div className="text-sm uppercase opacity-80">
                            {safeText(a.severity || a.level)}
                          </div>
                        </div>

                        <p className="mt-3 leading-7 opacity-90">
                          {safeText(a.message, "目前無詳細說明")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="leading-7 text-gray-400">目前無風險警示</p>
              )}
            </section>
          </div>
        )}

        <section className="mt-10 rounded-lg border border-gray-800 bg-gray-950 p-5 text-sm leading-7 text-gray-400">
          本系統目前為開發版本，內容僅供投資教育與風險監控參考，不構成投資建議、買賣指令或收益保證。
        </section>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg shadow-blue-500/5">
      <div className="mb-3 text-sm text-gray-500">{title}</div>
      <div className="break-words text-2xl font-bold">{value}</div>
    </div>
  );
}

function MarketStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-black p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 break-words font-semibold text-gray-200">{value}</div>
    </div>
  );
}

function DecisionCard({
  title,
  tag,
  text,
  button,
  tone,
}: {
  title: string;
  tag: string;
  text: string;
  button: string;
  tone: RiskTone;
}) {
  return (
    <div className={`rounded-lg border p-6 ${riskClasses(tone)}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="rounded-full border border-white/20 px-3 py-1 text-xs">
          {tag}
        </span>
      </div>

      <p className="mb-5 whitespace-pre-line leading-7 opacity-90">{text}</p>

      <button
        className="w-full rounded-lg border border-white/20 py-2 font-semibold transition hover:bg-white hover:text-black"
        type="button"
      >
        {button}
      </button>
    </div>
  );
}
