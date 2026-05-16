"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import { FCNPositionResponse, getMySummary } from "../lib/api";

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function percent(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return "-";
  return `${(Math.abs(parsed) <= 1 ? parsed * 100 : parsed).toFixed(1)}%`;
}

export default function FcnPage() {
  const [fcns, setFcns] = useState<FCNPositionResponse[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const summary = await getMySummary();
        setFcns([
          ...(Array.isArray(summary.fcn_positions) ? summary.fcn_positions : []),
          ...(Array.isArray(summary.fcn_analysis) ? summary.fcn_analysis : []),
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "FCN workspace unavailable.");
      }
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const topFcns = useMemo(() => fcns.slice(0, 8), [fcns]);

  return (
    <AppShell
      title="FCN / FCN 監控"
      subtitle="FCN KI / KO monitoring foundation. Professional workspace lands in a later batch."
    >
      <TerminalPanel title="FCN Risk Workspace" meta="skeleton">
        {error && <EmptyLine>{error}</EmptyLine>}
        <div className="mb-3 font-mono text-xs text-zinc-500">
          FCN KI / KO monitoring · worst-of detail · coupon windows · issuer metadata.
        </div>
        <div className="divide-y divide-zinc-800 border border-zinc-800">
          {topFcns.length === 0 && <EmptyLine>No FCN positions yet.</EmptyLine>}
          {topFcns.map((fcn, index) => (
            <div className="grid gap-2 px-3 py-2 font-mono text-xs md:grid-cols-5" key={`${textValue(fcn.id || fcn.fcn_code, "fcn")}-${index}`}>
              <span className="font-semibold text-zinc-100">{textValue(fcn.fcn_code || fcn.name || fcn.code, "FCN")}</span>
              <span className="text-zinc-400">{textValue(fcn.risk_level, "unknown")}</span>
              <span className="text-zinc-400">{textValue(fcn.worst_underlying || fcn.worst_symbol || fcn.worst_of, "worst-of")}</span>
              <span className="text-yellow-300">KI {percent(fcn.distance_to_KI || fcn.distance_to_ki || fcn.distance_to_ki_pct)}</span>
              <span className="text-zinc-500">{textValue(fcn.next_coupon_date, "coupon pending")}</span>
            </div>
          ))}
        </div>
      </TerminalPanel>
    </AppShell>
  );
}
