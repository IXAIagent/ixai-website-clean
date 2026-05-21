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

// v4.9D: labels were hardcoded bilingual; now resolve through useI18n.

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
  if (normalized.includes("critical") || normalized.includes("high")) return "border-[var(--ixai-risk-critical)]/50 text-[var(--ixai-risk-critical)]";
  if (normalized.includes("medium")) return "border-[var(--ixai-risk-watch)]/50 text-[var(--ixai-risk-watch)]";
  return "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-muted)]";
}

function toneClass(value?: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("negative") || normalized.includes("increase")) return "text-[var(--ixai-risk-critical)]";
  if (normalized.includes("positive") || normalized.includes("decrease")) return "text-[var(--ixai-risk-clear)]";
  return "text-[var(--ixai-text-muted)]";
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
  const labels = useMemo(
    () => ({
      title: t("page.market"),
      subtitle: t("market.subtitle"),
      header: t("market.header"),
      pulse: t("market.pulse"),
      news: t("market.news"),
      interpretation: t("market.interpretation"),
      provider: t("market.provider"),
      sentiment: t("market.sentiment"),
      cryptoVolatility: t("market.cryptoVolatility"),
      fcnNews: t("market.fcnNews"),
      visible: t("market.visible"),
      noNews: t("market.noNews"),
      marketNarrativeBuilding: t("market.marketNarrativeBuilding"),
      complianceNote: t("market.complianceNote"),
      yfinanceNews: t("market.yfinanceNews"),
      scheduler: t("market.scheduler"),
      feedStatus: t("market.feedStatus"),
      staleProvider: t("market.staleProvider"),
      bestEffort: t("market.bestEffort"),
      canSkipNews: t("market.canSkipNews"),
      waiting: t("market.waiting"),
      items: t("market.items"),
      watch: t("market.watch"),
      normal: t("market.normal"),
      quiet: t("market.quiet"),
    }),
    [t],
  );
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
      try {
        const [newsData, priorityData, intelligenceData] = await Promise.allSettled([
          getPortfolioNews(),
          getPortfolioPriority(),
          getPortfolioIntelligence(),
        ]);
        const nextNews = newsData.status === "fulfilled" ? newsData.value : null;
        const nextPriority = priorityData.status === "fulfilled" ? priorityData.value : null;
        const nextIntelligence = intelligenceData.status === "fulfilled" ? intelligenceData.value : null;
        setNews(nextNews);
        setPriority(nextPriority);
        setIntelligence(nextIntelligence);
        if (!nextNews && !nextPriority && !nextIntelligence) {
          setError(t("errors.market"));
        }
      } catch {
        setNews(null);
        setPriority(null);
        setIntelligence(null);
        setError(t("errors.market"));
      } finally {
        setLoading(false);
      }
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [t]);

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
          <div className="border border-[var(--ixai-risk-watch)]/30 bg-[var(--ixai-surface-card)] px-3 py-2 text-xs text-[var(--ixai-risk-watch)]">
            {error}
          </div>
        )}

        <MarketEnginePanel portfolioId={marketWorkspaceCtx.context.selectedPortfolioId} />

        <TerminalPanel title={labels.header} meta={loading ? t("status.loading") : news?.is_stale ? t("status.stale") : error ? "data limited" : t("common.active")}>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <div className="font-mono text-[10px] uppercase text-[var(--ixai-text-subtle)]">Regime</div>
              <div className="mt-1 text-lg font-semibold text-[var(--ixai-text-strong)]">{textValue(intelligence?.workspace?.market_regime, "Market regime pending")}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-[var(--ixai-text-subtle)]">Sentiment</div>
              <div className="mt-1 text-lg font-semibold text-[var(--ixai-risk-clear)]">{textValue(intelligence?.workspace?.workspace_mode, "BALANCED")}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-[var(--ixai-text-subtle)]">Risk Tone</div>
              <div className={negativeNews > 2 ? "mt-1 text-lg font-semibold text-[var(--ixai-risk-watch)]" : "mt-1 text-lg font-semibold text-[var(--ixai-text-strong)]"}>
                {negativeNews > 2 ? "risk watch" : "mixed / stable"}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-[var(--ixai-text-subtle)]">Last Updated</div>
              <div className="mt-1 text-sm text-[var(--ixai-text-strong)]">{timestamp(news?.fetched_at || priority?.generated_at || intelligence?.generated_at)}</div>
            </div>
          </div>
        </TerminalPanel>

        <TerminalPanel title={labels.pulse} meta="reference state">
          <div className="grid gap-2 font-mono text-xs md:grid-cols-6">
            {pulse.map((item) => (
              <div className="border border-[var(--ixai-border-subtle)] bg-black/20 p-2" key={item.label}>
                <div className="text-[var(--ixai-text-subtle)]">{item.label}</div>
                <div className={item.tone === "down" ? "text-[var(--ixai-risk-critical)]" : item.tone === "up" ? "text-[var(--ixai-risk-clear)]" : "text-[var(--ixai-text-strong)]"}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 font-mono text-xs md:grid-cols-3">
            <div className="border border-[var(--ixai-border-subtle)] bg-black/20 p-2 text-[var(--ixai-text-strong)]">{labels.sentiment}: {textValue(intelligence?.workspace?.market_regime, "MIXED")}</div>
            <div className="border border-[var(--ixai-border-subtle)] bg-black/20 p-2 text-[var(--ixai-text-strong)]">{labels.cryptoVolatility}: {cryptoNews > 0 ? labels.watch : labels.normal}</div>
            <div className="border border-[var(--ixai-border-subtle)] bg-black/20 p-2 text-[var(--ixai-text-strong)]">{labels.fcnNews}: {fcnNews > 0 ? `${fcnNews} ${labels.items}` : labels.quiet}</div>
          </div>
        </TerminalPanel>

        <TerminalPanel title={labels.news} meta={`${filteredArticles.length} ${labels.visible}`}>
          <div className="mb-3 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                className={`border px-3 py-1.5 font-mono text-xs ${
                  filter === item ? "border-[var(--ixai-accent)]/60 text-[var(--ixai-risk-clear)]" : "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-subtle)]"
                }`}
                key={item}
                onClick={() => setFilter(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="divide-y divide-[var(--ixai-border-subtle)] border border-[var(--ixai-border-subtle)]">
            {filteredArticles.length === 0 && <EmptyLine>{labels.noNews}</EmptyLine>}
            {filteredArticles.map((article, index) => (
              <div className="px-3 py-2 text-xs" key={`${article.link || article.title || "article"}-${index}`}>
                <div className="flex flex-wrap items-center gap-2 font-mono">
                  <span className="border border-[var(--ixai-accent)]/40 px-2 py-0.5 text-[var(--ixai-risk-clear)]">{textValue(article.symbol, "MKT")}</span>
                  <span className={`border px-2 py-0.5 ${priorityClass(priorityLabel(article))}`}>{priorityLabel(article)}</span>
                  <span className={toneClass(toneLabel(article))}>{toneLabel(article)}</span>
                  <span className="text-[var(--ixai-text-subtle)]">{newsCategory(article)}</span>
                </div>
                <div className="mt-1 font-semibold text-[var(--ixai-text-strong)]">{textValue(article.title, "Untitled market item")}</div>
                <div className="mt-1 text-[var(--ixai-text-muted)]">{whyItMatters(article)}</div>
                <div className="mt-1 flex flex-wrap gap-2 font-mono text-[10px] text-[var(--ixai-text-subtle)]">
                  <span>{textValue(article.publisher || article.source, "source pending")}</span>
                  <span>·</span>
                  <span>{timestamp(article.published_at)}</span>
                  {article.link && (
                    <>
                      <span>·</span>
                      <a className="text-[var(--ixai-text-muted)] hover:text-[var(--ixai-risk-clear)]" href={article.link} rel="noopener noreferrer" target="_blank">
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
            <div className="space-y-2 text-sm leading-6 text-[var(--ixai-text-strong)]">
              <p>{textValue(intelligence?.narrative?.market_narrative, labels.marketNarrativeBuilding)}</p>
              <p>{t("market.relatedNewsCounts").replace("{fcn}", String(fcnNews)).replace("{crypto}", String(cryptoNews)).replace("{macro}", String(macroNews))}</p>
              <p className="text-[var(--ixai-text-subtle)]">{labels.complianceNote}</p>
            </div>
          </TerminalPanel>

          <TerminalPanel title={labels.provider} meta={news?.is_stale ? "stale" : "best effort"}>
            <div className="space-y-2 font-mono text-xs text-[var(--ixai-text-muted)]">
              <div className="flex justify-between border-b border-[var(--ixai-border-subtle)] pb-2">
                <span className="text-[var(--ixai-text-subtle)]">{labels.yfinanceNews}</span>
                <span>{news?.is_stale ? labels.staleProvider : labels.bestEffort}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--ixai-border-subtle)] pb-2">
                <span className="text-[var(--ixai-text-subtle)]">{labels.scheduler}</span>
                <span>{labels.canSkipNews}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ixai-text-subtle)]">{labels.feedStatus}</span>
                <span>{articles.length > 0 ? `${articles.length} ${labels.items}` : labels.waiting}</span>
              </div>
            </div>
          </TerminalPanel>
        </section>
      </div>
    </AppShell>
  );
}
