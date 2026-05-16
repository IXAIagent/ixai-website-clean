"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { MarketEnginePanel } from "../components/market/MarketEnginePanel";
import { useWorkspaceContext } from "../lib/workspace-context";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  getPortfolioIntelligence,
  getPortfolioNews,
  getPortfolioPriority,
  NewsArticle,
  PortfolioIntelligenceResponse,
  PortfolioNewsResponse,
  PortfolioPriorityResponse,
} from "../lib/api";
import { useI18n } from "../lib/i18n";

const labels = {
  title: "Market / 市場情報",
  subtitle: "Portfolio-relevant market intelligence, news flow, and provider status.",
  header: "Market Header / 市場總覽",
  pulse: "Market Pulse / 市場脈搏",
  news: "Portfolio-Relevant News Stream / 相關新聞流",
  interpretation: "Risk Interpretation / 市場風險解讀",
  provider: "Provider Status / 資料來源狀態",
};

const pulse = [
  { label: "SPX", value: "+0.4%", tone: "up" },
  { label: "NASDAQ", value: "+1.1%", tone: "up" },
  { label: "BTC", value: "-2.4%", tone: "down" },
  { label: "ETH", value: "-1.8%", tone: "down" },
  { label: "VIX", value: "18.2", tone: "neutral" },
  { label: "USD/TWD", value: "32.38", tone: "neutral" },
];

const filters = ["All", "FCN", "Stock", "Crypto", "Macro", "High priority"] as const;
type Filter = (typeof filters)[number];

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function timestamp(value?: string | null) {
  if (!value) return "time pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function newsCategory(article: NewsArticle) {
  const haystack = `${article.symbol || ""} ${article.title || ""} ${article.narrative || ""} ${article.impact_reason || ""}`.toLowerCase();
  if (article.is_fcn_related || haystack.includes("fcn") || haystack.includes("ki") || haystack.includes("ko")) return "FCN";
  if (haystack.includes("btc") || haystack.includes("eth") || haystack.includes("crypto")) return "Crypto";
  if (haystack.includes("cpi") || haystack.includes("fomc") || haystack.includes("rate") || haystack.includes("inflation") || haystack.includes("vix")) return "Macro";
  return "Stock";
}

function priorityLabel(article: NewsArticle) {
  return article.priority_level || article.relevance_level || article.attention_level || "LOW";
}

function toneLabel(article: NewsArticle) {
  return article.impact || article.risk_direction || "neutral";
}

function priorityClass(value?: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("critical") || normalized.includes("high")) return "border-red-500/50 text-red-300";
  if (normalized.includes("medium")) return "border-yellow-500/50 text-yellow-300";
  return "border-zinc-700 text-zinc-400";
}

function toneClass(value?: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("negative") || normalized.includes("increase")) return "text-red-300";
  if (normalized.includes("positive") || normalized.includes("decrease")) return "text-emerald-300";
  return "text-zinc-400";
}

function whyItMatters(article: NewsArticle) {
  return (
    article.portfolio_impact_summary ||
    article.ai_summary ||
    article.narrative ||
    article.impact_reason ||
    "This item is related to monitored portfolio holdings."
  );
}

function matchesFilter(article: NewsArticle, filter: Filter) {
  if (filter === "All") return true;
  if (filter === "High priority") {
    const level = priorityLabel(article).toLowerCase();
    return level.includes("high") || level.includes("critical");
  }
  return newsCategory(article) === filter;
}

