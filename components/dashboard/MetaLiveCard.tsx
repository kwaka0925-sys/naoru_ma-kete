"use client";

import { useCallback, useEffect, useState } from "react";
import { formatJPY, formatNumber, formatPercent } from "@/lib/calculations";

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

interface InsightsResponse {
  configured: boolean;
  accountId: string;
  accountName: string;
  currency: string;
  overall: Metrics;
  byCampaign: CampaignMetrics[];
  rawRowCount: number;
  fetchedAt: string;
}

export default function MetaLiveCard() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/insights");
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "取得に失敗しました");
        return;
      }
      setData(json as InsightsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="card p-6 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: "#1877F2" }}
      />
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
            style={{ background: "#1877F2" }}
          >
            f
          </div>
          <div>
            <h2 className="section-title">Meta広告 ライブ実績</h2>
            <p className="section-subtitle mt-0.5">
              {data
                ? `${data.accountName || data.accountId} · 直近90日`
                : "Marketing APIから直接取得"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-success">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            Live
          </span>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="text-xs text-stone-500 hover:text-stone-800 disabled:opacity-50"
          >
            {loading ? "更新中…" : "更新"}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
          <p className="text-xs font-semibold text-rose-700 mb-0.5">
            Meta APIからの取得に失敗
          </p>
          <p className="text-xs text-rose-600 break-all">{error}</p>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="広告費" value={formatJPY(data.overall.spend)} />
            <Kpi
              label="インプレッション"
              value={formatNumber(data.overall.impressions)}
              sub={`CTR ${formatPercent(data.overall.ctr, 2)}`}
            />
            <Kpi label="クリック" value={formatNumber(data.overall.clicks)} />
            <Kpi label="リーチ" value={formatNumber(data.overall.reach)} />
            <Kpi label="CV数" value={formatNumber(data.overall.purchases)} />
            <Kpi label="CV金額" value={formatJPY(data.overall.purchaseValue)} />
            <Kpi
              label="CPA"
              value={
                data.overall.costPerPurchase
                  ? formatJPY(data.overall.costPerPurchase)
                  : "—"
              }
            />
            <Kpi
              label="ROAS"
              value={data.overall.roas ? `${data.overall.roas.toFixed(2)}x` : "—"}
              positive={data.overall.roas != null && data.overall.roas >= 1}
            />
          </div>

          {data.byCampaign.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-stone-600 mb-2">
                広告費上位キャンペーン
              </p>
              <div className="space-y-1.5">
                {data.byCampaign.slice(0, 5).map((c) => (
                  <div
                    key={c.campaignId}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-stone-50 hover:bg-stone-100 transition"
                  >
                    <p className="text-xs text-stone-800 truncate flex-1">
                      {c.campaignName}
                    </p>
                    <div className="flex items-center gap-4 text-xs tabular-nums flex-shrink-0">
                      <span className="text-stone-600">{formatJPY(c.spend)}</span>
                      <span className="text-stone-500">
                        CV {formatNumber(c.purchases)}
                      </span>
                      <span
                        className={
                          c.roas && c.roas >= 1 ? "text-emerald-600 font-semibold" : "text-stone-400"
                        }
                      >
                        {c.roas ? `${c.roas.toFixed(2)}x` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-stone-400 mt-4">
            取得時刻: {new Date(data.fetchedAt).toLocaleString("ja-JP")} ·{" "}
            {data.rawRowCount} 行
          </p>
        </>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-white to-stone-50 border border-stone-200 p-3">
      <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={`text-base font-bold tabular-nums ${
          positive ? "text-emerald-600" : "text-stone-900"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-stone-400 mt-0.5">{sub}</p>}
    </div>
  );
}
