"use client";

import { useCallback, useEffect, useState } from "react";
import { formatJPY, formatNumber, formatPercent } from "@/lib/calculations";
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

interface Metrics {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchases: number;
  purchaseValue: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  costPerPurchase: number | null;
  roas: number | null;
}

interface CampaignMetrics extends Metrics {
  campaignId: string;
  campaignName: string;
}

interface PeriodMetrics extends Metrics {
  period: string;
}

interface InsightsResponse {
  configured: boolean;
  accountId: string;
  accountName: string;
  currency: string;
  period: { since: string | null; until: string | null };
  overall: Metrics;
  byCampaign: CampaignMetrics[];
  byPeriod: PeriodMetrics[];
  rawRowCount: number;
  fetchedAt: string;
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

export default function MetaInsightsCard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");

  const [fetching, setFetching] = useState(false);
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/meta/status");
      const json = (await res.json()) as StatusResponse;
      setStatus(json);
    } catch (e) {
      setStatus({ configured: false, reason: String(e) });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleFetch = async () => {
    setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (since) params.set("since", since);
      if (until) params.set("until", until);
      const res = await fetch(`/api/meta/insights?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : JSON.stringify(json.error));
        return;
      }
      setData(json as InsightsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetching(false);
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
            <h2 className="text-lg font-bold text-stone-900">Meta広告 ライブ取得</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Marketing APIから実績を直接取得して表示（DB保存なし・将来的に保存切替予定）
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
                {status.currency}
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
            </div>
          </div>
        )}
      </div>

      {/* 期間指定 */}
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
      </div>
      <p className="text-xs text-stone-500 -mt-2">
        未指定の場合は直近90日分を取得します。
      </p>

      <button
        type="button"
        onClick={handleFetch}
        disabled={fetching || !status?.connected}
        className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#1877F2] to-[#3B82F6] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {fetching ? "取得中…" : "Meta広告データを取得"}
      </button>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-700 mb-1">エラー</p>
          <p className="text-xs text-rose-700 break-all">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* サマリー */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-stone-900">集計結果</h3>
              <p className="text-[11px] text-stone-400">
                取得時刻: {new Date(data.fetchedAt).toLocaleString("ja-JP")} · {data.rawRowCount} 行
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <MiniKpi label="広告費" value={formatJPY(data.overall.spend)} />
              <MiniKpi label="インプレッション" value={formatNumber(data.overall.impressions)} />
              <MiniKpi label="クリック" value={formatNumber(data.overall.clicks)} sub={`CTR ${formatPercent(data.overall.ctr, 2)}`} />
              <MiniKpi label="リーチ" value={formatNumber(data.overall.reach)} />
              <MiniKpi label="CV数" value={formatNumber(data.overall.purchases)} />
              <MiniKpi label="CV金額" value={formatJPY(data.overall.purchaseValue)} />
              <MiniKpi label="CPA" value={data.overall.costPerPurchase ? formatJPY(data.overall.costPerPurchase) : "—"} />
              <MiniKpi label="ROAS" value={data.overall.roas ? `${data.overall.roas.toFixed(2)}x` : "—"} />
            </div>
          </div>

          {/* 月別推移 */}
          {data.byPeriod.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-2">月別推移</h3>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="text-left px-2.5 py-2 font-semibold text-stone-600">期間</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">広告費</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">IMP</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">CLICK</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">CTR</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">CV</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">CPA</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byPeriod.map((p) => (
                      <tr key={p.period} className="border-t border-stone-100">
                        <td className="px-2.5 py-1.5 font-mono text-stone-700">{p.period}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{formatJPY(p.spend)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNumber(p.impressions)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNumber(p.clicks)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{formatPercent(p.ctr, 2)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNumber(p.purchases)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">
                          {p.costPerPurchase ? formatJPY(p.costPerPurchase) : "—"}
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">
                          {p.roas ? `${p.roas.toFixed(2)}x` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* キャンペーン別 */}
          {data.byCampaign.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-2">
                キャンペーン別（上位20件）
              </h3>
              <div className="overflow-x-auto rounded-lg border border-stone-200 max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2.5 py-2 font-semibold text-stone-600">
                        キャンペーン名
                      </th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">広告費</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">IMP</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">CLICK</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">CTR</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">CV</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">CPA</th>
                      <th className="text-right px-2.5 py-2 font-semibold text-stone-600">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCampaign.slice(0, 20).map((c) => (
                      <tr key={c.campaignId} className="border-t border-stone-100">
                        <td className="px-2.5 py-1.5 text-stone-800 max-w-xs truncate">
                          {c.campaignName}
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{formatJPY(c.spend)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNumber(c.impressions)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNumber(c.clicks)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{formatPercent(c.ctr, 2)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNumber(c.purchases)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">
                          {c.costPerPurchase ? formatJPY(c.costPerPurchase) : "—"}
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">
                          {c.roas ? `${c.roas.toFixed(2)}x` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-stone-500">
            ※ このデータはAPIから都度取得しており、DBには保存されていません。
            データベース接続後、保存モードに切り替え可能です。
          </p>
        </div>
      )}
    </div>
  );
}

function MiniKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-white border border-stone-200 p-2.5">
      <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm font-bold text-stone-900 tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-stone-400 mt-0.5">{sub}</p>}
    </div>
  );
}
