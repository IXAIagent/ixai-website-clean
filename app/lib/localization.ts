"use client";

// v4.9B: hybrid localization policy.
//
// UX rule: localize CONNECTIVE language; preserve financial entities and
// source headlines in their native form. The goal is a "localized finance
// terminal", not machine-translated jargon.

import type { SupportedLocale } from "../locales";
import { sanitizeAdviceText } from "./intelligence-priority";

/** Terms that must never be translated. Includes tickers, structured-
 *  product terminology, market regimes, and well-known crypto symbols. */
export const PROTECTED_FINANCIAL_TERMS: ReadonlyArray<string> = [
  // Structured product terms
  "FCN",
  "KI",
  "KO",
  "Worst-of",
  "worst-of",
  // Regimes / scoring concepts (kept English even in zh narratives)
  "AI Momentum",
  "Risk-On",
  "Risk-Off",
  "RISK_ON",
  "RISK_OFF",
  "AI_MOMENTUM",
  "CRYPTO_SPECULATIVE",
  "DEFENSIVE",
  "HIGH_VOLATILITY",
  // Crypto
  "BTC",
  "ETH",
  "BTCUSDT",
  "ETHUSDT",
  "USDT",
  "USDC",
  // Common tickers used by IXAI engines
  "NVDA",
  "NVIDIA",
  "AAPL",
  "MSFT",
  "TSM",
  "TSMC",
  "AVGO",
  "AMD",
  "AMZN",
  "GOOGL",
  "GOOG",
  "META",
  "TSLA",
  "PLTR",
  "MAG7",
  "Mag 7",
];

const PROTECTED_LOOKUP = new Set(
  PROTECTED_FINANCIAL_TERMS.map((term) => term.toLowerCase()),
);

/** True iff the candidate string is registered as a protected financial term. */
export function isProtectedTerm(candidate: string): boolean {
  if (!candidate) return false;
  return PROTECTED_LOOKUP.has(candidate.toLowerCase());
}

/** Preserve protected terms inside any text. Currently identity (we never
 *  transform protected substrings), but documents intent and gives a hook
 *  for future LLM-pass interceptors. */
export function preserveProtectedTerms(text: string): string {
  return text;
}

/** Tokenise a string, marking which tokens are protected. Useful when
 *  applying a future LLM translation only to non-protected runs. */
export function tokeniseProtectedRuns(
  text: string,
): Array<{ token: string; protected: boolean }> {
  if (!text) return [];
  const tokens = text.split(/(\s+|[,.;:!?()\[\]{}「」、，。；])/);
  return tokens
    .filter((token) => token.length > 0)
    .map((token) => ({
      token,
      protected: isProtectedTerm(token.trim()),
    }));
}

/**
 * Render an engine-generated narrative for the user.
 *
 *  Behaviour today:
 *  - Pass-through text (backend already emits locale-aware copy via
 *    `narrative_locale()` + compliance_filter).
 *  - Always runs through `sanitizeAdviceText` as a frontend safety net
 *    against forbidden trading wording.
 *  - Truncates over-long narratives so panels stay scan-friendly (≤ 160
 *    chars by default).
 *
 *  Future-compatible: when an LLM translator is wired in, this function is
 *  the single seam to swap the implementation — call sites need not change.
 */
export function localizeFinancialNarrative(
  text: string | null | undefined,
  locale: SupportedLocale,
  options: { maxLength?: number } = {},
): string {
  if (!text || typeof text !== "string") return "";
  // The locale parameter is currently used only as a future hook; backend
  // narratives already arrive in the right language thanks to v4D.
  void locale;
  const sanitised = sanitizeAdviceText(text).trim();
  const limit = Math.max(40, options.maxLength ?? 160);
  if (sanitised.length <= limit) return sanitised;
  return sanitised.slice(0, limit).replace(/[，。；,. ]+$/, "") + "…";
}