export default function MarketPage() {
  const { t } = useI18n();
  const [news, setNews] = useState<PortfolioNewsResponse | null>(null);
  const [priority, setPriority] = useState<PortfolioPriorityResponse | null>(null);
  const [intelligence, setIntelligence] = useState<PortfolioIntelligenceResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      const [newsData, priorityData, intelligenceData] = await Promise.all([
        getPortfolioNews().catch(() => null),
        getPortfolioPriority().catch(() => null),
        getPortfolioIntelligence().catch(() => null),
      ]);
      setNews(newsData);
      setPriority(priorityData);
      setIntelligence(intelligenceData);
      if (!newsData && !priorityData && !intelligenceData) {
        setError("Market intelligence temporarily unavailable.");
      }
      setLoading(false);
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const articles = useMemo(() => {
    const feed = Array.isArray(news?.articles) ? news.articles : [];
    const top = Array.isArray(priority?.top_alerts) ? priority.top_alerts : [];
    const seen = new Set<string>();
    return [...top, ...feed].filter((article, index) => {
      const key = article.link || `${article.symbol}-${article.title}-${index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [news, priority]);

  const filteredArticles = articles.filter((article) => matchesFilter(article, filter)).slice(0, 20);
  const fcnNews = articles.filter((article) => newsCategory(article) === "FCN").length;
  const cryptoNews = articles.filter((article) => newsCategory(article) === "Crypto").length;
  const macroNews = articles.filter((article) => newsCategory(article) === "Macro").length;
  const negativeNews = articles.filter((article) => toneLabel(article).toLowerCase().includes("negative")).length;

  const marketWorkspaceCtx = useWorkspaceContext();
  return (
    <AppShell title={t("page.market")} subtitle={labels.subtitle}>
      <div className="space-y-5">
        {error && (
          <div className="border border-yellow-500/30 bg-yellow-950/10 px-3 py-2 text-xs text-yellow-200">
            {error}
          </div>
        )}

        <MarketEnginePanel portfolioId={marketWorkspaceCtx.context.selectedPortfolioId} />

        <TerminalPanel title={labels.header} meta={loading ? "loading" : news?.is_stale ? "stale" : "active"}>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">Regime</div>
              <div className="mt-1 text-lg font-semibold text-zinc-100">{textValue(intelligence?.workspace?.market_regime, "Market regime pending")}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">Sentiment</div>
              <div className="mt-1 text-lg font-semibold text-emerald-300">{textValue(intelligence?.workspace?.workspace_mode, "BALANCED")}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">Risk Tone</div>
              <div className={negativeNews > 2 ? "mt-1 text-lg font-semibold text-yellow-300" : "mt-1 text-lg font-semibold text-zinc-300"}>
                {negativeNews > 2 ? "risk watch" : "mixed / stable"}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-600">Last Updated</div>
              <div className="mt-1 text-sm text-zinc-300">{timestamp(news?.fetched_at || priority?.generated_at || intelligence?.generated_at)}</div>
            </div>
          </div>
        </TerminalPanel>

        <TerminalPanel title={labels.pulse} meta="phase mock + intelligence state">
          <div className="grid gap-2 font-mono text-xs md:grid-cols-6">
            {pulse.map((item) => (
              <div className="border border-zinc-800 bg-black/20 p-2" key={item.label}>
                <div className="text-zinc-600">{item.label}</div>
                <div className={item.tone === "down" ? "text-red-300" : item.tone === "up" ? "text-emerald-300" : "text-zinc-300"}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 font-mono text-xs md:grid-cols-3">
            <div className="border border-zinc-800 bg-black/20 p-2 text-zinc-300">AI SENTIMENT: {textValue(intelligence?.workspace?.market_regime, "MIXED")}</div>
            <div className="border border-zinc-800 bg-black/20 p-2 text-zinc-300">CRYPTO VOL: {cryptoNews > 0 ? "WATCH" : "NORMAL"}</div>
            <div className="border border-zinc-800 bg-black/20 p-2 text-zinc-300">FCN NEWS: {fcnNews > 0 ? `${fcnNews} ITEMS` : "QUIET"}</div>
          </div>
        </TerminalPanel>

        <TerminalPanel title={labels.news} meta={`${filteredArticles.length} visible`}>
          <div className="mb-3 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                className={`border px-3 py-1.5 font-mono text-xs ${
                  filter === item ? "border-emerald-400/60 text-emerald-200" : "border-zinc-800 text-zinc-500"
                }`}
                key={item}
                onClick={() => setFilter(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="divide-y divide-zinc-900 border border-zinc-800">
            {filteredArticles.length === 0 && <EmptyLine>No portfolio-relevant market news found yet.</EmptyLine>}
            {filteredArticles.map((article, index) => (
              <div className="px-3 py-2 text-xs" key={`${article.link || article.title || "article"}-${index}`}>
                <div className="flex flex-wrap items-center gap-2 font-mono">
                  <span className="border border-emerald-500/40 px-2 py-0.5 text-emerald-300">{textValue(article.symbol, "MKT")}</span>
                  <span className={`border px-2 py-0.5 ${priorityClass(priorityLabel(article))}`}>{priorityLabel(article)}</span>
                  <span className={toneClass(toneLabel(article))}>{toneLabel(article)}</span>
                  <span className="text-zinc-500">{newsCategory(article)}</span>
                </div>
                <div className="mt-1 font-semibold text-zinc-100">{textValue(article.title, "Untitled market item")}</div>
                <div className="mt-1 text-zinc-400">{whyItMatters(article)}</div>
                <div className="mt-1 flex flex-wrap gap-2 font-mono text-[10px] text-zinc-600">
                  <span>{textValue(article.publisher || article.source, "source pending")}</span>
                  <span>·</span>
                  <span>{timestamp(article.published_at)}</span>
                  {article.link && (
                    <>
                      <span>·</span>
                      <a className="text-zinc-400 hover:text-emerald-300" href={article.link} rel="noopener noreferrer" target="_blank">
                        View
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TerminalPanel>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <TerminalPanel title={labels.interpretation} meta="portfolio lens">
            <div className="space-y-2 text-sm leading-6 text-zinc-300">
              <p>{textValue(intelligence?.narrative?.market_narrative, "Market narrative is still building from portfolio-relevant signals.")}</p>
              <p>FCN related news: {fcnNews}. Crypto related news: {cryptoNews}. Macro / rates related news: {macroNews}.</p>
              <p className="text-zinc-500">This workspace is for market intelligence and risk awareness, not trading instruction.</p>
            </div>
          </TerminalPanel>

          <TerminalPanel title={labels.provider} meta={news?.is_stale ? "stale" : "best effort"}>
            <div className="space-y-2 font-mono text-xs text-zinc-400">
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-600">YFINANCE NEWS</span>
                <span>{news?.is_stale ? "STALE / RATE LIMITED POSSIBLE" : "BEST EFFORT"}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-600">SCHEDULER</span>
                <span>CAN SKIP NEWS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">FEED STATUS</span>
                <span>{articles.length > 0 ? `${articles.length} ITEMS` : "WAITING"}</span>
              </div>
            </div>
          </TerminalPanel>
        </section>
      </div>
    </AppShell>
  );
}
