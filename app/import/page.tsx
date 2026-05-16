"use client";

import { ChangeEvent, DragEvent, useEffect, useState } from "react";

import { AppShell } from "../components/layout/AppShell";
import { EmptyLine, TerminalPanel } from "../components/layout/TerminalPanel";
import {
  getImportHistory,
  ImportHistoryItem,
  PortfolioCsvImportResponse,
  PortfolioCsvPreviewResponse,
  previewPortfolioCsv,
  uploadPortfolioCsv,
} from "../lib/api";

const integrations = ["Manual CSV", "Futu", "Binance", "IBKR"];

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function fileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export default function ImportWorkspacePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<PortfolioCsvPreviewResponse | null>(null);
  const [result, setResult] = useState<PortfolioCsvImportResponse | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    try {
      const response = await getImportHistory();
      setHistory(Array.isArray(response.items) ? response.items.slice(0, 8) : []);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function handleFile(nextFile?: File) {
    setError("");
    setStatus("");
    setPreview(null);
    setResult(null);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError("請上傳 .csv 檔案。");
      setFile(null);
      return;
    }
    setFile(nextFile);
    setStatus("CSV ready for backend preview.");
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError("");
    setStatus("Preview / Validate running...");
    try {
      const response = await previewPortfolioCsv(file);
      setPreview(response);
      setStatus("Preview completed. Confirm import when ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!file || !preview) return;
    setLoading(true);
    setError("");
    setStatus("Confirm import running...");
    try {
      const response = await uploadPortfolioCsv(file);
      setResult(response);
      setStatus("Import completed.");
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Import / 匯入"
      subtitle="CSV import workspace with broker connector placeholders."
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <TerminalPanel title="CSV Import Panel" meta="preview / confirm">
            <label
              className={`block border border-dashed px-4 py-10 text-center transition ${
                dragActive ? "border-emerald-400 bg-emerald-400/10" : "border-zinc-700 bg-black/20"
              }`}
              onDragLeave={(event: DragEvent<HTMLLabelElement>) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDragOver={(event: DragEvent<HTMLLabelElement>) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDrop={(event: DragEvent<HTMLLabelElement>) => {
                event.preventDefault();
                setDragActive(false);
                handleFile(event.dataTransfer.files?.[0]);
              }}
            >
              <input accept=".csv,text/csv" className="hidden" type="file" onChange={handleInput} />
              <div className="font-mono text-sm text-zinc-200">
                {file ? file.name : "Drop CSV here or click to upload"}
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                {file ? fileSize(file.size) : "asset_type,symbol,quantity,avg_price,current_price,currency,amount"}
              </div>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="border border-zinc-700 px-4 py-2 text-sm text-zinc-200 disabled:opacity-50"
                disabled={!file || loading}
                onClick={() => void handlePreview()}
                type="button"
              >
                Preview
              </button>
              <button
                className="border border-emerald-400/60 px-4 py-2 text-sm text-emerald-100 disabled:opacity-50"
                disabled={!file || !preview || loading}
                onClick={() => void handleConfirm()}
                type="button"
              >
                Confirm Import
              </button>
            </div>

            {status && <div className="mt-3 border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">{status}</div>}
            {error && <div className="mt-3 border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
          </TerminalPanel>

          <TerminalPanel title="Import Status" meta="result">
            {!preview && !result && <EmptyLine>No import preview yet.</EmptyLine>}
            {preview?.summary && (
              <div className="grid gap-2 font-mono text-xs md:grid-cols-4">
                <Metric label="will import" value={preview.summary.will_import} />
                <Metric label="will update" value={preview.summary.will_update} />
                <Metric label="will skip" value={preview.summary.will_skip} />
                <Metric label="errors" value={preview.summary.errors} />
              </div>
            )}
            {result && (
              <div className="mt-3 grid gap-2 font-mono text-xs md:grid-cols-4">
                <Metric label="imported" value={result.imported} />
                <Metric label="updated" value={result.updated} />
                <Metric label="skipped" value={result.skipped} />
                <Metric label="batch" value={result.batch_id} />
              </div>
            )}
          </TerminalPanel>
        </div>

        <div className="space-y-4">
          <TerminalPanel title="Future Integrations" meta="connectors">
            <div className="grid gap-2">
              {integrations.map((item) => (
                <div className="border border-zinc-800 bg-black/20 px-3 py-2 font-mono text-xs" key={item}>
                  <div className="text-zinc-200">{item}</div>
                  <div className="mt-1 text-zinc-500">{item === "Manual CSV" ? "available" : "planned connector"}</div>
                </div>
              ))}
            </div>
          </TerminalPanel>

          <TerminalPanel title="Recent Imports" meta="audit">
            <div className="divide-y divide-zinc-800 border border-zinc-800">
              {history.length === 0 && <EmptyLine>No recent imports.</EmptyLine>}
              {history.map((item) => (
                <div className="px-3 py-2 font-mono text-xs" key={String(item.id || item.created_at)}>
                  <div className="flex justify-between gap-3">
                    <span className="truncate text-zinc-200">{textValue(item.file_name, "portfolio.csv")}</span>
                    <span className="text-zinc-500">{textValue(item.status, "-")}</span>
                  </div>
                  <div className="mt-1 text-zinc-500">
                    imported {textValue(item.imported, "0")} · updated {textValue(item.updated, "0")} · skipped {textValue(item.skipped, "0")}
                  </div>
                </div>
              ))}
            </div>
          </TerminalPanel>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="border border-zinc-800 bg-black/20 p-2">
      <div className="uppercase text-zinc-600">{label}</div>
      <div className="mt-1 text-zinc-200">{textValue(value, "0")}</div>
    </div>
  );
}
