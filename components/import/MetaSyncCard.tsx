"use client";

import { useCallback, useEffect, useState } from "react";
import { formatJPY, formatNumber } from "@/lib/calculations";
import { IconSparkles, IconCircleCheck, IconClose } from "@/components/ui/Icons";

interface StatusResponse {
  configured: boolean;
  connected?: boolean;
  accountId?: string;
  accountName?: string;
  currency?: string;
  accountStatus?: number;
  reason?: string;
  error?: string;
}

interface SyncResponse {
  success: boolean;
  imported: number;
  skipped: number;
  total: number;
  rawRows: number;
  errors?: string[];
  items?: Array<{ store: string; period: string; spend: number; leads: number }>;
}

const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  1: "有効",
  2: "無効",
  3: "未請求",
  7: "保留中のレビュー",
  9: "進行中",
  100: "終了",
  101: "クローズ",
  201: "何らかの保留",
  202: "一時停止",
};

export default function MetaSyncCard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [contractRate, setContractRate] = useState<string>("");
  const [avgOrderValue, setAvgOrderValue] = useState<string>("");

  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/meta/status");
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
    } catch (e) {
      setStatus({ configured: false, reason: String(e) });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/meta/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(since ? { since } : {}),
          ...(until ? { until } : {}),
          ...(contractRate ? { defaultContractRate: Number(contractRate) } : {}),
          ...(avgOrderValue ? { defaultAvgOrderValue: Number(avgOrderValue) } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : JSON.stringify(data.error)
        );
        return;
      }
      setResult(data as SyncResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: "#1877F2" }}
          >
            <IconSparkles size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Meta広告 API同期</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Marketing API から実績データを直接取得し、Campaign テーブルに反映します
            </p>
          </div>
        </div>
      </div>

      {/* 接続状態 */}
      <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50">
        {loadingStatus ? (
          <p className="text-sm text-stone-500">接続状態を確認中…</p>
        ) : !status?.configured ? (
          <div className="flex items-start gap-2">
            <IconClose size={16} className="text-rose-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-700">未設定</p>
              <p className="text-xs text-stone-600 mt-0.5">
                {status?.reason ?? "環境変数が未設定です。"}
              </p>
            </div>
          </div>
        ) : status.connected ? (
          <div className="flex items-start gap-2">
            <IconCircleCheck size={16} className="text-emerald-500 mt-0.5" />
            <div className="text-xs text-stone-700 space-y-0.5">
              <p className="text-sm font-semibold text-emerald-700">接続OK</p>
              <p>
                <span className="text-stone-500">アカウント: </span>
                <span className="font-mono">{status.accountId}</span>
                {status.accountName ? ` / ${status.accountName}` : ""}
              </p>
              <p>
                <span className="text-stone-500">通貨: </span>
                {status.currency}{" "}
                <span className="text-stone-500 ml-3">ステータス: </span>
                {ACCOUNT_STATUS_LABELS[status.accountStatus ?? 0] ?? status.accountStatus}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <IconClose size={16} className="text-rose-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-700">接続失敗</p>
              <p className="text-xs text-stone-600 mt-0.5 break-all">{status.error}</p>
              <p className="text-xs text-stone-500 mt-1">
                トークンの権限（ads_read）と広告アカウント割当を確認してください。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 同期パラメータ */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-stone-600 mb-1 block">開始日（任意）</span>
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-stone-600 mb-1 block">終了日（任意）</span>
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-stone-600 mb-1 block">
            デフォルト契約率（%）
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            placeholder="30"
            value={contractRate}
            onChange={(e) => setContractRate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-stone-600 mb-1 block">デフォルト客単価（円）</span>
          <input
            type="number"
            min={0}
            step={100}
            placeholder="15000"
            value={avgOrderValue}
            onChange={(e) => setAvgOrderValue(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </label>
      </div>
      <p className="text-xs text-stone-500 -mt-2">
        日付を未指定の場合は直近90日分を取得します。契約率・客単価はこの同期対象レコードのデフォルト値として設定され、後から店舗管理で上書きできます。
      </p>

      {/* 同期ボタン */}
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing || !status?.connected}
        className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#1877F2] to-[#3B82F6] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {syncing ? "同期中…" : "Meta広告データを同期"}
      </button>

      {/* 結果表示 */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-700 mb-1">エラー</p>
          <p className="text-xs text-rose-700 break-all">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <IconCircleCheck size={16} className="text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700">同期完了</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-stone-500">取得行数</p>
              <p className="font-bold text-stone-900">{result.rawRows}</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-stone-500">保存</p>
              <p className="font-bold text-emerald-700">{result.imported}</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-stone-500">スキップ</p>
              <p className="font-bold text-stone-500">{result.skipped}</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-stone-500">合計</p>
              <p className="font-bold text-stone-900">{result.total}</p>
            </div>
          </div>

          {result.items && result.items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-600 mb-1.5">
                反映された店舗×期間（最大20件表示）
              </p>
              <div className="max-h-40 overflow-y-auto rounded-lg bg-white">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-stone-100">
                    <tr>
                      <th className="text-left px-2 py-1.5">店舗</th>
                      <th className="text-left px-2 py-1.5">期間</th>
                      <th className="text-right px-2 py-1.5">広告費</th>
                      <th className="text-right px-2 py-1.5">CV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((it, i) => (
                      <tr key={i} className="border-t border-stone-100">
                        <td className="px-2 py-1.5">{it.store}</td>
                        <td className="px-2 py-1.5 font-mono text-stone-500">{it.period}</td>
                        <td className="px-2 py-1.5 text-right">{formatJPY(it.spend)}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(it.leads)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-rose-700 mb-1">エラー</p>
              <ul className="text-xs text-rose-700 space-y-0.5 list-disc list-inside">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-stone-500">
            ダッシュボードを開くと反映されたデータが表示されます。
          </p>
        </div>
      )}
    </div>
  );
}
