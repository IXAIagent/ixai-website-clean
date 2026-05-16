"use client";

import {
  AllocationItem,
  FCNPositionResponse,
  NewsArticle,
  PortfolioSummaryV2AResponse,
  RiskOverviewResponse,
  SummaryResponse,
  TimelineIntelligenceResponse,
} from "./api";

export type TodayFocusItem = {
  title: string;
  severity: "clear" | "watch" | "elevated" | "critical";
  category: "FCN" | "Portfolio" | "Crypto" | "Market" | "Data";
  symbol: string;
  reason: string;
  recommended_monitoring_action:
    | "monitor"
    | "review"
    | "verify data"
    | "check upcoming event"
    | "reduce information blind spot";
  priorityScore: number;
};

export type CrossAssetRisk = {
  label: string;
  state: "clear" | "watch" | "elevated" | "critical";
  driver: string;
  relatedSymbols: string[];
  monitoringNote: string;
};

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textValue(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function normalizedPercent(value: unknown) {
  const parsed = numberValue(value, NaN);
  if (!Number.isFinite(parsed)) return null;
  return Math.abs(parsed) <= 1 ? parsed * 100 : parsed;
}

export function sanitizeAdviceText(value: unknown) {
  const text = textValue(value, "");
  return text
    .replace(/\b(buy|sell|add position|reduce position|target price|stop loss)\b/gi, "monitor")
    .replace(/買進|賣出|加碼|減碼|目標價|停損/g, "監控")
    .slice(0, 220);
}

function fcnCode(fcn: FCNPositionResponse, index: number) {
  return textValue(fcn.fcn_code || fcn.name || fcn.code, `FCN-${index + 1}`);
}

function fcnKiDistance(fcn: FCNPositionResponse) {
  return normalizedPercent(fcn.distance_to_KI || fcn.distance_to_ki || fcn.distance_to_ki_pct);
}

function fcnWorst(fcn: FCNPositionResponse) {
  return textValue(fcn.worst_symbol || fcn.worst_underlying || fcn.worst_of, "worst-of");
}

export function buildTodayFocus({
  summary,
  risk,
  fcnItems,
  priorityArticles,
  intelligenceSummary,
  timeline,
  allocation,
}: {
  summary: SummaryResponse | null;
  risk: RiskOverviewResponse | null;
  fcnItems: FCNPositionResponse[];
  priorityArticles: NewsArticle[];
  intelligenceSummary: PortfolioSummaryV2AResponse | null;
  timeline: TimelineIntelligenceResponse | null;
  allocation: AllocationItem[];
}) {
  const items: TodayFocusItem[] = [];

  fcnItems.forEach((fcn, index) => {
    const distance = fcnKiDistance(fcn);
    const riskLevel = textValue(fcn.risk_level, "").toLowerCase();
    if (riskLevel.includes("high") || (distance !== null && distance < 8)) {
      items.push({
        title: `${fcnCode(fcn, index)} KI sensitivity`,
        severity: distance !== null && distance < 5 ? "critical" : "elevated",
        category: "FCN",
        symbol: fcnWorst(fcn),
        reason: `FCN worst-of ${fcnWorst(fcn)} is ${distance !== null ? `${distance.toFixed(1)}%` : "near"} from monitored KI distance.`,
        recommended_monitoring_action: "monitor",
        priorityScore: distance !== null ? Math.max(95 - distance, 50) : 70,
      });
    }
  });

  priorityArticles.slice(0, 5).forEach((article) => {
    const level = textValue(article.priority_level || article.attention_level || article.relevance_level, "low").toLowerCase();
    if (level.includes("critical") || level.includes("high")) {
      items.push({
        title: textValue(article.title, "Priority market event"),
        severity: level.includes("critical") ? "critical" : "elevated",
        category: article.is_fcn_related ? "FCN" : "Market",
        symbol: textValue(article.symbol, "NEWS"),
        reason: sanitizeAdviceText(article.alert_summary || article.portfolio_impact_summary || article.impact_reason || article.narrative),
        recommended_monitoring_action: article.is_fcn_related ? "check upcoming event" : "review",
        priorityScore: numberValue(article.priority_score, level.includes("critical") ? 90 : 70),
      });
    }
  });

  const concentration = numberValue(intelligenceSummary?.concentration_score, 0);
  if (concentration >= 65) {
    items.push({
      title: "Portfolio concentration elevated",
      severity: concentration >= 80 ? "critical" : "elevated",
      category: "Portfolio",
      symbol: "CONCENTRATION",
      reason: `Concentration score is ${concentration.toFixed(0)} and may dominate portfolio risk interpretation.`,
      recommended_monitoring_action: "review",
      priorityScore: concentration,
    });
  }

  const cryptoAllocation = allocation.find((item) => item.asset_class.toLowerCase().includes("crypto"));
  if (numberValue(cryptoAllocation?.percentage, 0) >= 20 || textValue(timeline?.volatility_trend).toLowerCase().includes("high")) {
    items.push({
      title: "Crypto volatility watch",
      severity: "watch",
      category: "Crypto",
      symbol: "BTC / ETH",
      reason: "Crypto exposure or volatility trend is visible in the current portfolio context.",
      recommended_monitoring_action: "monitor",
      priorityScore: 58,
    });
  }

  if (timeline?.is_stale || intelligenceSummary?.is_stale) {
    items.push({
      title: "Intelligence memory freshness",
      severity: "watch",
      category: "Data",
      symbol: "SCHEDULER",
      reason: "Recent intelligence memory may still be accumulating or stale.",
      recommended_monitoring_action: "verify data",
      priorityScore: 54,
    });
  }

  const topRisk = textValue(risk?.top_risk || summary?.top_risk || intelligenceSummary?.dominant_risk, "");
  if (items.length === 0 && topRisk) {
    items.push({
      title: "Portfolio risk posture",
      severity: "watch",
      category: "Portfolio",
      symbol: "PORTFOLIO",
      reason: sanitizeAdviceText(topRisk),
      recommended_monitoring_action: "monitor",
      priorityScore: 40,
    });
  }

  if (items.length === 0) {
    items.push({
      title: "No major portfolio focus detected",
      severity: "clear",
      category: "Portfolio",
      symbol: "CLEAR",
      reason: "Current portfolio intelligence does not identify a critical focus item.",
      recommended_monitoring_action: "monitor",
      priorityScore: 0,
    });
  }

  return items.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3);
}

