"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  FCNPositionResponse,
  FCNUnderlyingResult,
  getFcns,
  getMySummary,
  SummaryResponse,
} from "../lib/api";
import { useI18n } from "../lib/i18n";

const labels = {
  title: "FCN Risk Workspace / FCN 風險監控",
  subtitle: "Worst-of monitoring, KI / KO distance, coupon windows, and linked exposure.",
  header: "FCN Header",
  table: "FCN Risk Table",
  worst: "Worst-of Underlying Monitor",
  exposure: "FCN Exposure Map",
  timeline: "Coupon / Observation Timeline",
  interpretation: "Risk Interpretation",
};

type FcnView = FCNPositionResponse & {
  mergedKey: string;
  notionalValue: number;
  displayCode: string;
  underlyingRows: FCNUnderlyingResult[];
};

type ExposureItem = {
  symbol: string;
  count: number;
  fcns: string[];
};

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: unknown) {
  return `$${numberValue(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function price(value: unknown) {
  const parsed = nullableNumber(value);
  if (parsed === null || parsed <= 0) return "待更新";
  return `$${parsed.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function percent(value: unknown) {
  const parsed = nullableNumber(value);
  if (parsed === null) return "-";
  const display = Math.abs(parsed) <= 1 ? parsed * 100 : parsed;
  return `${display.toFixed(1)}%`;
}

function distanceValue(value: unknown) {
  const parsed = nullableNumber(value);
  if (parsed === null) return null;
  return Math.abs(parsed) <= 1 ? parsed * 100 : parsed;
}

function distanceTone(value: unknown) {
  const parsed = distanceValue(value);
  if (parsed === null) return "text-zinc-500";
  if (parsed < 5) return "text-red-300";
  if (parsed <= 15) return "text-yellow-300";
  return "text-emerald-300";
}

function riskClass(risk?: string | null) {
  const normalized = (risk || "").toLowerCase();
  if (normalized.includes("high") || normalized.includes("critical")) return "border-red-500/50 text-red-300";
  if (normalized.includes("medium") || normalized.includes("watch")) return "border-yellow-500/50 text-yellow-300";
  if (normalized.includes("low")) return "border-emerald-500/50 text-emerald-300";
  return "border-zinc-700 text-zinc-400";
}

function sourceLabel(source?: string | null, stale?: boolean | null) {
  if (stale) return "STALE";
  const normalized = (source || "").toLowerCase();
  if (normalized.includes("yahoo") || normalized.includes("binance")) return "LIVE";
  if (normalized.includes("manual") || normalized.includes("stored")) return "STORED";
  return source || "SOURCE PENDING";
}

function displayFcn(fcn: FCNPositionResponse) {
  return fcn.fcn_code || fcn.name || fcn.code || "FCN";
}

function keyFor(fcn: FCNPositionResponse, index: number) {
  return String(fcn.fcn_code || fcn.name || fcn.code || fcn.id || `fcn-${index}`);
}

function parseUnderlyings(value: unknown): FCNUnderlyingResult[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return { symbol: item };
        if (item && typeof item === "object") return item as FCNUnderlyingResult;
        return null;
      })
      .filter((item): item is FCNUnderlyingResult => Boolean(item?.symbol));
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parseUnderlyings(parsed);
  } catch {
    return trimmed
      .split(",")
      .map((symbol) => symbol.trim())
      .filter(Boolean)
      .map((symbol) => ({ symbol }));
  }
}

function underlyingRows(fcn: FCNPositionResponse) {
  const rich = Array.isArray(fcn.underlying_results)
    ? fcn.underlying_results
    : Array.isArray(fcn.prices)
      ? fcn.prices
      : [];
  if (rich.length > 0) return rich;
  return parseUnderlyings(fcn.underlyings);
}

