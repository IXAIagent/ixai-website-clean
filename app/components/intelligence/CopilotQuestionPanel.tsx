"use client";

import { useCallback, useState } from "react";

import { explainCopilot } from "../../lib/api";
import { sanitizeAdviceText } from "../../lib/intelligence-priority";
import { TerminalPanel } from "../layout/TerminalPanel";

type CopilotQueryKey =
  | "biggest_risk"
  | "why_today_focus"
  | "portfolio_drift"
  | "fcn_risk"
  | "data_freshness";

type Prompt = {
  key: CopilotQueryKey;
  label: string;
};

const PROMPTS: Prompt[] = [
  { key: "biggest_risk", label: "What is my biggest risk?" },
  { key: "why_today_focus", label: "Why is this portfolio in current regime?" },
  { key: "portfolio_drift", label: "What changed recently?" },
  { key: "fcn_risk", label: "Which FCN needs monitoring?" },
  { key: "data_freshness", label: "Is my data fresh?" },
];

/** v3F: read-only copilot panel for /intelligence.
 *
 *  All answers pass through `sanitizeAdviceText` as a frontend safety net on
 *  top of the backend compliance_filter. Failures fall back to a generic
 *  message; no raw JSON is shown to the user.
 */
export function CopilotQuestionPanel({ portfolioId }: { portfolioId?: string }) {
  const [activeKey, setActiveKey] = useState<CopilotQueryKey | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const ask = useCallback(
    async (prompt: Prompt) => {
      setActiveKey(prompt.key);
      setLoading(true);
      setError("");
      setAnswer("");
      try {
        const response = await explainCopilot(prompt.label, portfolioId, prompt.key);
        const raw =
          typeof response?.answer === "string" && response.answer.trim()
            ? response.answer
            : "目前 Copilot 暫時無法回應，請稍後再試。";
        setAnswer(sanitizeAdviceText(raw));
      } catch {
        setError("Copilot temporarily unavailable. Other intelligence panels remain active.");
      } finally {
        setLoading(false);
      }
    },
    [portfolioId],
  );

  return (
    <TerminalPanel
      title="Copilot · read-only Q&A"
      meta="compliance-safe · observation only"
    >
      <div className="mb-3 flex flex-wrap gap-2 font-mono text-xs">
        {PROMPTS.map((prompt) => {
          const isActive = activeKey === prompt.key;
          return (
            <button
              className={`border px-3 py-1.5 transition ${
                isActive
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                  : "border-zinc-700 text-zinc-300 hover:border-emerald-400/60 hover:text-emerald-200"
              }`}
              disabled={loading}
              key={prompt.key}
              onClick={() => void ask(prompt)}
              type="button"
            >
              {prompt.label}
            </button>
          );
        })}
      </div>
      <div className="border border-dashed border-zinc-800 bg-black/30 px-3 py-3 font-mono text-xs leading-6">
        {loading && <span className="text-zinc-500">… analysing</span>}
        {!loading && error && <span className="text-yellow-300">{error}</span>}
        {!loading && !error && !answer && (
          <span className="text-zinc-500">
            Pick a question above. Answers are read-only observations — no buy/sell instructions.
          </span>
        )}
        {!loading && !error && answer && (
          <span className="text-zinc-200">{answer}</span>
        )}
      </div>
    </TerminalPanel>
  );
}
