"use client";

import { ChangeEvent, DragEvent, ReactNode, useEffect, useState } from "react";

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
import { useI18n } from "../lib/i18n";

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
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<PortfolioCsvPreviewResponse | null>(null);
  const [result, setResult] = useState<PortfolioCsvImportResponse | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowErrorImport, setAllowErrorImport] = useState(false);
  const previewRows = Array.isArray(preview?.rows) ? preview.rows : [];
  const previewErrorCount = Number(preview?.summary?.errors ?? 0);
  const canConfirm = Boolean(file && preview && !loading && (previewErrorCount === 0 || allowErrorImport));
  function actionTone(actionValue: unknown) {
    const action = textValue(actionValue).toLowerCase();
    if (action.includes("update")) return "border-[var(--ixai-risk-watch)]/40 text-[var(--ixai-risk-watch)]";
    if (action.includes("skip")) return "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-muted)]";
    if (action.includes("import") || action.includes("write")) return "border-[var(--ixai-accent)]/40 text-[var(--ixai-risk-clear)]";
    return "border-[var(--ixai-border-subtle)] text-[var(--ixai-text-strong)]";
  }

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
    setAllowErrorImport(false);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError(t("import.csvOnly"));
      setFile(null);
      return;
    }
    setFile(nextFile);
    setStatus(t("import.statusReady"));
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError("");
    setStatus(t("import.statusPreviewRunning"));
    try {
      const response = await previewPortfolioCsv(file);
      setPreview(response);
      setAllowErrorImport(false);
      setStatus(t("import.statusPreviewDone"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("import.previewFailed"));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    const selectedFile = file;
    if (!selectedFile) return;
    setLoading(true);
    setError("");
    setStatus(t("import.statusConfirmRunning"));
    try {
      const response = await uploadPortfolioCsv(selectedFile);
      setResult(response);
      setStatus(t("import.statusImportDone"));
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("import.importFailed"));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title={t("page.import")}
      subtitle={t("import.subtitle")}
    >
      <div className="mb-4 border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-card)] px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ixai-text-subtle)]">
          {t("import.normalized")}
        </div>
        <div className="mt-2 text-sm leading-6 text-[var(--ixai-text-strong)]">
          {t("import.workflowGuide")}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <TerminalPanel title={t("import.panel")} meta={t("import.previewConfirmMeta")}>
            <label
              className={`block border border-dashed px-4 py-10 text-center transition ${
                dragActive ? "border-[var(--ixai-accent)] bg-[rgba(176,141,87,0.10)]" : "border-[var(--ixai-border-subtle)] bg-black/20"
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
              <div className="font-mono text-sm text-[var(--ixai-text-strong)]">
                {file ? file.name : t("import.dropCsv")}
              </div>
              <div className="mt-2 text-xs text-[var(--ixai-text-subtle)]">
                {file ? fileSize(file.size) : t("import.templateColumns")}
              </div>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="border border-[var(--ixai-border-subtle)] px-4 py-2 text-sm text-[var(--ixai-text-strong)] disabled:opacity-50"
                disabled={!file || loading}
                onClick={() => void handlePreview()}
                type="button"
              >
                {t("import.previewAction")}
              </button>
              <button
                className="border border-[var(--ixai-accent)]/60 px-4 py-2 text-sm text-[var(--ixai-risk-clear)] disabled:opacity-50"
                disabled={!canConfirm}
                onClick={() => void handleConfirm()}
                type="button"
              >
                {t("import.confirm")}
              </button>
            </div>
            {previewErrorCount > 0 && preview && (
              <label className="mt-3 flex items-start gap-2 border border-[var(--ixai-risk-watch)]/30 bg-[rgba(212,181,138,0.10)] px-3 py-2 font-mono text-xs text-[var(--ixai-risk-watch)]">
                <input
                  checked={allowErrorImport}
                  className="mt-0.5"
                  onChange={(event) => setAllowErrorImport(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("import.overrideErrors")}</span>
              </label>
            )}

            {status && <div className="mt-3 border border-[var(--ixai-accent)]/30 bg-[rgba(176,141,87,0.10)] px-3 py-2 text-sm text-[var(--ixai-risk-clear)]">{status}</div>}
            {error && <div className="mt-3 border border-[var(--ixai-risk-critical)]/30 bg-[rgba(210,122,122,0.10)] px-3 py-2 text-sm text-[var(--ixai-risk-critical)]">{error}</div>}
          </TerminalPanel>

          <TerminalPanel title={t("import.statusPanel")} meta={t("import.resultMeta")}>
            <div className="mb-3 text-sm leading-6 text-[var(--ixai-text-muted)]">
              {t("import.previewGuide")}
            </div>
            {!preview && !result && <EmptyLine>{t("import.noPreview")}</EmptyLine>}
            {preview?.summary && (
              <div className="grid gap-2 font-mono text-xs md:grid-cols-4">
                <Metric label={t("import.willImport")} value={preview.summary.will_import} />
                <Metric label={t("import.willUpdate")} value={preview.summary.will_update} />
                <Metric label={t("import.willSkip")} value={preview.summary.will_skip} />
                <Metric label={t("import.errors")} value={preview.summary.errors} />
              </div>
            )}
            {preview && (
              <div className="mt-4">
                <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--ixai-text-subtle)]">
                  {t("import.preview")}
                </div>
                {previewRows.length === 0 ? (
                  <EmptyLine>{t("import.noPreviewRows")}</EmptyLine>
                ) : (
                  <div className="overflow-x-auto border border-[var(--ixai-border-subtle)]">
                    <table className="min-w-[900px] w-full border-collapse font-mono text-xs">
                      <thead className="bg-[var(--ixai-surface-card)] text-left uppercase text-[var(--ixai-text-subtle)]">
                        <tr>
                          <PreviewHead>{t("import.row")}</PreviewHead>
                          <PreviewHead>{t("import.assetType")}</PreviewHead>
                          <PreviewHead>{t("import.inputSymbol")}</PreviewHead>
                          <PreviewHead>{t("import.canonicalSymbol")}</PreviewHead>
                          <PreviewHead>{t("import.action")}</PreviewHead>
                          <PreviewHead>{t("import.quantity")}</PreviewHead>
                          <PreviewHead>{t("import.avgPrice")}</PreviewHead>
                          <PreviewHead>{t("import.currentPrice")}</PreviewHead>
                          <PreviewHead>{t("import.currency")}</PreviewHead>
                          <PreviewHead>{t("import.amount")}</PreviewHead>
                          <PreviewHead>{t("import.errors")}</PreviewHead>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row) => {
                          const rowErrors = Array.isArray(row.errors) ? row.errors.filter(Boolean) : [];
                          const action = textValue(row.action).toLowerCase();
                          const hasError = rowErrors.length > 0;
                          const isSkipped = action === "skip" || action === "skipped";
                          return (
                            <tr
                              className={`border-t border-[var(--ixai-border-subtle)] ${
                                hasError
                                  ? "bg-[var(--ixai-surface-card)] text-[var(--ixai-risk-critical)]"
                                  : isSkipped
                                    ? "bg-[var(--ixai-surface-card)] text-[var(--ixai-risk-watch)]"
                                    : "text-[var(--ixai-text-strong)]"
                              }`}
                              key={`${row.row}-${row.asset_type}-${row.input_symbol}-${row.action}`}
                            >
                              <PreviewCell>{textValue(row.row)}</PreviewCell>
                              <PreviewCell>{textValue(row.asset_type)}</PreviewCell>
                              <PreviewCell>{textValue(row.input_symbol)}</PreviewCell>
                              <PreviewCell>{textValue(row.canonical_symbol)}</PreviewCell>
                              <PreviewCell>
                                <span className={`inline-block border px-2 py-0.5 ${actionTone(row.action)}`}>
                                  {textValue(row.action)}
                                </span>
                              </PreviewCell>
                              <PreviewCell>{textValue(row.quantity)}</PreviewCell>
                              <PreviewCell>{textValue(row.avg_price)}</PreviewCell>
                              <PreviewCell>{textValue(row.current_price)}</PreviewCell>
                              <PreviewCell>{textValue(row.currency)}</PreviewCell>
                              <PreviewCell>{textValue(row.amount)}</PreviewCell>
                              <PreviewCell>{rowErrors.length > 0 ? rowErrors.join("; ") : "-"}</PreviewCell>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {result && (
              <div className="mt-3 grid gap-2 font-mono text-xs md:grid-cols-4">
                <Metric label={t("import.imported")} value={result.imported} />
                <Metric label={t("import.updated")} value={result.updated} />
                <Metric label={t("import.skipped")} value={result.skipped} />
                <Metric label={t("import.batch")} value={result.batch_id} />
              </div>
            )}
          </TerminalPanel>
        </div>

        <div className="space-y-4">
          <TerminalPanel title={t("import.futureIntegrations")} meta="connectors">
            <div className="grid gap-2">
              {integrations.map((item) => (
                <div className="border border-[var(--ixai-border-subtle)] bg-black/20 px-3 py-2 font-mono text-xs" key={item}>
                  <div className="text-[var(--ixai-text-strong)]">{item}</div>
                  <div className="mt-1 text-[var(--ixai-text-subtle)]">{item === "Manual CSV" ? t("status.active") : t("import.plannedConnector")}</div>
                </div>
              ))}
            </div>
          </TerminalPanel>

          <TerminalPanel title={t("import.recentImports")} meta="audit">
            <div className="divide-y divide-[var(--ixai-border-subtle)] border border-[var(--ixai-border-subtle)]">
              {history.length === 0 && <EmptyLine>{t("import.noRecentImports")}</EmptyLine>}
              {history.map((item) => (
                <div className="px-3 py-2 font-mono text-xs" key={String(item.id || item.created_at)}>
                  <div className="flex justify-between gap-3">
                    <span className="truncate text-[var(--ixai-text-strong)]">{textValue(item.file_name, "portfolio.csv")}</span>
                    <span className="text-[var(--ixai-text-subtle)]">{textValue(item.status, "-")}</span>
                  </div>
                  <div className="mt-1 text-[var(--ixai-text-subtle)]">
                    {t("import.imported")} {textValue(item.imported, "0")} · {t("import.updated")} {textValue(item.updated, "0")} · {t("import.skipped")} {textValue(item.skipped, "0")}
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
    <div className="border border-[var(--ixai-border-subtle)] bg-black/20 p-2">
      <div className="uppercase text-[var(--ixai-text-subtle)]">{label}</div>
      <div className="mt-1 text-[var(--ixai-text-strong)]">{textValue(value, "0")}</div>
    </div>
  );
}

function PreviewHead({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2 font-medium">{children}</th>;
}

function PreviewCell({ children }: { children: ReactNode }) {
  return <td className="max-w-[220px] whitespace-nowrap px-3 py-2 align-top">{children}</td>;
}
