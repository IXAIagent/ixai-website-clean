"use client";

import { useEffect, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  AllocationItem,
  getMyAssetAllocation,
  getMySummary,
  SummaryResponse,
} from "../lib/api";

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return `$${numberValue(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function PortfolioPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [allocation, setAllocation] = useState<AllocationItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [summaryData, allocationData] = await Promise.all([
          getMySummary(),
          getMyAssetAllocation(),
        ]);
        setSummary(summaryData);
        setAllocation(Array.isArray(allocationData.items) ? allocationData.items : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Portfolio workspace unavailable.");
      }
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AppShell
      title="Portfolio / 資產"
      subtitle="Full portfolio workspace foundation. Detailed position management remains in /input for this batch."
    >
      <div className="space-y-4">
        {error && <EmptyLine>{error}</EmptyLine>}
        <section className="grid gap-3 md:grid-cols-4">
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="font-mono text-xs text-zinc-500">TOTAL</div>
            <div className="mt-1 text-xl font-semibold">{money(summary?.total_value)}</div>
          </div>
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="font-mono text-xs text-zinc-500">STOCK</div>
            <div className="mt-1 text-xl font-semibold">{money(summary?.stock_value)}</div>
          </div>
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="font-mono text-xs text-zinc-500">FCN</div>
            <div className="mt-1 text-xl font-semibold">{money(summary?.fcn_value)}</div>
          </div>
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="font-mono text-xs text-zinc-500">CASH</div>
            <div className="mt-1 text-xl font-semibold">{money(summary?.cash_value)}</div>
          </div>
        </section>

        <TerminalPanel title="Allocation Summary" meta="workspace preview">
          <div className="grid gap-2 md:grid-cols-4">
            {allocation.map((item) => (
              <div className="border border-zinc-800 bg-black/20 p-3" key={item.asset_class}>
                <div className="font-mono text-xs uppercase text-zinc-500">{item.asset_class}</div>
                <div className="mt-1 text-lg font-semibold">{money(item.value)}</div>
                <div className="mt-1 font-mono text-xs text-zinc-500">{item.percentage.toFixed(1)}%</div>
              </div>
            ))}
            {allocation.length === 0 && <EmptyLine>No allocation data yet.</EmptyLine>}
          </div>
          <div className="mt-3 font-mono text-xs text-zinc-500">
            Full portfolio workspace coming next.
          </div>
        </TerminalPanel>
      </div>
    </AppShell>
  );
}
