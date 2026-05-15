"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertItem,
  AllocationItem,
  AssetAllocationResponse,
  CashPositionResponse,
  CryptoPositionResponse,
  DecisionCard,
  FCNPositionResponse,
  getCash,
  getCrypto,
  getFcns,
  getMyAssetAllocation,
  getMyRiskOverview,
  getMySummary,
  getPortfolioNews,
  getPortfolioPriority,
  getStocks,
  getToken,
  logout,
  NewsArticle,
  PortfolioNewsResponse,
  PortfolioPriorityResponse,
  RiskOverviewResponse,
  StockPositionResponse,
  SummaryResponse,
} from "../lib/api";

type DashboardState = {
  summary: SummaryResponse;
  allocation: AssetAllocationResponse;
  risk: RiskOverviewResponse;
  stocks: StockPositionResponse[];
  fcns: FCNPositionResponse[];
  crypto: CryptoPositionResponse[];
  cash: CashPositionResponse[];
  news: PortfolioNewsResponse | null;
  priority: PortfolioPriorityResponse | null;
};

type FCNUnderlyingResult = {
  symbol?: string | null;
  initial_price?: number | string | null;
  current_price?: number | string | null;
  performance?: number | string | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_KI?: number | string | null;
  price_source?: string | null;
  is_stale?: boolean | null;
};

type FCNDetail = FCNPositionResponse & {
  fcn_id?: string | number | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_ko_pct?: number | string | null;
  underlying_results?: FCNUnderlyingResult[] | null;
  prices?: FCNUnderlyingResult[] | null;
  symbols?: string[] | null;
};

function numberValue(value: unknown, fallback = 0) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  return Number.isFinite(number) ? number : fallback;
}

