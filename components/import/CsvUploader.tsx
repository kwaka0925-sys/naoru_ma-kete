"use client";

import { useState, useRef } from "react";
import { parseCsvText, autoDetectMapping, type HotpepperMappedRow } from "@/lib/csv-parser";
import type { ParsedCsvRow } from "@/lib/csv-parser";
import {
  IconUpload,
  IconCircleCheck,
  IconClose,
} from "@/components/ui/Icons";

type MappingKey = keyof HotpepperMappedRow;

const REQUIRED_FIELDS: { key: MappingKey; label: string; required: boolean }[] = [
  { key: "storeName", label: "サロン名", required: true },
  { key: "period", label: "期間 (年月)", required: true },
  { key: "spend", label: "広告費・掲載料", required: true },
  { key: "views", label: "ページビュー数", required: false },
  { key: "clicks", label: "クリック数", required: false },
  { key: "leads", label: "予約数・リード数", required: false },
];

const STEPS = [
  { key: "upload", label: "アップロード" },
  { key: "map", label: "マッピング" },
  { key: "done", label: "完了" },
];

export default function CsvUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<ParsedCsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<MappingKey, string>>({} as Record<MappingKey, string>);
  const [csvText, setCsvText] = useState("");
  const [contractRate, setContractRate] = useState("");
  const [avgOrderValue, setAvgOrderValue] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    total: number;
    errors: string[];
  } | null>(null);
  const [step, setStep] = useState<"upload" | "map" | "done">("upload");
  const [dragging, setDragging] = useState(false);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      const { headers: h, rows } = parseCsvText(text);
      setHeaders(h);
      setPreview(rows.slice(0, 5));
      const detected = autoDetectMapping(h) as Record<MappingKey, string>;
      setMapping(detected);
      setStep("map");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    const res = await fetch("/api/hotpepper/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvText,
        mapping,
        defaultContractRate: contractRate ? parseFloat(contractRate) : undefined,
        defaultAvgOrderValue: avgOrderValue ? parseFloat(avgOrderValue) : undefined,
      }),
    });

    const data = await res.json();
    setResult(data);
    setImporting(false);
    setStep("done");
  };

  const handleReset = () => {
    setStep("upload");
    setCsvText("");
    setHeaders([]);
    setPreview([]);
    setMapping({} as Record<MappingKey, string>);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* ステップインジケータ */}
      <div className="card p-5">
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const currentIdx = STEPS.findIndex((x) => x.key === step);
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done
                        ? "bg-emerald-500 text-white shadow-sm"
                        : active
                        ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm ring-4 ring-indigo-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {done ? <IconCircleCheck size={14} /> : i + 1}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      active ? "text-slate-900" : done ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 rounded-full transition-all ${
                      done ? "bg-emerald-500" : "bg-slate-100"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step1: Upload */}
      {step === "upload" && (
        <div className="card p-6">
          <h2 className="section-title mb-1">CSVファイルをアップロード</h2>
          <p className="section-subtitle mb-5">ホットペッパービューティからエクスポートしたCSVを選択</p>

          <label className="block">
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-indigo-400 bg-indigo-50/50 scale-[1.01]"
                  : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                <IconUpload size={22} />
              </div>
              <p className="text-base font-semibold text-slate-800">
                クリックしてCSVファイルを選択
              </p>
              <p className="text-sm text-slate-500 mt-1">
                または、ここにドラッグ＆ドロップ
              </p>
              <p className="text-xs text-slate-400 mt-3">UTF-8 / Shift-JIS 対応 · 最大50MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="sr-only"
            />
          </label>
        </div>
      )}

      {/* Step2: Map */}
      {step === "map" && (
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="section-title mb-1">カラムのマッピング</h2>
            <p className="section-subtitle">CSVの各カラムをシステムのフィールドに対応付けてください</p>
          </div>

          <div className="space-y-2">
            {REQUIRED_FIELDS.map(({ key, label, required }) => (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-slate-50/50 border border-slate-100"
              >
                <label className="text-sm font-semibold text-slate-700 w-40 flex-shrink-0 flex items-center gap-1">
                  {label}
                  {required && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={mapping[key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                  className="input flex-1"
                >
                  <option value="">-- マッピングしない --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                {mapping[key] && (
                  <span className="badge-success flex-shrink-0">
                    <IconCircleCheck size={10} />
                    検出済
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ROI計算用 */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1">ROI計算用のデフォルト値</h3>
            <p className="text-xs text-slate-500 mb-3">
              未設定の場合でも各店舗で後から個別に変更可能です
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">デフォルト契約率 (%)</label>
                <input
                  type="number"
                  value={contractRate}
                  onChange={(e) => setContractRate(e.target.value)}
                  className="input"
                  placeholder="例: 30"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div>
                <label className="label">デフォルト客単価 (円)</label>
                <input
                  type="number"
                  value={avgOrderValue}
                  onChange={(e) => setAvgOrderValue(e.target.value)}
                  className="input"
                  placeholder="例: 15000"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* プレビュー */}
          {preview.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-sm font-bold text-slate-900 mb-2">プレビュー (先頭5行)</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap border-b border-slate-200"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        {headers.map((h) => (
                          <td
                            key={h}
                            className="px-3 py-2 text-slate-700 whitespace-nowrap"
                          >
                            {row[h] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={handleReset} className="btn-secondary">
              戻る
            </button>
            <button
              onClick={handleImport}
              disabled={importing || !mapping.storeName || !mapping.period || !mapping.spend}
              className="btn-primary flex-1"
            >
              {importing ? "インポート中..." : "インポート実行"}
            </button>
          </div>
        </div>
      )}

      {/* Step3: Done */}
      {step === "done" && result && (
        <div className="card p-8 space-y-5 animate-fade-in-up">
          <div className="text-center">
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                result.imported > 0
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30"
                  : "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30"
              } text-white`}
            >
              {result.imported > 0 ? <IconCircleCheck size={28} /> : <IconClose size={28} />}
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {result.imported > 0 ? "インポート完了" : "インポート結果"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {result.total} 件中 {result.imported} 件をインポート ({result.skipped} 件スキップ)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                合計
              </p>
              <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">
                {result.total}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                成功
              </p>
              <p className="text-xl font-bold text-emerald-600 tabular-nums mt-1">
                {result.imported}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                スキップ
              </p>
              <p className="text-xl font-bold text-amber-600 tabular-nums mt-1">
                {result.skipped}
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-4">
              <p className="text-sm font-bold text-red-700 mb-2">エラー詳細</p>
              <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-red-400">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleReset} className="btn-secondary flex-1">
              別のCSVを取り込む
            </button>
            <a href="/dashboard" className="btn-primary flex-1 justify-center">
              ダッシュボードを確認
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
