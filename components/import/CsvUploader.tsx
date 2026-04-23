"use client";

import { useState, useRef } from "react";
import { parseCsvText, autoDetectMapping, type HotpepperMappedRow } from "@/lib/csv-parser";
import type { ParsedCsvRow } from "@/lib/csv-parser";

type MappingKey = keyof HotpepperMappedRow;

const REQUIRED_FIELDS: { key: MappingKey; label: string; required: boolean }[] = [
  { key: "storeName", label: "サロン名", required: true },
  { key: "period", label: "期間 (年月)", required: true },
  { key: "spend", label: "広告費・掲載料", required: true },
  { key: "views", label: "ページビュー数", required: false },
  { key: "clicks", label: "クリック数", required: false },
  { key: "leads", label: "予約数・リード数", required: false },
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
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number; errors: string[] } | null>(null);
  const [step, setStep] = useState<"upload" | "map" | "done">("upload");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  if (step === "done" && result) {
    return (
      <div className="card p-6 space-y-4">
        <div className={`flex items-center gap-3 p-4 rounded-lg ${result.imported > 0 ? "bg-green-50" : "bg-yellow-50"}`}>
          <span className="text-2xl">{result.imported > 0 ? "✅" : "⚠️"}</span>
          <div>
            <p className="font-semibold">{result.imported > 0 ? "インポート完了" : "インポート結果"}</p>
            <p className="text-sm text-gray-600">
              {result.total} 件中 {result.imported} 件をインポート ({result.skipped} 件スキップ)
            </p>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div>
            <p className="text-sm font-medium text-red-600 mb-1">エラー詳細</p>
            <ul className="text-xs text-red-500 space-y-0.5">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleReset} className="btn-secondary">別のCSVを取り込む</button>
          <a href="/dashboard" className="btn-primary inline-block text-center">ダッシュボードを確認</a>
        </div>
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="font-semibold mb-1">カラムのマッピング</h2>
          <p className="text-sm text-gray-500">CSVの各カラムをシステムのフィールドに対応付けてください</p>
        </div>

        <div className="space-y-3">
          {REQUIRED_FIELDS.map(({ key, label, required }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-sm font-medium w-36 flex-shrink-0">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <select
                value={mapping[key] ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                className="input flex-1"
              >
                <option value="">-- マッピングしない --</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              {mapping[key] && (
                <span className="text-xs text-green-600 w-16 flex-shrink-0">✓ 検出済</span>
              )}
            </div>
          ))}
        </div>

        {/* 契約率・客単価 */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-sm font-medium mb-3">ROI計算用のデフォルト値 (任意)</p>
          <div className="grid grid-cols-2 gap-3">
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
          <p className="text-xs text-gray-400 mt-1">※ 各店舗で後から個別に変更可能です</p>
        </div>

        {/* プレビュー */}
        {preview.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium mb-2">プレビュー (先頭5行)</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="px-2 py-1 bg-gray-50 border border-gray-200 text-left font-medium text-gray-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} className="px-2 py-1 border border-gray-100 text-gray-700">
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

        <div className="flex gap-3">
          <button onClick={handleReset} className="btn-secondary">戻る</button>
          <button
            onClick={handleImport}
            disabled={importing || !mapping.storeName || !mapping.period || !mapping.spend}
            className="btn-primary flex-1"
          >
            {importing ? "インポート中..." : "インポート実行"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold mb-4">ホットペッパービューティ CSVインポート</h2>

      <label className="block">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-base font-medium text-gray-700">CSVファイルをクリックして選択</p>
          <p className="text-sm text-gray-400 mt-1">または、ここにドラッグ＆ドロップ</p>
          <p className="text-xs text-gray-400 mt-2">UTF-8 または Shift-JIS対応</p>
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
  );
}