function money(value: unknown) {
  const number = numberValue(value, NaN);

  if (!Number.isFinite(number)) return "$0";
  return `$${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function priceMoney(value: unknown) {
  const number = numberValue(value, NaN);
  if (!Number.isFinite(number) || number <= 0) return "待更新";
  return `$${number.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function percentValue(value: unknown) {
  const number = numberValue(value, NaN);
  if (!Number.isFinite(number)) return "-";
  const pct = Math.abs(number) <= 1 ? number * 100 : number;
  return `${pct.toFixed(1)}%`;
}

function percentNumber(value: unknown) {
  const number = numberValue(value, NaN);
  if (!Number.isFinite(number)) return NaN;
  return Math.abs(number) <= 1 ? number * 100 : number;
}

function kiDistanceClass(value: unknown) {
  const pct = percentNumber(value);
  if (!Number.isFinite(pct)) return "text-zinc-400";
  if (pct < 5) return "text-red-400";
  if (pct <= 15) return "text-yellow-300";
  return "text-emerald-300";
}

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function tenorText(value: unknown) {
  const months = numberValue(value, NaN);
  if (!Number.isFinite(months) || months <= 0) return "-";
  return `${months}M`;
}

function assetDisplayName(displayName: unknown, symbol: unknown, fallback: string) {
  const symbolText = textValue(symbol, fallback).toUpperCase();
  const displayText = textValue(displayName, "");
  if (!displayText) return symbolText;
  if (displayText.toUpperCase().includes(symbolText)) return displayText;
  return `${displayText} ${symbolText}`;
}

function listValue<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function firstNonEmpty<T>(...lists: T[][]): T[] {
  return lists.find((items) => items.length > 0) || [];
}

function riskBadgeClass(level: unknown) {
  const normalized = String(level || "").toLowerCase();
  if (normalized === "high") return "bg-red-500 text-white";
  if (normalized === "medium") return "bg-yellow-400 text-black";
  if (normalized === "low") return "bg-emerald-400 text-black";
  return "bg-zinc-700 text-zinc-200";
}

function relevanceBadgeClass(level: unknown) {
  const normalized = String(level || "LOW").toUpperCase();
  if (normalized === "HIGH") return "border-red-400/50 bg-red-400/10 text-red-300";
  if (normalized === "MEDIUM") return "border-yellow-400/50 bg-yellow-400/10 text-yellow-200";
  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

function impactTextClass(impact: unknown) {
  const normalized = String(impact || "neutral").toLowerCase();
  if (normalized === "positive") return "text-emerald-300";
  if (normalized === "negative") return "text-red-300";
  return "text-zinc-400";
}

function priorityBadgeClass(level: unknown) {
  const normalized = String(level || "LOW").toUpperCase();
  if (normalized === "CRITICAL") return "animate-pulse border-red-400/60 bg-red-500/10 text-red-200";
  if (normalized === "HIGH") return "border-yellow-400/50 bg-yellow-400/10 text-yellow-200";
  if (normalized === "MEDIUM") return "border-yellow-700 bg-yellow-950/20 text-yellow-300";
  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

function priorityRowBorder(level: unknown) {
  const normalized = String(level || "LOW").toUpperCase();
  if (normalized === "CRITICAL") return "border-l-red-500";
  if (normalized === "HIGH") return "border-l-yellow-400";
  if (normalized === "MEDIUM") return "border-l-yellow-700";
  return "border-l-zinc-700";
}

function buildTodayBrief(
  priorityAlerts: NewsArticle[],
  articles: NewsArticle[],
  fcns: FCNDetail[],
  crypto: CryptoPositionResponse[],
  riskLevel: unknown,
) {
  const lines: string[] = [];
  const normalizedRisk = String(riskLevel || "").toLowerCase();
  const highAttention = articles.filter((article) =>
    ["HIGH", "CRITICAL"].includes(String(article.attention_level || "").toUpperCase()),
  );
  const negative = articles.filter((article) => String(article.impact || "").toLowerCase() === "negative");
  const positive = articles.filter((article) => String(article.impact || "").toLowerCase() === "positive");
  const fcnRelated = articles.filter((article) => article.is_fcn_related);
  const riskyFcns = fcns.filter((fcn) =>
    ["high", "medium"].includes(String(fcn.risk_level || "").toLowerCase()),
  );
  const leveragedCrypto = crypto.filter((item) => numberValue(item.leverage, 0) > 1);

  if (normalizedRisk === "high") {
    lines.push("目前組合風險偏高，請優先檢視高優先級事件與 FCN KI/KO 距離。");
  } else if (normalizedRisk === "medium") {
    lines.push("今日組合風險維持中等，建議持續觀察高曝險標的與新聞變化。");
  } else if (normalizedRisk === "low") {
    lines.push("目前組合風險偏低，尚未偵測到急迫性風險升溫。");
  }

  if (priorityAlerts.length > 0) {
    const symbols = priorityAlerts
      .map((alert) => textValue(alert.symbol, ""))
      .filter(Boolean)
      .slice(0, 3)
      .join("、");
    lines.push(`${symbols || "部分持倉"} 出現較高優先級事件，建議先查看 Top Portfolio Alerts。`);
  }

  if (negative.length > positive.length && negative.length > 0) {
    lines.push("今日新聞情緒偏保守，負面事件數量高於正面事件。");
  } else if (positive.length > negative.length && positive.length > 0) {
    lines.push("今日新聞情緒略偏正面，部分持倉出現支撐性消息。");
  } else if (articles.length > 0) {
    lines.push("今日市場情緒偏中性，資訊流仍以觀察型事件為主。");
  }

  if (fcnRelated.length > 0 || riskyFcns.length > 0) {
    lines.push("FCN underlying 相關消息仍需留意，尤其是 worst-of 與 KI/KO 風險變化。");
  }

  if (leveragedCrypto.length > 0) {
    lines.push("Crypto 部位含槓桿或高波動曝險，需留意區間與清算風險。");
  }

  if (highAttention.length > 0 && lines.length < 5) {
    lines.push("部分新聞已進入高注意等級，建議搭配價格變化追蹤。");
  }

  return lines.length > 0 ? lines.slice(0, 5) : ["目前未偵測到重大組合風險事件。"];
}

function conciseIntelligenceInsight(article: NewsArticle) {
  const text = textValue(
    article.ai_summary ||
      article.narrative ||
      article.portfolio_impact_summary ||
      article.impact_reason,
    "",
  );
  if (!text) return "";
  if (text.length <= 90) return text;
  return `${text.slice(0, 90).trimEnd()}...`;
}

function whyItMatters(article: NewsArticle) {
  const text = textValue(
    article.ai_summary ||
      article.narrative ||
      article.portfolio_impact_summary ||
      article.impact_reason,
    "",
  );
  if (!text) return "";
  const limit = /[^\x00-\x7F]/.test(text) ? 70 : 120;
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}...`;
}

function articleAgeMinutes(article: NewsArticle) {
  const publishedAt = textValue(article.published_at, "");
  if (!publishedAt) return null;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / 60000;
}

function articleDecayClass(article: NewsArticle) {
  const age = articleAgeMinutes(article);
  if (age === null) return "opacity-100";
  if (age <= 30) return "opacity-100";
  if (age <= 120) return "opacity-[0.92]";
  if (age > 720) return "opacity-60";
  return "opacity-80";
}

function articleIndicatorClass(article: NewsArticle) {
  const age = articleAgeMinutes(article);
  if (age !== null && age <= 30) return "bg-emerald-400/70";
  return "bg-zinc-800";
}

function articleMetadataClass(article: NewsArticle) {
  const age = articleAgeMinutes(article);
  if (age !== null && age > 720) return "text-zinc-600";
  return "text-zinc-500";
}

function actionType(article: NewsArticle) {
  const title = textValue(article.title, "").toLowerCase();
  const impact = textValue(article.impact, "").toLowerCase();
  const symbol = textValue(article.symbol, "").toLowerCase();
  if (
    impact === "negative" ||
    ["lawsuit", "downgrade", "warning", "weak", "miss"].some((term) =>
      title.includes(term),
    )
  ) {
    return "RISK";
  }
  if (["earnings", "guidance", "revenue"].some((term) => title.includes(term))) {
    return "EVENT";
  }
  if (article.is_fcn_related) return "FCN";
  if (title.includes("volatility") || symbol.includes("btc") || symbol.includes("eth")) {
    return "VOL";
  }
  return "WATCH";
}

function actionTypeClass(type: string) {
  if (type === "RISK") return "text-red-300";
  if (type === "EVENT") return "text-yellow-300";
  if (type === "FCN") return "text-zinc-300";
  if (type === "VOL") return "text-yellow-400";
  return "text-zinc-500";
}

function marketPulseValueClass(value: string) {
  if (value.startsWith("+")) return "text-emerald-300";
  if (value.startsWith("-")) return "text-red-300";
  if (value.includes("HIGH")) return "text-yellow-300";
  if (value.includes("RISK-ON") || value.includes("STABLE")) return "text-emerald-300";
  return "text-zinc-300";
}

function positionMarketValue(position: StockPositionResponse | CryptoPositionResponse) {
  const directValue = numberValue(position.current_value, NaN);
  if (Number.isFinite(directValue) && directValue > 0) return directValue;
  const quantity = numberValue(position.quantity, NaN);
  const price = numberValue(position.current_price, NaN);
  const avgPrice = numberValue(position.avg_price, NaN);
  if (Number.isFinite(quantity) && Number.isFinite(price) && price > 0) {
    return quantity * price;
  }
  if (Number.isFinite(quantity) && Number.isFinite(avgPrice) && avgPrice > 0) {
    return quantity * avgPrice;
  }
  return 0;
}

function buildConcentrationRadar(
  stocks: StockPositionResponse[],
  fcns: FCNDetail[],
  crypto: CryptoPositionResponse[],
  totalValue: unknown,
) {
  const total = numberValue(totalValue, 0);
  const aiChipSymbols = new Set([
    "NVDA",
    "AMD",
    "TSM",
    "TSM.US",
    "2330.TW",
    "AVGO",
    "MRVL",
    "MDB",
    "MSFT",
    "AAPL",
    "PLTR",
    "TSLA",
  ]);
  let aiChipValue = 0;
  let cryptoValue = 0;
  let fcnLinkedValue = 0;
  let topName = "-";
  let topValue = 0;

  for (const stock of stocks) {
    const symbol = textValue(stock.symbol, "").toUpperCase();
    const value = positionMarketValue(stock);
    if (aiChipSymbols.has(symbol)) aiChipValue += value;
    if (value > topValue) {
      topValue = value;
      topName = symbol || "STOCK";
    }
  }

  for (const item of crypto) {
    const symbol = textValue(item.symbol, "").toUpperCase();
    const value = positionMarketValue(item);
    cryptoValue += value;
    if (value > topValue) {
      topValue = value;
      topName = symbol || "CRYPTO";
    }
  }

  for (const fcn of fcns) {
    fcnLinkedValue += numberValue(fcn.notional_amount || fcn.notional, 0);
  }

  const pct = (value: number) => (total > 0 ? `${((value / total) * 100).toFixed(0)}%` : "0%");

  return {
    aiChip: pct(aiChipValue),
    fcnLinked: pct(fcnLinkedValue),
    crypto: pct(cryptoValue),
    topSingle: `${topName} ${pct(topValue)}`,
  };
}

function percentToNumber(value: string) {
  const parsed = Number(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildWatchNow(
  priorityAlerts: NewsArticle[],
  articles: NewsArticle[],
  fcns: FCNDetail[],
  crypto: CryptoPositionResponse[],
  concentration: ReturnType<typeof buildConcentrationRadar>,
) {
  const items: string[] = [];
  const add = (item: string) => {
    if (item && !items.includes(item) && items.length < 4) items.push(item);
  };

  for (const alert of priorityAlerts) {
    const level = textValue(alert.priority_level, "").toUpperCase();
    if (level === "CRITICAL" || level === "HIGH") {
      add(`${textValue(alert.symbol, "Portfolio")} priority event active`);
    }
  }

  for (const article of articles) {
    if (textValue(article.relevance_level, "").toUpperCase() === "HIGH") {
      add(`${textValue(article.symbol, "Asset")} high relevance intelligence`);
    }
    if (article.is_fcn_related) {
      add(`${textValue(article.symbol, "FCN")} FCN underlying needs monitoring`);
    }
    if (textValue(article.impact, "").toLowerCase() === "negative") {
      add(`${textValue(article.symbol, "Asset")} negative impact flow detected`);
    }
  }

  const riskyFcn = fcns.find((fcn) => textValue(fcn.risk_level, "").toLowerCase() === "high");
  if (riskyFcn) {
    add(`${textValue(riskyFcn.worst_underlying || riskyFcn.worst_symbol || riskyFcn.fcn_code, "FCN")} nearing FCN risk zone`);
  }

  const hasCryptoVol = crypto.some((item) => numberValue(item.leverage, 0) > 1);
  if (hasCryptoVol || percentToNumber(concentration.crypto) > 10) {
    add("BTC volatility expanding");
  }

  if (percentToNumber(concentration.aiChip) >= 35) {
    add("AI/chip concentration elevated");
  }

  return items.length > 0 ? items : ["目前未偵測到需要立即處理的決策事件。"];
}

function buildTodayFocus(
  priorityAlerts: NewsArticle[],
  articles: NewsArticle[],
  fcns: FCNDetail[],
  crypto: CryptoPositionResponse[],
  upcomingEvents: string[],
) {
  const critical = priorityAlerts.find(
    (alert) => textValue(alert.priority_level, "").toUpperCase() === "CRITICAL",
  );
  const fcnRisk = fcns.find((fcn) => textValue(fcn.risk_level, "").toLowerCase() === "high");
  const negativeHigh = articles.find(
    (article) =>
      textValue(article.impact, "").toLowerCase() === "negative" &&
      textValue(article.relevance_level, "").toUpperCase() === "HIGH",
  );
  const positiveAi = articles.find((article) => {
    const symbol = textValue(article.symbol, "").toUpperCase();
    return (
      textValue(article.impact, "").toLowerCase() === "positive" &&
      textValue(article.relevance_level, "").toUpperCase() === "HIGH" &&
      ["NVDA", "AMD", "TSM", "2330.TW", "AAPL", "MSFT", "MRVL", "AVGO", "PLTR"].includes(symbol)
    );
  });
  const highAttention = articles.find((article) =>
    ["HIGH", "CRITICAL"].includes(textValue(article.attention_level, "").toUpperCase()),
  );
  const cryptoVol = crypto.some((item) => numberValue(item.leverage, 0) > 1);

  const risk =
    critical
      ? `${textValue(critical.symbol, "Portfolio")} critical alert active`
      : fcnRisk
        ? `${textValue(fcnRisk.worst_underlying || fcnRisk.worst_symbol || fcnRisk.fcn_code, "FCN")} FCN worst-of risk`
        : negativeHigh
          ? `${textValue(negativeHigh.symbol, "Asset")} negative high relevance flow`
          : cryptoVol
            ? "BTC volatility / leverage risk"
            : "No major portfolio focus detected";

  const opportunity =
    positiveAi
      ? `${textValue(positiveAi.symbol, "AI")} positive AI/chip momentum`
      : articles.some((article) => /upgrade|earnings|guidance/i.test(textValue(article.title, "")))
        ? "Earnings / guidance momentum appearing"
        : "No clear opportunity signal";

  const watch =
    highAttention
      ? `${textValue(highAttention.symbol, "Asset")} high attention intelligence`
      : upcomingEvents[0] || "No near-term event window";

  return { risk, opportunity, watch };
}

function buildCommandCenter(
  fcns: FCNDetail[],
  crypto: CryptoPositionResponse[],
  articles: NewsArticle[],
  cash: CashPositionResponse[],
  totalValue: unknown,
) {
  const hasKiRisk = fcns.some((fcn) => {
    const risk = textValue(fcn.risk_level, "").toLowerCase();
    const ki = percentNumber(fcn.distance_to_KI || fcn.distance_to_ki || fcn.distance_to_ki_pct);
    return risk === "high" || (Number.isFinite(ki) && ki < 5);
  });
  const hasFcnWatch = fcns.some((fcn) => ["medium", "high"].includes(textValue(fcn.risk_level, "").toLowerCase()));
  const leveraged = crypto.some((item) => numberValue(item.leverage, 0) > 1);
  const cryptoVol = articles.some((article) => {
    const symbol = textValue(article.symbol, "").toUpperCase();
    return ["BTC", "BTC-USD", "ETH", "ETH-USD"].includes(symbol) && textValue(article.impact, "").toLowerCase() === "negative";
  });
  const aiPositive = articles.filter((article) => {
    const symbol = textValue(article.symbol, "").toUpperCase();
    return ["NVDA", "AMD", "TSM", "2330.TW", "AAPL", "MSFT", "MRVL", "AVGO", "PLTR"].includes(symbol) &&
      textValue(article.impact, "").toLowerCase() === "positive";
  }).length;
  const aiNegative = articles.filter((article) => {
    const symbol = textValue(article.symbol, "").toUpperCase();
    return ["NVDA", "AMD", "TSM", "2330.TW", "AAPL", "MSFT", "MRVL", "AVGO", "PLTR"].includes(symbol) &&
      textValue(article.impact, "").toLowerCase() === "negative";
  }).length;
  const cashValue = cash.reduce((sum, item) => sum + numberValue(item.amount, 0), 0);
  const cashRatio = numberValue(totalValue, 0) > 0 ? cashValue / numberValue(totalValue, 0) : 0;

  return [
    { label: "FCN STATUS", value: hasKiRisk ? "KI RISK" : hasFcnWatch ? "WATCH" : "SAFE" },
    { label: "CRYPTO RISK", value: leveraged ? "LEVERAGED" : cryptoVol ? "HIGH VOL" : "LOW VOL" },
    { label: "AI MOMENTUM", value: aiPositive > aiNegative ? "STRONG" : aiNegative > aiPositive ? "WEAK" : "MIXED" },
    { label: "CASH POSITION", value: cashRatio >= 0.25 ? "DEFENSIVE" : cashRatio >= 0.08 ? "BALANCED" : "DEPLOYABLE" },
  ];
}

function buildRiskDrift(
  concentration: ReturnType<typeof buildConcentrationRadar>,
  criticalCount: number,
  highCount: number,
) {
  const aiChip = percentToNumber(concentration.aiChip);
  const fcnLinked = percentToNumber(concentration.fcnLinked);
  const cryptoPct = percentToNumber(concentration.crypto);

  if (criticalCount > 0 || aiChip >= 45 || fcnLinked >= 35 || cryptoPct >= 20) {
    return {
      direction: "↑",
      label: "Increasing",
      className: "text-red-300",
      summary: "AI、FCN 或高優先級事件正在推升組合風險。",
    };
  }

  if (highCount > 0 || aiChip >= 30 || fcnLinked >= 20 || cryptoPct >= 10) {
    return {
      direction: "→",
      label: "Stable",
      className: "text-yellow-300",
      summary: "目前風險可控，但集中度與事件流仍需追蹤。",
    };
  }

  return {
    direction: "↓",
    label: "Improving",
    className: "text-emerald-300",
    summary: "目前未觀察到明顯風險擴散。",
  };
}

function buildMarketRegime(
  priorityAlerts: NewsArticle[],
  concentration: ReturnType<typeof buildConcentrationRadar>,
  riskLevel: unknown,
) {
  const hasFxnAlert = priorityAlerts.some((article) => article.is_fcn_related);
  const hasRiskAlert = priorityAlerts.some((article) => actionType(article) === "RISK");
  const cryptoPct = percentToNumber(concentration.crypto);
  const aiChip = percentToNumber(concentration.aiChip);
  const risk = textValue(riskLevel, "").toLowerCase();

  if (hasFxnAlert) {
    return {
      label: "FCN RISK WATCH",
      summary: "FCN linked events are active; monitor worst-of and KI/KO sensitivity.",
    };
  }
  if (risk === "high" || hasRiskAlert) {
    return {
      label: "DEFENSIVE / HIGH VOL",
      summary: "Negative event flow is elevated; keep focus on downside risk propagation.",
    };
  }
  if (cryptoPct >= 15) {
    return {
      label: "CRYPTO VOL REGIME",
      summary: "Crypto exposure is meaningful; volatility can dominate short-term risk.",
    };
  }
  if (aiChip >= 35) {
    return {
      label: "RISK-ON AI MOMENTUM",
      summary: "AI/chip exposure is driving portfolio regime and news sensitivity.",
    };
  }
  return {
    label: "MIXED ROTATION",
    summary: "Signal mix is balanced; portfolio regime is not dominated by one theme.",
  };
}

function buildDecisionSignals(
  concentration: ReturnType<typeof buildConcentrationRadar>,
  riskDrift: ReturnType<typeof buildRiskDrift>,
  marketRegime: ReturnType<typeof buildMarketRegime>,
  priorityAlerts: NewsArticle[],
) {
  const signals: string[] = [];
  const add = (signal: string) => {
    if (!signals.includes(signal) && signals.length < 4) signals.push(signal);
  };

  if (riskDrift.direction === "↑") add("DEFENSIVE");
  if (percentToNumber(concentration.aiChip) >= 35) add("RISK-ON");
  if (percentToNumber(concentration.fcnLinked) >= 20 || marketRegime.label.includes("FCN")) add("FCN WATCH");
  if (percentToNumber(concentration.crypto) >= 10 || marketRegime.label.includes("CRYPTO")) add("VOL EXPANSION");
  if (priorityAlerts.length > 0 && signals.length < 4) add("ROTATION");

  return signals.length > 0 ? signals : ["WATCH"];
}

function buildPortfolioHeatmap(articles: NewsArticle[], fcns: FCNDetail[]) {
  const bySymbol = new Map<string, { symbol: string; marker: string; driver: string; score: number }>();
  const put = (symbol: string, marker: string, driver: string, score: number) => {
    const key = symbol.toUpperCase();
    const current = bySymbol.get(key);
    if (!current || score > current.score) {
      bySymbol.set(key, { symbol: key, marker, driver, score });
    }
  };

  for (const article of articles) {
    const symbol = textValue(article.symbol, "");
    if (!symbol) continue;
    const impact = textValue(article.impact, "").toLowerCase();
    const relevance = textValue(article.relevance_level, "").toUpperCase();
    const attention = textValue(article.attention_level, "").toUpperCase();
    if (article.is_fcn_related && (attention === "HIGH" || attention === "CRITICAL")) {
      put(`FCN(${symbol})`, "!!", "FCN WATCH", 5);
    } else if (impact === "positive" && relevance === "HIGH") {
      put(symbol, "↑↑", "AI MOMENTUM", 4);
    } else if (impact === "positive") {
      put(symbol, "↑", "POSITIVE FLOW", 3);
    } else if (impact === "negative") {
      put(symbol, "↓", "RISK FLOW", 3);
    } else {
      put(symbol, "→", "WATCH", 1);
    }
  }

  for (const fcn of fcns) {
    if (textValue(fcn.risk_level, "").toLowerCase() === "high") {
      put(
        `FCN(${textValue(fcn.worst_underlying || fcn.worst_symbol || fcn.fcn_code, "FCN")})`,
        "!!",
        "FCN WORST-OF",
        5,
      );
    }
  }

  return Array.from(bySymbol.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function heatMarkerClass(marker: string) {
  if (marker === "!!") return "text-red-300";
  if (marker === "↓") return "text-red-300";
  if (marker === "↑" || marker === "↑↑") return "text-emerald-300";
  return "text-zinc-400";
}

function daysUntil(value: unknown) {
  const text = textValue(value, "");
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function buildUpcomingEvents(fcns: FCNDetail[]) {
  const next48h = ["CPI release tomorrow", "BTC options expiry Friday"];
  const next7d = ["FOMC minutes this week", "NVDA earnings in 2d"];
  const nextCoupon = fcns
    .map((fcn) => ({
      code: textValue(fcn.fcn_code || fcn.name || fcn.code, "FCN"),
      days: daysUntil(fcn.next_coupon_date),
    }))
    .filter((item): item is { code: string; days: number } => item.days !== null && item.days >= 0)
    .sort((a, b) => a.days - b.days)[0];

  if (nextCoupon) {
    const event = `${nextCoupon.code} coupon in ${nextCoupon.days}d`;
    if (nextCoupon.days <= 2) {
      next48h.unshift(event);
    } else {
      next7d.unshift(event);
    }
  } else {
    next7d.unshift("FCN coupon window pending");
  }

  return { next48h: next48h.slice(0, 4), next7d: next7d.slice(0, 4) };
}

function allocationLabel(item: AllocationItem) {
  const labels: Record<string, string> = {
    stock: "Stocks",
    fcn: "FCN",
    crypto: "Crypto",
    cash: "Cash",
  };
  return labels[item.asset_class] || item.asset_class;
}

function allocationAccent(assetClass: string) {
  if (assetClass === "stock") return "bg-zinc-400";
  if (assetClass === "fcn") return "bg-red-400";
  if (assetClass === "crypto") return "bg-yellow-400";
  if (assetClass === "cash") return "bg-emerald-400";
  return "bg-zinc-400";
}

function severityClass(alert: AlertItem) {
  const severity = String(alert.severity || alert.level || "").toLowerCase();
  if (severity === "high" || severity === "critical") return "border-red-500/60";
  if (severity === "medium") return "border-yellow-400/60";
  return "border-emerald-400/50";
}

function underlyingsText(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "-";

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const symbols = parsed
        .map((item) =>
          typeof item === "object" && item !== null && "symbol" in item
            ? String(item.symbol || "").trim().toUpperCase()
            : "",
        )
        .filter(Boolean);
      return symbols.length > 0 ? symbols.join(", ") : value;
    }
  } catch {
    return value;
  }

  return value;
}

function positionCardClass() {
  return "rounded-xl border border-zinc-800 bg-zinc-900 p-4";
}

function priceSource(value: unknown) {
  const source = textValue(value, "");
  return source ? `source: ${source}` : "";
}

function priceBadgeLabel(source: unknown, isStale: unknown, isInputEstimate = false) {
  if (isStale === true) return "STALE";
  if (isInputEstimate) return "INPUT";

  const normalized = textValue(source, "").toLowerCase();
  if (normalized.includes("yahoo") || normalized.includes("binance")) return "LIVE";
  if (normalized.includes("stored") || normalized.includes("manual")) return "STORED";
  if (normalized.includes("stale")) return "STALE";
  return "UNKNOWN";
}

function priceBadgeClass(label: string) {
  if (label === "LIVE") return "border-emerald-400/50 bg-emerald-400/10 text-emerald-300";
  if (label === "STALE") return "border-yellow-400/50 bg-yellow-400/10 text-yellow-200";
  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

function PriceSourceBadge({
  source,
  isStale,
  inputEstimate = false,
}: {
  source: unknown;
  isStale?: unknown;
  inputEstimate?: boolean;
}) {
  const label = priceBadgeLabel(source, isStale, inputEstimate);
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priceBadgeClass(label)}`}
    >
      {label}
    </span>
  );
}

function formatDateTime(value: unknown) {
  const text = textValue(value, "");
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function positionKey(item: FCNDetail) {
  return textValue(
    item.fcn_id || item.id || item.fcn_code || item.code || item.name,
    "",
  ).toUpperCase();
}

function mergeFcnDetails(
  analyses: FCNDetail[],
  positions: FCNDetail[],
  summaries: FCNDetail[],
  raw: FCNDetail[],
) {
  const byKey = new Map<string, FCNDetail>();

  for (const item of [...positions, ...summaries, ...raw]) {
    const key = positionKey(item);
    if (key) {
      byKey.set(key, { ...byKey.get(key), ...item });
    }
  }

  for (const analysis of analyses) {
    const key = positionKey(analysis);
    if (key) {
      byKey.set(key, { ...byKey.get(key), ...analysis });
    } else {
      byKey.set(`analysis-${byKey.size}`, analysis);
    }
  }

  return Array.from(byKey.values());
}

function cryptoCurrentValue(item: CryptoPositionResponse) {
  const storedValue = numberValue(item.current_value, NaN);
  if (Number.isFinite(storedValue) && storedValue > 0) return money(storedValue);

  const currentPrice = numberValue(item.current_price, NaN);
  const avgPrice = numberValue(item.avg_price, NaN);
  const quantity = numberValue(item.quantity, NaN);

  if (Number.isFinite(currentPrice) && currentPrice > 0 && Number.isFinite(quantity)) {
    return money(currentPrice * quantity);
  }

  if (Number.isFinite(avgPrice) && avgPrice > 0 && Number.isFinite(quantity)) {
    return money(avgPrice * quantity);
  }

  return "待更新";
}

function cryptoPriceSource(item: CryptoPositionResponse) {
  const currentPrice = numberValue(item.current_price, NaN);
  const avgPrice = numberValue(item.avg_price, NaN);
  if ((!Number.isFinite(currentPrice) || currentPrice <= 0) && avgPrice > 0) {
    return "source: input estimate";
  }
  return priceSource(item.price_source);
}

function fcnUnderlyingList(fcn: FCNDetail) {
  return firstNonEmpty(
    listValue(fcn.underlying_results),
    listValue(fcn.prices),
  );
}

function fcnUnderlyingsLabel(fcn: FCNDetail) {
  const results = fcnUnderlyingList(fcn);
  if (results.length > 0) {
    return results.map((item) => textValue(item.symbol, "")).filter(Boolean).join(", ");
  }
  if (Array.isArray(fcn.symbols) && fcn.symbols.length > 0) {
    return fcn.symbols.join(", ");
  }
  return textValue(
    fcn.worst_symbol || fcn.worst_of,
    underlyingsText(fcn.underlyings),
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-800/80 ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-9 w-72" />
            <SkeletonBlock className="h-5 w-52" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SkeletonBlock className="h-12 w-28" />
            <SkeletonBlock className="h-12 w-36" />
            <SkeletonBlock className="h-12 w-24" />
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
              key={item}
            >
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="mt-4 h-9 w-36" />
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
              key={item}
            >
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-3 w-3 rounded-full" />
              </div>
              <SkeletonBlock className="mt-4 h-8 w-28" />
              <SkeletonBlock className="mt-4 h-2 w-full" />
              <SkeletonBlock className="mt-3 h-4 w-14" />
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <SkeletonBlock className="h-6 w-36" />
            <SkeletonBlock className="mt-5 h-24 w-full" />
            <SkeletonBlock className="mt-4 h-20 w-full" />
            <SkeletonBlock className="mt-3 h-20 w-full" />
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <SkeletonBlock className="h-6 w-28" />
            <SkeletonBlock className="mt-5 h-40 w-full" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardState | null>(null);
  const dataRef = useRef<DashboardState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState("");
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [priorityError, setPriorityError] = useState("");
  const [expandedFcnKey, setExpandedFcnKey] = useState<string | null>(null);
  const [visibleNewsCount, setVisibleNewsCount] = useState(6);

  const loadPortfolioNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError("");

    try {
      const news = await getPortfolioNews();
      setData((current) => {
        if (!current) return current;
        const nextData = { ...current, news };
        dataRef.current = nextData;
        return nextData;
      });
    } catch (err) {
      setNewsError(err instanceof Error ? err.message : "Failed to load intelligence feed");
    } finally {
      setNewsLoading(false);
    }
  }, []);

  const loadPortfolioPriority = useCallback(async () => {
    setPriorityLoading(true);
    setPriorityError("");

    try {
      const priority = await getPortfolioPriority();
      setData((current) => {
        if (!current) return current;
        const nextData = { ...current, priority };
        dataRef.current = nextData;
        return nextData;
      });
    } catch (err) {
      setPriorityError(err instanceof Error ? err.message : "Failed to load priority alerts");
    } finally {
      setPriorityLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async (showLoading = false) => {
    const hasExistingData = Boolean(dataRef.current);

    if (showLoading || !hasExistingData) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      setError("");
      const newsPromise = getPortfolioNews()
        .then((news) => ({ news, error: "" }))
        .catch((err) => ({
          news: null,
          error: err instanceof Error ? err.message : "Failed to load intelligence feed",
        }));
      const priorityPromise = getPortfolioPriority()
        .then((priority) => ({ priority, error: "" }))
        .catch((err) => ({
          priority: null,
          error: err instanceof Error ? err.message : "Failed to load priority alerts",
        }));
      const [
        summary,
        allocation,
        risk,
        stocks,
        fcns,
        crypto,
        cash,
        newsResult,
        priorityResult,
      ] =
        await Promise.all([
        getMySummary(),
        getMyAssetAllocation(),
        getMyRiskOverview(),
        getStocks(),
        getFcns(),
        getCrypto(),
        getCash(),
        newsPromise,
        priorityPromise,
      ]);
      const nextData = {
        summary,
        allocation,
        risk,
        stocks: Array.isArray(stocks) ? stocks : [],
        fcns: Array.isArray(fcns) ? fcns : [],
        crypto: Array.isArray(crypto) ? crypto : [],
        cash: Array.isArray(cash) ? cash : [],
        news: newsResult.news,
        priority: priorityResult.priority,
      };
      setNewsError(newsResult.error);
      setPriorityError(priorityResult.error);
      dataRef.current = nextData;
      setData(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard 載入失敗。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    function refreshOnFocus() {
      if (getToken()) {
        void loadDashboard(false);
      }
    }

    const initialLoad = window.setTimeout(() => {
      void loadDashboard(false);
    }, 0);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadDashboard, router]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  if (loading && !data) return <DashboardSkeleton />;

  if (error && !data) {
    return (
      <main className="min-h-screen bg-black px-5 py-8 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
          <div className="w-full rounded-2xl border border-red-500/50 bg-red-500/10 p-8 text-center shadow-xl shadow-red-950/20">
            <div className="text-sm font-semibold uppercase tracking-wide text-red-300">
              Dashboard Error
            </div>
            <h1 className="mt-3 text-2xl font-bold text-white">
              Failed to load dashboard
            </h1>
            <p className="mt-3 text-sm leading-6 text-red-100">{error}</p>
            <button
              className="mt-6 rounded-xl border border-red-300/60 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"
              onClick={() => void loadDashboard(true)}
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const allocationItems = listValue(data.allocation.items);
  const decisionCards = listValue(data.risk.decision_cards);
  const alerts = listValue(data.risk.alerts);
  const stocks = firstNonEmpty(
    listValue(data.summary.stock_positions),
    listValue(data.summary.stocks),
    listValue(data.stocks),
  );
  const fcns = mergeFcnDetails(
    listValue(data.summary.fcn_analysis),
    listValue(data.summary.fcn_positions),
    listValue(data.summary.fcn_summary),
    listValue(data.fcns),
  );
  const crypto = firstNonEmpty(
    listValue(data.summary.crypto_positions),
    listValue(data.crypto),
  );
  const cash = firstNonEmpty(
    listValue(data.summary.cash_summary),
    listValue(data.cash),
  );
  const allNewsArticles = listValue(data.news?.articles);
  const newsArticles = allNewsArticles.slice(0, visibleNewsCount);
  const priorityAlerts = listValue(data.priority?.top_alerts);
  const topPriorityAlerts = priorityAlerts.slice(0, 3);
  const criticalCount = numberValue(data.priority?.critical_count, 0);
  const highCount = numberValue(data.priority?.high_count, 0);
  const riskLevel = data.risk.risk_level || data.summary.risk_level || "unknown";
  const totalValue = data.summary.total_value ?? data.allocation.total_value;
  const hasPortfolioAssets =
    stocks.length > 0 ||
    fcns.length > 0 ||
    crypto.length > 0 ||
    cash.length > 0;
  const todayBriefLines = buildTodayBrief(
    priorityAlerts,
    allNewsArticles,
    fcns,
    crypto,
    riskLevel,
  );
  const marketPulse = [
    { label: "SPX", value: "+0.4%" },
    { label: "NASDAQ", value: "+1.1%" },
    { label: "BTC", value: "-2.4%" },
    { label: "ETH", value: "-1.8%" },
    { label: "VIX", value: "18.2" },
    { label: "USD/TWD", value: "32.38" },
    { label: "AI SENTIMENT", value: "RISK-ON" },
    { label: "FCN TEMP", value: "STABLE" },
    { label: "CRYPTO VOL", value: "HIGH" },
  ];
  const concentrationRadar = buildConcentrationRadar(stocks, fcns, crypto, totalValue);
  const watchNowItems = buildWatchNow(
    priorityAlerts,
    allNewsArticles,
    fcns,
    crypto,
    concentrationRadar,
  );
  const riskDrift = buildRiskDrift(concentrationRadar, criticalCount, highCount);
  const marketRegime = buildMarketRegime(priorityAlerts, concentrationRadar, riskLevel);
  const heatmapRows = buildPortfolioHeatmap(allNewsArticles, fcns);
  const upcomingEvents = buildUpcomingEvents(fcns);
  const todayFocus = buildTodayFocus(
    priorityAlerts,
    allNewsArticles,
    fcns,
    crypto,
    [...upcomingEvents.next48h, ...upcomingEvents.next7d],
  );
  const commandCenter = buildCommandCenter(fcns, crypto, allNewsArticles, cash, totalValue);
  const decisionSignals = buildDecisionSignals(
    concentrationRadar,
    riskDrift,
    marketRegime,
    priorityAlerts,
  );

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase text-emerald-400">
              IXAI Agent / 一玄AI
            </div>
            <h1 className="mt-2 text-3xl font-bold">Portfolio Dashboard</h1>
            <p className="mt-2 text-zinc-400">
              {textValue(data.summary.portfolio_name || data.allocation.portfolio_name)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {refreshing && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                Refreshing
              </div>
            )}
            <button
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900 md:w-auto"
              onClick={() => router.push("/import")}
              type="button"
            >
              Import CSV
            </button>
            <button
              className="w-full rounded-xl border border-emerald-400/50 px-4 py-3 text-center text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10 md:w-auto"
              onClick={() => router.push("/input")}
              type="button"
            >
              新增資產 / Add Asset
            </button>
            <button
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900 md:w-auto"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold text-white">Failed to load dashboard</div>
                <div className="mt-1 text-red-100/80">{error}</div>
              </div>
              <button
                className="rounded-xl border border-red-300/60 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"
                onClick={() => void loadDashboard(false)}
                type="button"
              >
                Retry
              </button>
            </div>
          </section>
        )}

        {!hasPortfolioAssets && (
          <section className="rounded-2xl border border-dashed border-emerald-400/50 bg-emerald-400/10 p-8 text-center shadow-xl shadow-emerald-950/10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/40 bg-black/30 text-3xl">
              +
            </div>
            <h2 className="mt-5 text-2xl font-bold text-white">
              No portfolio positions yet
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-300">
              Add positions manually or import a CSV portfolio template.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                className="rounded-xl border border-emerald-400/60 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/10"
                href="/input"
              >
                Go to Input
              </Link>
              <Link
                className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900"
                href="/import"
              >
                Go to Import
              </Link>
            </div>
          </section>
        )}

        <section className="overflow-hidden border-y border-zinc-800 bg-black/20 py-2 font-mono text-[11px] uppercase tracking-wide">
          <div className="flex gap-5 overflow-x-auto whitespace-nowrap">
            <span className="shrink-0 text-zinc-500">Market Pulse</span>
            {marketPulse.map((item) => (
              <span className="shrink-0" key={item.label}>
                <span className="text-zinc-500">{item.label}</span>{" "}
                <span className={marketPulseValueClass(item.value)}>{item.value}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="border-y border-zinc-800 bg-black/25 px-3 py-2 font-mono text-xs">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
            Today Focus
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="min-w-0">
              <span className="text-red-300">RISK:</span>{" "}
              <span className="text-zinc-300">{todayFocus.risk}</span>
            </div>
            <div className="min-w-0">
              <span className="text-emerald-300">OPPORTUNITY:</span>{" "}
              <span className="text-zinc-300">{todayFocus.opportunity}</span>
            </div>
            <div className="min-w-0">
              <span className="text-yellow-300">WATCH:</span>{" "}
              <span className="text-zinc-300">{todayFocus.watch}</span>
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-800 bg-black/20 py-2 font-mono text-xs">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {commandCenter.map((item) => (
              <div className="flex items-center justify-between gap-3" key={item.label}>
                <span className="text-zinc-500">{item.label}</span>
                <span className="font-semibold text-zinc-200">{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <div className="text-sm text-zinc-400">Total Value</div>
            <div className="mt-2 text-3xl font-bold">{money(totalValue)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <div className="text-sm text-zinc-400">Risk Level</div>
            <div className="mt-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold uppercase ${riskBadgeClass(riskLevel)}`}
              >
                {textValue(riskLevel)}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <div className="text-sm text-zinc-400">Risk Score</div>
            <div className="mt-2 text-3xl font-bold text-emerald-300">
              {textValue(data.risk.risk_score, "0")}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {allocationItems.map((item) => (
            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
              key={item.asset_class}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">{allocationLabel(item)}</div>
                <div className={`h-2.5 w-2.5 rounded-full ${allocationAccent(item.asset_class)}`} />
              </div>
              <div className="mt-3 text-2xl font-bold">{money(item.value)}</div>
              <div className="mt-3 h-2 rounded-full bg-zinc-800">
                <div
                  className={`h-2 rounded-full ${allocationAccent(item.asset_class)}`}
                  style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                {item.percentage.toFixed(2)}%
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Today&apos;s IXAI Brief</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Rule-based portfolio brief from alerts, FCN risk and intelligence flow.
              </p>
            </div>
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              live portfolio context
            </span>
          </div>
          <div className="mt-3 border-l border-zinc-700 bg-black/30 px-3 py-2 font-mono text-xs leading-6 text-zinc-300">
            {todayBriefLines.map((line, index) => (
              <div className="flex gap-3" key={`${line}-${index}`}>
                <span className="shrink-0 text-emerald-400">{">"}</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-l border-yellow-500/50 bg-black/20 px-3 py-2 font-mono text-xs">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
            WATCH NOW
          </div>
          <div className="grid gap-1.5 md:grid-cols-2">
            {watchNowItems.map((item) => (
              <div className="flex min-w-0 gap-2 text-zinc-300" key={item}>
                <span className="shrink-0 text-yellow-300">•</span>
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="border-y border-zinc-800 bg-black/20 px-3 py-2 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-500">RISK DRIFT</span>
              <span className={`font-semibold ${riskDrift.className}`}>
                {riskDrift.direction} {riskDrift.label}
              </span>
            </div>
            <div className="mt-1 text-zinc-400">{riskDrift.summary}</div>
          </div>
          <div className="border-y border-zinc-800 bg-black/20 px-3 py-2 font-mono text-xs">
            <div className="text-zinc-500">MARKET REGIME:</div>
            <div className="mt-1 font-semibold text-zinc-200">{marketRegime.label}</div>
            <div className="mt-1 text-zinc-400">{marketRegime.summary}</div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Top Portfolio Alerts</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Highest priority events across holdings and FCN underlyings.
              </p>
            </div>
            <button
              className="w-fit rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900"
              disabled={priorityLoading}
              onClick={() => void loadPortfolioPriority()}
              type="button"
            >
              {priorityLoading ? "Loading" : "Retry"}
            </button>
          </div>

          <div className="mt-3 text-sm text-zinc-400">
            {priorityLoading && !data.priority ? (
              <div className="text-zinc-400">Loading priority alerts...</div>
            ) : priorityError ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-yellow-200">Failed to load priority alerts</div>
                <button
                  className="w-fit rounded-lg border border-yellow-400/50 px-3 py-2 text-xs font-semibold text-yellow-100 transition hover:bg-yellow-400/10"
                  onClick={() => void loadPortfolioPriority()}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : criticalCount > 0 ? (
              <div>{criticalCount} Critical Alert{criticalCount > 1 ? "s" : ""}</div>
            ) : highCount > 0 ? (
              <div>{highCount} High Priority Event{highCount > 1 ? "s" : ""}</div>
            ) : (
              <div>No critical portfolio alerts</div>
            )}
          </div>

          {!priorityError && !priorityLoading && topPriorityAlerts.length === 0 && (
            <div className="mt-3 rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
              No critical portfolio alerts
            </div>
          )}

          {topPriorityAlerts.length > 0 && (
            <div className="mt-3 divide-y divide-zinc-800 overflow-hidden border border-zinc-800">
              {topPriorityAlerts.map((alert, index) => {
                const type = actionType(alert);

                return (
                <article
                  className={`border-l-4 bg-black/20 px-3 py-2 ${priorityRowBorder(alert.priority_level)}`}
                  key={`${textValue(alert.link || alert.title, "priority")}-${index}`}
                >
                  <div className="grid gap-1.5 md:grid-cols-[auto_auto_auto_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] md:items-center">
                    <span
                      className={`w-fit rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${priorityBadgeClass(alert.priority_level)}`}
                    >
                      {textValue(alert.priority_level, "LOW")}
                    </span>
                    <span className={`w-fit font-mono text-[11px] font-semibold ${actionTypeClass(type)}`}>
                      [{type}]
                    </span>
                    <span className="w-fit font-mono text-xs font-semibold text-emerald-300">
                      {textValue(alert.symbol, "NEWS")}
                    </span>
                    <h3 className="min-w-0 truncate text-sm font-semibold text-zinc-100">
                      {textValue(alert.title, "Untitled alert")}
                    </h3>
                    <p className="min-w-0 truncate text-xs text-zinc-400">
                      {textValue(alert.alert_summary, "此事件可能影響相關持倉，建議持續觀察。")}
                    </p>
                    <span className="text-xs text-zinc-500">
                      {formatDateTime(alert.published_at)}
                    </span>
                    {alert.link && (
                      <a
                        className="text-xs font-semibold text-zinc-400 transition hover:text-emerald-300"
                        href={alert.link}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        View
                      </a>
                    )}
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-y border-zinc-800 bg-black/20 px-3 py-2 font-mono text-xs">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
            Decision Signals
          </div>
          <div className="flex flex-wrap gap-2">
            {decisionSignals.map((signal) => (
              <span className="text-zinc-300" key={signal}>
                [{signal}]
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Portfolio Intelligence Stream</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Compact market flow related to your holdings and FCN underlyings.
              </p>
            </div>
            <button
              className="w-fit rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900"
              disabled={newsLoading}
              onClick={() => void loadPortfolioNews()}
              type="button"
            >
              {newsLoading ? "Loading" : "Retry"}
            </button>
          </div>

          <div className="mt-3 border-y border-zinc-800 bg-black/20 py-2 text-xs text-zinc-400">
            {newsLoading && !data.news ? (
              <div className="text-zinc-400">Loading intelligence feed...</div>
            ) : newsError ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-yellow-200">Failed to load intelligence feed</div>
                <button
                  className="w-fit rounded-lg border border-yellow-400/50 px-3 py-2 text-xs font-semibold text-yellow-100 transition hover:bg-yellow-400/10"
                  onClick={() => void loadPortfolioNews()}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>{textValue(data.news?.summary, "No portfolio news found yet")}</div>
                {data.news?.fetched_at && (
                  <div className="text-xs text-zinc-500">
                    fetched {formatDateTime(data.news.fetched_at)}
                  </div>
                )}
              </div>
            )}
          </div>

          {!newsError && !newsLoading && allNewsArticles.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">
              No portfolio news found yet
            </div>
          )}

          {newsArticles.length > 0 && (
            <div className="mt-3 divide-y divide-zinc-800 overflow-hidden border border-zinc-800">
              {newsArticles.map((article: NewsArticle, index) => {
                const insight = conciseIntelligenceInsight(article);
                const why = whyItMatters(article);
                const metadataClass = articleMetadataClass(article);

                return (
                <article
                  className={`relative bg-black/20 px-3 py-2.5 pl-5 transition hover:bg-zinc-900/50 ${articleDecayClass(article)}`}
                  key={`${textValue(article.link || article.title, "news")}-${index}`}
                >
                  <span
                    className={`absolute left-0 top-0 h-full w-1 ${articleIndicatorClass(article)}`}
                  />
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                      {textValue(article.symbol, "NEWS")}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${relevanceBadgeClass(article.relevance_level)}`}
                    >
                      {textValue(article.relevance_level, "LOW")}
                    </span>
                    <span
                      className={`text-xs font-semibold capitalize ${impactTextClass(article.impact)}`}
                    >
                      {textValue(article.impact, "neutral")}
                    </span>
                    {article.is_fcn_related && (
                      <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                        FCN
                      </span>
                    )}
                    <h3 className="min-w-0 flex-1 text-sm font-semibold leading-5 text-zinc-100 md:truncate">
                      {textValue(article.title, "Untitled news")}
                    </h3>
                  </div>
                  {insight && (
                    <p className="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-zinc-400">
                      {insight}
                    </p>
                  )}
                  {why && (
                    <p className="mt-1 max-h-10 overflow-hidden font-mono text-[11px] leading-5 text-zinc-500">
                      <span className="text-zinc-600">WHY IT MATTERS:</span>{" "}
                      {why}
                    </p>
                  )}

                  <div className={`mt-1.5 flex flex-wrap items-center gap-2 text-[11px] ${metadataClass}`}>
                    <span>{textValue(article.publisher, "Unknown publisher")}</span>
                    <span>·</span>
                    <span>{formatDateTime(article.published_at)}</span>
                    <span>·</span>
                    <span>{textValue(article.source, "yfinance")}</span>
                    {article.link && (
                      <a
                        className="font-semibold text-zinc-400 transition hover:text-emerald-300"
                        href={article.link}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        View link ↗
                      </a>
                    )}
                  </div>
                </article>
                );
              })}
            </div>
          )}

          {allNewsArticles.length > 6 && !newsError && (
            <div className="mt-4 flex justify-center">
              {visibleNewsCount < allNewsArticles.length ? (
                <button
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900"
                  onClick={() =>
                    setVisibleNewsCount((current) =>
                      Math.min(current + 6, allNewsArticles.length),
                    )
                  }
                  type="button"
                >
                  Load More
                </button>
              ) : (
                <button
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900"
                  onClick={() => setVisibleNewsCount(6)}
                  type="button"
                >
                  Show Less
                </button>
              )}
            </div>
          )}
        </section>

        <section className="border-y border-zinc-800 bg-black/20 py-3 font-mono text-xs">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
            Portfolio Concentration
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-zinc-500">AI/CHIP:</span>{" "}
              <span className="text-zinc-200">{concentrationRadar.aiChip}</span>
            </div>
            <div>
              <span className="text-zinc-500">FCN-LINKED:</span>{" "}
              <span className="text-zinc-200">{concentrationRadar.fcnLinked}</span>
            </div>
            <div>
              <span className="text-zinc-500">CRYPTO:</span>{" "}
              <span className="text-zinc-200">{concentrationRadar.crypto}</span>
            </div>
            <div>
              <span className="text-zinc-500">TOP SINGLE:</span>{" "}
              <span className="text-zinc-200">{concentrationRadar.topSingle}</span>
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-800 bg-black/20 py-3 font-mono text-xs">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
            Portfolio Heatmap
          </div>
          {heatmapRows.length === 0 ? (
            <div className="text-zinc-500">No heated positions detected.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[520px] divide-y divide-zinc-800 border border-zinc-800">
                <div className="grid grid-cols-[1fr_0.6fr_1.4fr] gap-3 px-3 py-1.5 text-[10px] uppercase tracking-wide text-zinc-600">
                  <div>Symbol</div>
                  <div>State</div>
                  <div>Driver</div>
                </div>
                {heatmapRows.map((row) => (
                  <div
                    className="grid grid-cols-[1fr_0.6fr_1.4fr] gap-3 px-3 py-1.5"
                    key={row.symbol}
                  >
                    <span className="truncate text-zinc-300">{row.symbol}</span>
                    <span className={`font-semibold ${heatMarkerClass(row.marker)}`}>
                      {row.marker}
                    </span>
                    <span className="truncate text-zinc-500">{row.driver}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <h2 className="text-xl font-semibold">Risk Overview</h2>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
              <div className="text-sm text-zinc-400">Top Risk</div>
              <div className="mt-2 text-lg font-semibold text-red-300">
                {textValue(data.risk.top_risk || data.summary.top_risk, "No major risk")}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {decisionCards.map((card: DecisionCard, index) => (
                <div
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                  key={`${textValue(card.title, "decision")}-${index}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-white">
                      {textValue(card.title, "Decision")}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${riskBadgeClass(card.level)}`}
                    >
                      {textValue(card.level, "info")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {textValue(card.message)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <h2 className="text-xl font-semibold">AI Advice</h2>
            <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-7 text-zinc-200">
              {textValue(data.risk.ai_advice || data.summary.ai_advice, "No advice available.")}
            </p>
          </div>
        </section>

        <section className="border-y border-zinc-800 bg-black/20 py-3 font-mono text-xs">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
            Upcoming Events
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">
                NEXT 48H
              </div>
              <div className="grid gap-1.5">
                {upcomingEvents.next48h.map((event) => (
                  <div className="flex gap-2 text-zinc-300" key={event}>
                    <span className="text-zinc-500">•</span>
                    <span>{event}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">
                NEXT 7D
              </div>
              <div className="grid gap-1.5">
                {upcomingEvents.next7d.map((event) => (
                  <div className="flex gap-2 text-zinc-300" key={event}>
                    <span className="text-zinc-500">•</span>
                    <span>{event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">FCN Risk Monitor</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Worst-of、KI/KO distance 與到期監控。
              </p>
            </div>
            <span className="w-fit rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-400">
              {fcns.length} FCN
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[1.4fr_1fr_0.8fr_1fr_0.9fr_0.9fr_0.8fr_1fr_0.7fr] gap-3 bg-zinc-900 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <div>FCN</div>
                <div>Notional</div>
                <div>Risk</div>
                <div>Worst-of</div>
                <div>KI Distance</div>
                <div>KO Distance</div>
                <div>Days</div>
                <div>Next Coupon</div>
                <div>Expand</div>
              </div>

              {fcns.length === 0 && (
                <div className="px-4 py-5 text-sm text-zinc-400">
                  No FCN positions yet.
                </div>
              )}

              {fcns.map((fcn, index) => {
                const key = positionKey(fcn) || `fcn-${index}`;
                const expanded = expandedFcnKey === key;
                const kiDistance =
                  fcn.distance_to_KI || fcn.distance_to_ki || fcn.distance_to_ki_pct;
                const koDistance =
                  fcn.distance_to_KO || fcn.distance_to_ko || fcn.distance_to_ko_pct;
                const worstOf = textValue(
                  fcn.worst_underlying || fcn.worst_symbol || fcn.worst_of,
                );

                return (
                  <div className="border-t border-zinc-800" key={key}>
                    <button
                      className={`grid w-full grid-cols-[1.4fr_1fr_0.8fr_1fr_0.9fr_0.9fr_0.8fr_1fr_0.7fr] gap-3 px-4 py-3 text-left text-sm transition ${
                        expanded ? "bg-emerald-400/5" : "bg-black/20 hover:bg-zinc-900/70"
                      }`}
                      onClick={() => setExpandedFcnKey(expanded ? null : key)}
                      type="button"
                    >
                      <div className="font-semibold text-white">
                        {textValue(fcn.fcn_code || fcn.name || fcn.code, "FCN")}
                      </div>
                      <div className="text-zinc-300">{money(fcn.notional_amount || fcn.notional)}</div>
                      <div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${riskBadgeClass(fcn.risk_level)}`}
                        >
                          {textValue(fcn.risk_level, "unknown")}
                        </span>
                      </div>
                      <div className="text-zinc-300">{worstOf}</div>
                      <div className={`font-semibold ${kiDistanceClass(kiDistance)}`}>
                        {percentValue(kiDistance)}
                      </div>
                      <div className="text-zinc-300">{percentValue(koDistance)}</div>
                      <div className="text-zinc-300">{textValue(fcn.days_to_maturity)}</div>
                      <div className="text-zinc-300">{textValue(fcn.next_coupon_date)}</div>
                      <div className="font-semibold text-emerald-300">
                        {expanded ? "Hide" : "Open"}
                      </div>
                    </button>

                    {expanded && (
                      <div className="bg-black/30 px-4 pb-4 pt-1">
                        <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300 md:grid-cols-2">
                          <div>Issuer: {textValue(fcn.issuer)}</div>
                          <div>
                            Tenor: {tenorText(fcn.tenor_months)} · Currency:{" "}
                            {textValue(fcn.settlement_currency)}
                          </div>
                          <div>Maturity: {textValue(fcn.maturity_date)}</div>
                          <div>Next observation: {textValue(fcn.next_observation_date)}</div>
                        </div>

                        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
                          <div className="grid grid-cols-4 gap-3 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase text-zinc-500">
                            <div>Symbol</div>
                            <div>Current</div>
                            <div>Performance</div>
                            <div>Source</div>
                          </div>
                          {fcnUnderlyingList(fcn).length === 0 && (
                            <div className="px-3 py-3 text-sm text-zinc-400">
                              Underlyings: {fcnUnderlyingsLabel(fcn)}
                            </div>
                          )}
                          {fcnUnderlyingList(fcn).map((underlying, underlyingIndex) => (
                            <div
                              className="grid grid-cols-4 gap-3 border-t border-zinc-800 px-3 py-2 text-sm text-zinc-300"
                              key={`${textValue(underlying.symbol, "underlying")}-${underlyingIndex}`}
                            >
                              <div className="font-semibold text-white">
                                {textValue(underlying.symbol, "UNDERLYING")}
                              </div>
                              <div>{priceMoney(underlying.current_price)}</div>
                              <div>
                                {percentValue(
                                  underlying.performance ||
                                    underlying.distance_to_KI ||
                                    underlying.distance_to_ki_pct,
                                )}
                              </div>
                      <div className="text-zinc-500">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{textValue(underlying.price_source, "-")}</span>
                                  <PriceSourceBadge
                                    isStale={underlying.is_stale}
                                    source={underlying.price_source}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
          <h2 className="text-xl font-semibold">持倉明細 / Positions</h2>
          <div className="mt-4 grid gap-4 xl:grid-cols-4">
            <div className={positionCardClass()}>
              <h3 className="font-semibold text-white">Stocks</h3>
              <div className="mt-4 grid gap-3">
                {stocks.length === 0 && (
                  <div className="text-sm text-zinc-400">尚無股票部位</div>
                )}
                {stocks.map((stock, index) => (
                  <div
                    className="rounded-lg border border-zinc-800 bg-black/30 p-3"
                    key={`${textValue(stock.id || stock.symbol, "stock")}-${index}`}
                  >
                    <div className="font-semibold text-white">
                      {assetDisplayName(stock.display_name, stock.symbol, "STOCK")}
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-zinc-300">
                      <div>Quantity: {textValue(stock.quantity, "0")}</div>
                      <div>Avg Price: {priceMoney(stock.avg_price)}</div>
                      <div>Current Price: {priceMoney(stock.current_price)}</div>
                      <div>Current Value: {money(stock.current_value)}</div>
                      {priceSource(stock.price_source) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span>{priceSource(stock.price_source)}</span>
                          <PriceSourceBadge
                            isStale={stock.is_stale}
                            source={stock.price_source}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={positionCardClass()}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">FCN</h3>
                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                  {fcns.length}
                </span>
              </div>
              <div className="mt-4 rounded-lg border border-zinc-800 bg-black/30 p-3">
                {fcns.length === 0 ? (
                  <div className="text-sm text-zinc-400">尚無 FCN 部位</div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-zinc-300">
                      {fcns.length} FCN positions · Exposure{" "}
                      {money(
                        fcns.reduce(
                          (sum, fcn) =>
                            sum + numberValue(fcn.notional_amount || fcn.notional, 0),
                          0,
                        ),
                      )}
                    </div>
                    <div className="text-xs leading-5 text-zinc-500">
                      See FCN Risk Monitor for worst-of, KI/KO distance and underlying
                      details.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={positionCardClass()}>
              <h3 className="font-semibold text-white">Crypto</h3>
              <div className="mt-4 grid gap-3">
                {crypto.length === 0 && (
                  <div className="text-sm text-zinc-400">尚無 Crypto 部位</div>
                )}
                {crypto.map((item, index) => (
                  <div
                    className="rounded-lg border border-zinc-800 bg-black/30 p-3"
                    key={`${textValue(item.id || item.symbol, "crypto")}-${index}`}
                  >
                    <div className="font-semibold text-white">
                      {assetDisplayName(item.display_name, item.symbol, "CRYPTO")}
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-zinc-300">
                      <div>Type: {textValue(item.asset_type, "crypto")}</div>
                      <div>Quantity: {textValue(item.quantity, "0")}</div>
                      <div>Avg Price: {priceMoney(item.avg_price)}</div>
                      <div>Current Price: {priceMoney(item.current_price)}</div>
                      <div>Leverage: {textValue(item.leverage, "-")}</div>
                      <div>Current Value: {cryptoCurrentValue(item)}</div>
                      {cryptoPriceSource(item) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span>{cryptoPriceSource(item)}</span>
                          <PriceSourceBadge
                            inputEstimate={cryptoPriceSource(item).includes("input estimate")}
                            isStale={item.is_stale}
                            source={item.price_source}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={positionCardClass()}>
              <h3 className="font-semibold text-white">Cash</h3>
              <div className="mt-4 grid gap-3">
                {cash.length === 0 && (
                  <div className="text-sm text-zinc-400">尚無現金部位</div>
                )}
                {cash.map((item, index) => (
                  <div
                    className="rounded-lg border border-zinc-800 bg-black/30 p-3"
                    key={`${textValue(item.id || item.currency, "cash")}-${index}`}
                  >
                    <div className="font-semibold text-white">
                      {textValue(item.currency, "USD")}
                    </div>
                    <div className="mt-2 text-sm text-zinc-300">
                      Amount: {money(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
          <h2 className="text-xl font-semibold">Portfolio Health</h2>
          <div className="mt-4 grid gap-3">
            {alerts.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-400">
                No active alerts.
              </div>
            )}
            {alerts.map((alert, index) => (
              <div
                className={`rounded-xl border bg-zinc-900 p-4 ${severityClass(alert)}`}
                key={`${textValue(alert.id || alert.title || alert.message, "alert")}-${index}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-white">
                    {textValue(alert.title, "Alert")}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${riskBadgeClass(alert.severity || alert.level)}`}
                  >
                    {textValue(alert.severity || alert.level, "info")}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {textValue(alert.message)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
