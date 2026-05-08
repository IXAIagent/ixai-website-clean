"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getToken,
  ImportErrorItem,
  PortfolioCsvImportResponse,
  uploadPortfolioCsv,
} from "../lib/api";

type PreviewRow = {
  row: number;
  asset_type: string;
  symbol: string;
  quantity: string;
  avg_price: string;
  currency: string;
  amount: string;
};

const PREVIEW_COLUMNS = [
  "asset_type",
  "symbol",
  "quantity",
  "avg_price",
  "currency",
  "amount",
] as const;

function fileSizeLabel(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function numberText(value: unknown, fallback = "0") {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parsePreview(text: string): PreviewRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const indexFor = (name: string) => headers.indexOf(name);

  return lines.slice(1, 11).map((line, index) => {
    const values = parseCsvLine(line);
    const value = (name: string) => {
      const position = indexFor(name);
      return position >= 0 ? values[position] || "" : "";
    };

    return {
      row: index + 2,
      asset_type: value("asset_type"),
      symbol: value("symbol"),
      quantity: value("quantity"),
      avg_price: value("avg_price"),
      currency: value("currency"),
      amount: value("amount"),
    };
  });
}

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<PortfolioCsvImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  const canImport = useMemo(() => Boolean(file) && !loading, [file, loading]);

  async function handleFile(nextFile: File | undefined) {
    setResult(null);
    setError("");
    setStatus("");

    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setPreviewRows([]);
      setError("請上傳 .csv 檔案。");
      return;
    }

    setFile(nextFile);
    try {
      const text = await nextFile.text();
      setPreviewRows(parsePreview(text));
      setStatus("CSV 已載入，請確認預覽後匯入。");
    } catch {
      setPreviewRows([]);
      setError("無法讀取 CSV 檔案。");
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  async function handleImport() {
    if (!file) return;

    setLoading(true);
    setError("");
    setStatus("匯入中...");
    setResult(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);

    try {
      const response = await uploadPortfolioCsv(file, controller.signal);
      setResult(response);
      setStatus("CSV 匯入完成。");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("匯入逾時，請稍後再試。");
      } else {
        setError(err instanceof Error ? err.message : "CSV 匯入失敗。");
      }
      setStatus("");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  const errors: ImportErrorItem[] = Array.isArray(result?.errors)
    ? result.errors
    : [];

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase text-emerald-400">
              IXAI Agent / 一玄AI
            </div>
            <h1 className="mt-2 text-3xl font-bold">Import Portfolio CSV</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              上傳 CSV 匯入 stock、crypto、cash。檔案只會送往 backend 解析，不保存原始檔。
            </p>
          </div>

          <Link
            className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900"
            href="/dashboard"
          >
            Back to Dashboard
          </Link>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl shadow-emerald-950/10">
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition ${
              dragActive
                ? "border-emerald-400 bg-emerald-400/10"
                : "border-zinc-700 bg-black/40 hover:border-emerald-400/60"
            }`}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleInputChange}
              type="file"
            />
            <div className="text-lg font-semibold text-white">
              Drag CSV here or click to upload
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              支援 .csv，MVP 不支援 Excel / FCN import。
            </div>
          </label>

          {file && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
              <div className="font-semibold text-white">{file.name}</div>
              <div className="mt-1 text-zinc-400">{fileSizeLabel(file.size)}</div>
            </div>
          )}

          {status && (
            <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              {status}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Preview</h2>
              <p className="mt-1 text-sm text-zinc-400">
                最多顯示前 10 筆。完整驗證會在匯入時由 backend 處理。
              </p>
            </div>
            <button
              className="rounded-xl border border-emerald-400/50 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
              disabled={!canImport}
              onClick={handleImport}
              type="button"
            >
              {loading ? "Importing..." : "Import CSV"}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-3">row</th>
                  {PREVIEW_COLUMNS.map((column) => (
                    <th className="px-4 py-3" key={column}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {previewRows.length === 0 && (
                  <tr>
                    <td className="px-4 py-5 text-zinc-400" colSpan={7}>
                      尚未選擇 CSV，或檔案沒有可預覽資料。
                    </td>
                  </tr>
                )}
                {previewRows.map((row) => (
                  <tr className="bg-black/20 text-zinc-200" key={row.row}>
                    <td className="px-4 py-3 text-zinc-500">{row.row}</td>
                    {PREVIEW_COLUMNS.map((column) => (
                      <td className="px-4 py-3" key={column}>
                        {row[column] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {result && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <h2 className="text-xl font-semibold">Import Result</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-sm text-zinc-400">imported</div>
                <div className="mt-2 text-2xl font-bold text-emerald-300">
                  {numberText(result.imported)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-sm text-zinc-400">updated</div>
                <div className="mt-2 text-2xl font-bold text-blue-300">
                  {numberText(result.updated)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-sm text-zinc-400">skipped</div>
                <div className="mt-2 text-2xl font-bold text-yellow-300">
                  {numberText(result.skipped)}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-black/30 p-4">
              <div className="font-semibold text-white">Row Errors</div>
              {errors.length === 0 ? (
                <div className="mt-3 text-sm text-zinc-400">No row errors.</div>
              ) : (
                <div className="mt-3 grid gap-2">
                  {errors.map((item, index) => (
                    <div
                      className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100"
                      key={`${numberText(item.row, "row")}-${index}`}
                    >
                      row {numberText(item.row, "-")} {item.error || "import error"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
