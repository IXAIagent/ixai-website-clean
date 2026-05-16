"use client";

import { AppShell } from "../components/layout/AppShell";
import { TerminalPanel } from "../components/layout/TerminalPanel";

const pulse = [
  ["SPX", "+0.4%"],
  ["NASDAQ", "+1.1%"],
  ["BTC", "-2.4%"],
  ["ETH", "-1.8%"],
  ["VIX", "18.2"],
  ["USD/TWD", "32.38"],
];

export default function MarketPage() {
  return (
    <AppShell
      title="Market / 市場"
      subtitle="Market intelligence workspace skeleton. Live market modules remain in future batches."
    >
      <TerminalPanel title="Market Intelligence" meta="placeholder">
        <div className="grid gap-2 font-mono text-xs md:grid-cols-6">
          {pulse.map(([label, value]) => (
            <div className="border border-zinc-800 bg-black/20 p-2" key={label}>
              <div className="text-zinc-600">{label}</div>
              <div className={value.startsWith("-") ? "text-red-300" : "text-emerald-300"}>{value}</div>
            </div>
          ))}
        </div>
      </TerminalPanel>
    </AppShell>
  );
}