function mergeFcns(summary: SummaryResponse | null, raw: FCNPositionResponse[]) {
  const positions = Array.isArray(summary?.fcn_positions) ? summary?.fcn_positions || [] : raw;
  const analyses = Array.isArray(summary?.fcn_analysis) ? summary?.fcn_analysis || [] : [];
  const analysisMap = new Map<string, FCNPositionResponse>();

  analyses.forEach((item, index) => {
    analysisMap.set(keyFor(item, index), item);
  });

  const merged = positions.map<FcnView>((position, index) => {
    const key = keyFor(position, index);
    const analysis = analysisMap.get(key) || analyses.find((item) => {
      const left = item.fcn_code || item.name || item.code;
      const right = position.fcn_code || position.name || position.code;
      return Boolean(left && right && left === right);
    });
    const combined: FCNPositionResponse = { ...analysis, ...position };
    return {
      ...combined,
      risk_level: analysis?.risk_level || position.risk_level,
      worst_symbol: analysis?.worst_symbol || position.worst_symbol,
      worst_of: analysis?.worst_of || position.worst_of,
      worst_underlying: analysis?.worst_underlying || position.worst_underlying,
      worst_performance: analysis?.worst_performance || position.worst_performance,
      distance_to_KI: analysis?.distance_to_KI || position.distance_to_KI,
      distance_to_KO: analysis?.distance_to_KO || position.distance_to_KO,
      distance_to_ki: analysis?.distance_to_ki || position.distance_to_ki,
      distance_to_ko: analysis?.distance_to_ko || position.distance_to_ko,
      price_source: analysis?.price_source || position.price_source,
      underlying_results: analysis?.underlying_results || position.underlying_results,
      prices: analysis?.prices || position.prices,
      mergedKey: key,
      notionalValue: numberValue(position.notional_amount || position.notional),
      displayCode: displayFcn(position),
      underlyingRows: underlyingRows(analysis || position),
    };
  });

  analyses.forEach((analysis, index) => {
    const key = keyFor(analysis, index);
    if (merged.some((item) => item.mergedKey === key)) return;
    merged.push({
      ...analysis,
      mergedKey: key,
      notionalValue: numberValue(analysis.notional_amount || analysis.notional),
      displayCode: displayFcn(analysis),
      underlyingRows: underlyingRows(analysis),
    });
  });

  return merged;
}

function getKiDistance(fcn: FCNPositionResponse) {
  return fcn.distance_to_KI ?? fcn.distance_to_ki ?? fcn.distance_to_ki_pct;
}

function getKoDistance(fcn: FCNPositionResponse) {
  return fcn.distance_to_KO ?? fcn.distance_to_ko ?? fcn.distance_to_ko_pct;
}

function getWorstSymbol(fcn: FCNPositionResponse) {
  return fcn.worst_symbol || fcn.worst_underlying || fcn.worst_of || "-";
}