export function focusStatus(items: TodayFocusItem[]) {
  if (items.some((item) => item.severity === "critical")) return "critical";
  if (items.some((item) => item.severity === "elevated")) return "elevated";
  if (items.some((item) => item.severity === "watch")) return "watch";
  return "clear";
}

export function buildCrossAssetRisks({
  summary,
  fcnItems,
  intelligenceSummary,
  timeline,
}: {
  summary: SummaryResponse | null;
  fcnItems: FCNPositionResponse[];
  intelligenceSummary: PortfolioSummaryV2AResponse | null;
  timeline: TimelineIntelligenceResponse | null;
}): CrossAssetRisk[] {
  const stockRatio = numberValue(summary?.stock_value, 0) / Math.max(numberValue(summary?.total_value, 0), 1);
  const cryptoRatio = numberValue(summary?.crypto_value, 0) / Math.max(numberValue(summary?.total_value, 0), 1);
  const fcnRisk = fcnItems
    .map((fcn) => fcnKiDistance(fcn))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)[0];
  const cashRatio = numberValue(summary?.cash_value, 0) / Math.max(numberValue(summary?.total_value, 0), 1);

  return [
    {
      label: "Equity risk",
      state: stockRatio > 0.6 ? "elevated" : "watch",
      driver: stockRatio > 0.6 ? "Stock concentration dominates total value." : "Equity exposure is present but not dominant.",
      relatedSymbols: ["AAPL", "NVDA", "TSM"].filter(Boolean),
      monitoringNote: "Monitor concentration and correlated AI/chip news.",
    },
    {
      label: "FCN risk",
      state: fcnRisk !== undefined && fcnRisk < 5 ? "critical" : fcnRisk !== undefined && fcnRisk < 15 ? "elevated" : "watch",
      driver: fcnRisk !== undefined ? `Nearest KI distance is ${fcnRisk.toFixed(1)}%.` : "FCN KI distance is still building.",
      relatedSymbols: fcnItems.map(fcnWorst).filter((symbol, index, arr) => symbol && arr.indexOf(symbol) === index).slice(0, 4),
      monitoringNote: "Monitor worst-of, KI distance, and upcoming observation dates.",
    },
    {
      label: "Crypto risk",
      state: cryptoRatio > 0.2 ? "elevated" : "watch",
      driver: cryptoRatio > 0.2 ? "Crypto exposure is meaningful to portfolio volatility." : "Crypto exposure appears contained.",
      relatedSymbols: ["BTC", "ETH"],
      monitoringNote: "Monitor volatility, liquidity, and stale price status.",
    },
    {
      label: "Macro/news risk",
      state: textValue(intelligenceSummary?.regime || timeline?.regime_evolution).toLowerCase().includes("risk") ? "watch" : "clear",
      driver: sanitizeAdviceText(intelligenceSummary?.drift_summary || timeline?.timeline_summary || "Macro/news risk is monitored through intelligence feed."),
      relatedSymbols: ["CPI", "FOMC", "VIX"],
      monitoringNote: "Review macro events and portfolio-relevant news tone.",
    },
    {
      label: "Cash buffer",
      state: cashRatio < 0.05 ? "elevated" : "clear",
      driver: cashRatio < 0.05 ? "Cash ratio is low relative to total portfolio value." : "Cash buffer is visible.",
      relatedSymbols: ["USD", "TWD"],
      monitoringNote: "Monitor liquidity posture without treating this as trading instruction.",
    },
  ];
}