function dateValue(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function nearestDate(values: Array<string | null | undefined>) {
  const now = Date.now();
  const future = values
    .map((value) => ({ value, time: dateValue(value) }))
    .filter((item): item is { value: string; time: number } => Boolean(item.value && item.time && item.time >= now))
    .sort((a, b) => a.time - b.time);
  return future[0]?.value || null;
}

function exposureMap(fcns: FcnView[]) {
  const map = new Map<string, ExposureItem>();
  fcns.forEach((fcn) => {
    const symbols = fcn.underlyingRows.map((row) => row.symbol || "").filter(Boolean);
    if (symbols.length === 0 && getWorstSymbol(fcn) !== "-") symbols.push(getWorstSymbol(fcn));
    symbols.forEach((symbol) => {
      const normalized = symbol.toUpperCase();
      const current = map.get(normalized) || { symbol: normalized, count: 0, fcns: [] };
      current.count += 1;
      current.fcns.push(fcn.displayCode);
      map.set(normalized, current);
    });
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.symbol.localeCompare(b.symbol));
}

function UnderlyingMiniTable({ rows }: { rows: FCNUnderlyingResult[] }) {
  if (rows.length === 0) return <EmptyLine>No underlying detail yet.</EmptyLine>;

  return (
    <div className="divide-y divide-zinc-900 border border-zinc-800">
      {rows.map((row, index) => {
        const performance = row.performance;
        const performanceValue = nullableNumber(performance);
        return (
          <div className="grid gap-2 px-3 py-2 font-mono text-xs md:grid-cols-5" key={`${row.symbol || "underlying"}-${index}`}>
            <span className="font-semibold text-zinc-100">{row.symbol || "-"}</span>
            <span className="text-zinc-400">Initial {price(row.initial_price)}</span>
            <span className="text-zinc-400">Current {price(row.current_price)}</span>
            <span className={performanceValue !== null && performanceValue < 0 ? "text-red-300" : "text-emerald-300"}>
              Move {percent(performance)}
            </span>
            <span className="text-zinc-500">{sourceLabel(row.price_source, row.is_stale)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FcnPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [rawFcns, setRawFcns] = useState<FCNPositionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [summaryData, rawData] = await Promise.all([
          getMySummary(),
          getFcns().catch(() => []),
        ]);
        setSummary(summaryData);
        setRawFcns(Array.isArray(rawData) ? rawData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "FCN workspace unavailable.");
      } finally {
        setLoading(false);
      }
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const fcns = useMemo(() => mergeFcns(summary, rawFcns), [rawFcns, summary]);
  const totalNotional = fcns.reduce((sum, fcn) => sum + fcn.notionalValue, 0);
  const nearestKi = fcns
    .map((fcn) => distanceValue(getKiDistance(fcn)))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)[0];
  const highestRisk = fcns.some((fcn) => (fcn.risk_level || "").toLowerCase().includes("high"))
    ? "high"
    : fcns.some((fcn) => (fcn.risk_level || "").toLowerCase().includes("medium"))
      ? "medium"
      : fcns.length > 0
        ? "low"
        : "unknown";
  const nextCoupon = nearestDate(fcns.map((fcn) => fcn.next_coupon_date));
  const nextObservation = nearestDate(fcns.map((fcn) => fcn.next_observation_date));
  const exposures = exposureMap(fcns);
  const repeatedExposures = exposures.filter((item) => item.count > 1);
  const closestKiFcn = fcns
    .map((fcn) => ({ fcn, distance: distanceValue(getKiDistance(fcn)) }))
    .filter((item): item is { fcn: FcnView; distance: number } => item.distance !== null)
    .sort((a, b) => a.distance - b.distance)[0];
  const worstRows = fcns.map((fcn) => {
    const worstSymbol = getWorstSymbol(fcn);
    const detail = fcn.underlyingRows.find((row) => row.symbol === worstSymbol) || fcn.underlyingRows[0];
    return { fcn, worstSymbol, detail };
  });

  return (
    <AppShell title={t("page.fcn")} subtitle={labels.subtitle}>
      <div className="space-y-5">
        {error && (
          <div className="border border-red-500/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-5">
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="font-mono text-[10px] uppercase text-zinc-500">FCN Notional</div>
            <div className="mt-1 text-xl font-semibold">{money(totalNotional)}</div>
          </div>
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="font-mono text-[10px] uppercase text-zinc-500">Contracts</div>
            <div className="mt-1 text-xl font-semibold">{loading ? "-" : fcns.length}</div>
          </div>
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="font-mono text-[10px] uppercase text-zinc-500">Overall Risk</div>
            <div className={`mt-2 inline-block border px-2 py-1 font-mono text-xs uppercase ${riskClass(highestRisk)}`}>
              {highestRisk}
            </div>
          </div>
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="font-mono text-[10px] uppercase text-zinc-500">Nearest KI</div>
            <div className={`mt-1 text-xl font-semibold ${distanceTone(nearestKi)}`}>
              {nearestKi === undefined ? "-" : `${nearestKi.toFixed(1)}%`}
            </div>
          </div>
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="font-mono text-[10px] uppercase text-zinc-500">Next Coupon</div>
            <div className="mt-1 text-sm font-semibold text-zinc-200">{nextCoupon || "schedule pending"}</div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <Link className="border border-emerald-500/50 px-3 py-2 text-xs text-emerald-200" href="/input">
            Add FCN
          </Link>
          <Link className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300" href="/import">
            Import FCN
          </Link>
          <Link className="border border-zinc-700 px-3 py-2 text-xs text-zinc-300" href="/intelligence">
            View related Intelligence
          </Link>
        </div>

        <TerminalPanel title={labels.table} meta="worst-of / barrier monitor">
          {fcns.length === 0 && <EmptyLine>No FCN positions yet. Add structured products from /input.</EmptyLine>}
          <div className="overflow-x-auto">
            <div className="min-w-[980px] divide-y divide-zinc-900 border border-zinc-800">
              {fcns.map((fcn) => (
                <div className="grid grid-cols-[1.1fr_0.8fr_1.1fr_0.8fr_0.8fr_0.8fr_1fr_1fr] gap-3 px-3 py-2 font-mono text-xs" key={fcn.mergedKey}>
                  <div>
                    <div className="font-semibold text-zinc-100">{fcn.displayCode}</div>
                    <div className="text-[10px] text-zinc-500">{fcn.issuer || "issuer pending"}</div>
                  </div>
                  <div className="text-zinc-200">{money(fcn.notionalValue)}</div>
                  <div className="text-zinc-300">
                    {getWorstSymbol(fcn)}
                    <div className="text-[10px] text-zinc-500">{fcn.underlyingRows.length || "no"} underlyings</div>
                  </div>
                  <div className={distanceTone(getKiDistance(fcn))}>KI {percent(getKiDistance(fcn))}</div>
                  <div className="text-zinc-400">KO {percent(getKoDistance(fcn))}</div>
                  <div>
                    <span className={`border px-2 py-0.5 uppercase ${riskClass(fcn.risk_level)}`}>
                      {fcn.risk_level || "unknown"}
                    </span>
                  </div>
                  <div className="text-zinc-400">{fcn.next_observation_date || "obs pending"}</div>
                  <div className="text-zinc-400">{fcn.next_coupon_date || "coupon pending"}</div>
                </div>
              ))}
            </div>
          </div>
        </TerminalPanel>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <TerminalPanel title={labels.worst} meta="per contract stress point">
            <div className="divide-y divide-zinc-900 border border-zinc-800">
              {worstRows.length === 0 && <EmptyLine>No worst-of monitor data yet.</EmptyLine>}
              {worstRows.map(({ fcn, worstSymbol, detail }) => (
                <div className="grid gap-2 px-3 py-2 font-mono text-xs md:grid-cols-7" key={`${fcn.mergedKey}-worst`}>
                  <span className="font-semibold text-zinc-100">{fcn.displayCode}</span>
                  <span className="text-red-300">{worstSymbol}</span>
                  <span className="text-zinc-400">Initial {price(detail?.initial_price)}</span>
                  <span className="text-zinc-400">Current {price(detail?.current_price)}</span>
                  <span className={nullableNumber(detail?.performance) !== null && numberValue(detail?.performance) < 0 ? "text-red-300" : "text-emerald-300"}>
                    Move {percent(detail?.performance || fcn.worst_performance)}
                  </span>
                  <span className={distanceTone(detail?.distance_to_KI || detail?.distance_to_ki || detail?.distance_to_ki_pct || getKiDistance(fcn))}>
                    KI {percent(detail?.distance_to_KI || detail?.distance_to_ki || detail?.distance_to_ki_pct || getKiDistance(fcn))}
                  </span>
                  <span className="text-zinc-400">
                    KO {percent(detail?.distance_to_KO || detail?.distance_to_ko || detail?.distance_to_ko_pct || getKoDistance(fcn))}
                  </span>
                </div>
              ))}
            </div>
          </TerminalPanel>

          <TerminalPanel title={labels.exposure} meta="repeated underlyings">
            <div className="space-y-2">
              {exposures.length === 0 && <EmptyLine>No underlying exposure data yet.</EmptyLine>}
              {exposures.slice(0, 10).map((item) => (
                <div className="flex items-center justify-between gap-3 border-b border-zinc-900 pb-2 font-mono text-xs" key={item.symbol}>
                  <div>
                    <div className={item.count > 1 ? "font-semibold text-yellow-300" : "font-semibold text-zinc-200"}>
                      {item.symbol}
                    </div>
                    <div className="text-[10px] text-zinc-500">{item.fcns.slice(0, 4).join(" · ")}</div>
                  </div>
                  <span className={`border px-2 py-1 ${item.count > 1 ? "border-yellow-500/40 text-yellow-300" : "border-zinc-700 text-zinc-400"}`}>
                    {item.count}x
                  </span>
                </div>
              ))}
            </div>
          </TerminalPanel>
        </section>

        <TerminalPanel title="Underlying Detail" meta="current price / performance / source">
          <div className="space-y-3">
            {fcns.length === 0 && <EmptyLine>No FCN underlying detail yet.</EmptyLine>}
            {fcns.map((fcn) => (
              <div key={`${fcn.mergedKey}-underlyings`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-300">{fcn.displayCode}</h3>
                  <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${riskClass(fcn.risk_level)}`}>
                    {fcn.risk_level || "unknown"}
                  </span>
                </div>
                <UnderlyingMiniTable rows={fcn.underlyingRows} />
              </div>
            ))}
          </div>
        </TerminalPanel>

        <section className="grid gap-5 lg:grid-cols-2">
          <TerminalPanel title={labels.timeline} meta="coupon / observation">
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">NEXT OBSERVATION</span>
                <span className="text-zinc-200">{nextObservation || "schedule pending"}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">NEXT COUPON</span>
                <span className="text-zinc-200">{nextCoupon || "schedule pending"}</span>
              </div>
              <p className="pt-2 text-[11px] leading-5 text-zinc-500">
                Coupon schedule will be available once observation data is connected.
              </p>
            </div>
          </TerminalPanel>

          <TerminalPanel title={labels.interpretation} meta="compliance-safe">
            <div className="space-y-2 text-sm leading-6 text-zinc-300">
              <p>
                {closestKiFcn
                  ? `${closestKiFcn.fcn.displayCode} is currently the closest FCN to KI distance at ${closestKiFcn.distance.toFixed(1)}%, with ${getWorstSymbol(closestKiFcn.fcn)} as the current worst-of focus.`
                  : "No valid KI distance is available yet. Continue monitoring once market prices are connected."}
              </p>
              <p>
                {repeatedExposures.length > 0
                  ? `${repeatedExposures[0].symbol} appears across ${repeatedExposures[0].count} FCN contracts, indicating repeated underlying exposure.`
                  : "No repeated FCN underlying exposure is detected from the current payload."}
              </p>
              <p className="text-zinc-500">
                This workspace highlights monitoring priority only and does not provide trading instructions.
              </p>
            </div>
          </TerminalPanel>
        </section>
      </div>
    </AppShell>
  );
}
