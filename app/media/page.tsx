"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { resolvePeriod, SINGLE_MONTH_OPTIONS, type PeriodSelection } from "@/lib/period";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import CampaignForm from "@/components/media/CampaignForm";
import { formatJPY, formatNumber, formatPercent } from "@/lib/calculations";
import { MEDIA_LABELS, MEDIA_COLORS, type MediaType } from "@/lib/types";
import { IconPlus, IconCalendar, IconBarChart } from "@/components/ui/Icons";

const TABS: { key: MediaType | "ALL"; label: string; color: string }[] = [
  { key: "ALL", label: "全媒体", color: "#ea580c" },
  { key: "META", label: "Meta広告", color: "#1877F2" },
  { key: "TIKTOK", label: "TikTok広告", color: "#FF0050" },
  { key: "HOTPEPPER", label: "ホットペッパー", color: "#E2001B" },
];

interface MediaMetrics {
  media: MediaType;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    contracts: number;
    revenue: number;
    roi: number | null;
    cpa: number | null;
    cpl: number | null;
    ctr: number | null;
    roas: number | null;
  };
}

interface TrendEntry {
  period: string;
  [key: string]: string | number;
}

interface MetaInsightsPeriodMetrics {
  period: string;
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

interface MetaInsightsOverall {
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

interface MetaConversionInfo {
  actionType: string | null;
  label: string;
  autoDetected: boolean;
}

interface MetaInsightsResponse {
  configured: boolean;
  accountId: string;
  accountName: string;
  overall: MetaInsightsOverall;
  byPeriod: MetaInsightsPeriodMetrics[];
  rawRowCount: number;
  conversion?: MetaConversionInfo;
  fetchedAt: string;
}

const METRIC_OPTIONS = [
  { key: "spend", label: "広告費" },
  { key: "leads", label: "リード数" },
  { key: "cpa", label: "CPA" },
  { key: "roi", label: "ROI" },
];

export default function MediaPage() {
  const [tab, setTab] = useState<MediaType | "ALL">("ALL");
  const [byMedia, setByMedia] = useState<MediaMetrics[]>([]);
  const [trend, setTrend] = useState<TrendEntry[]>([]);
  const [metaLive, setMetaLive] = useState<MetaInsightsResponse | null>(null);
  const [metaLiveError, setMetaLiveError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodSelection>({ mode: "range", months: 6 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [chartMetric, setChartMetric] = useState("spend");

  const resolved = resolvePeriod(period);
  const defaultTo = resolved.to;
  const defaultFrom = resolved.from;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setMetaLiveError(null);
    try {
      const sinceDate = resolved.sinceDate;
      const untilDate = resolved.untilDate;

      const [dbRes, metaRes] = await Promise.all([
        fetch(`/api/analytics/by-media?from=${defaultFrom}&to=${defaultTo}`)
          .then((r) => r.json())
          .catch(() => ({ byMedia: [], trend: [] })),
        fetch(`/api/meta/insights?since=${sinceDate}&until=${untilDate}`).then(
          async (r) => {
            const json = await r.json();
            if (!r.ok) throw new Error(json.error ?? "Meta API取得に失敗");
            return json as MetaInsightsResponse;
          }
        ),
      ]).catch((e) => {
        setMetaLiveError(e instanceof Error ? e.message : String(e));
        return [{ byMedia: [], trend: [] }, null] as [
          { byMedia: MediaMetrics[]; trend: TrendEntry[] },
          MetaInsightsResponse | null,
        ];
      });
      const [dbData, metaData] = (
        Array.isArray(dbRes) ? [dbRes, null] : [dbRes, metaRes]
      ) as [{ byMedia: MediaMetrics[]; trend: TrendEntry[] }, MetaInsightsResponse | null];
      setByMedia(dbData.byMedia ?? []);
      setTrend(dbData.trend ?? []);
      setMetaLive(metaData);
    } finally {
      setLoading(false);
    }
  }, [defaultFrom, defaultTo, resolved.sinceDate, resolved.untilDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mergedByMedia = useMemo<MediaMetrics[]>(() => {
    const byDb = new Map(byMedia.map((m) => [m.media, m]));
    const out: MediaMetrics[] = [];
    for (const media of ["META", "TIKTOK", "HOTPEPPER"] as MediaType[]) {
      if (media === "META" && metaLive) {
        const dbMeta = byDb.get("META");
        if (!dbMeta || dbMeta.metrics.spend === 0) {
          const o = metaLive.overall;
          out.push({
            media: "META",
            metrics: {
              spend: o.spend,
              impressions: o.impressions,
              clicks: o.clicks,
              leads: o.purchases,
              contracts: o.purchases,
              revenue: o.purchaseValue,
              roi: o.roas != null ? (o.roas - 1) * 100 : null,
              cpa: o.costPerPurchase,
              cpl: o.costPerPurchase,
              ctr: o.ctr,
              roas: o.roas,
            },
          });
          continue;
        }
      }
      const existing = byDb.get(media);
      if (existing) out.push(existing);
    }
    return out;
  }, [byMedia, metaLive]);

  const mergedTrend = useMemo<TrendEntry[]>(() => {
    const map = new Map<string, TrendEntry>();
    for (const t of trend) map.set(String(t.period), { ...t });
    if (metaLive) {
      for (const p of metaLive.byPeriod) {
        const entry = map.get(p.period) ?? { period: p.period };
        entry.META_spend = p.spend;
        entry.META_leads = p.purchases;
        entry.META_cpa = p.costPerPurchase ?? 0;
        entry.META_roi = p.roas != null ? (p.roas - 1) * 100 : 0;
        map.set(p.period, entry);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.period).localeCompare(String(b.period))
    );
  }, [trend, metaLive]);

  const activeMedia: MediaType[] =
    tab === "ALL" ? ["META", "TIKTOK", "HOTPEPPER"] : [tab];

  const isMetaLiveSource = (media: MediaType) =>
    media === "META" &&
    !!metaLive &&
    (byMedia.find((m) => m.media === "META")?.metrics.spend ?? 0) === 0;

  const filteredByMedia = mergedByMedia.filter((m) => activeMedia.includes(m.media));

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
              Media Analytics
            </p>
          </div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">媒体別分析</h1>
          <p className="text-sm text-stone-500 mt-1 flex items-center gap-1.5">
            <IconCalendar size={14} />
            <span>
              {defaultFrom} 〜 {defaultTo}
            </span>
            <span className="text-stone-300 mx-1">·</span>
            <span>Meta / TikTok / HPB の詳細指標</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-white rounded-xl border border-stone-200 shadow-sm p-1">
            {SINGLE_MONTH_OPTIONS.map((o) => {
              const active =
                period.mode === "single" && period.offset === o.offset;
              return (
                <button
                  key={o.offset}
                  onClick={() => setPeriod({ mode: "single", offset: o.offset })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="inline-flex bg-white rounded-xl border border-stone-200 shadow-sm p-1">
            {[
              { v: 3, label: "3ヶ月" },
              { v: 6, label: "6ヶ月" },
              { v: 12, label: "12ヶ月" },
            ].map((o) => {
              const active = period.mode === "range" && period.months === o.v;
              return (
                <button
                  key={o.v}
                  onClick={() => setPeriod({ mode: "range", months: o.v })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <IconPlus size={16} />
            データ入力
          </button>
        </div>
      </div>

      {metaLiveError && (
        <div className="card p-3 border border-rose-200 bg-rose-50 text-xs">
          <p className="font-semibold text-rose-700 mb-0.5">Meta API取得エラー</p>
          <p className="text-rose-600 break-all">{metaLiveError}</p>
        </div>
      )}

      {/* タブ */}
      <div className="flex flex-wrap gap-1 bg-white border border-stone-200 shadow-sm p-1 rounded-xl w-fit">
        {TABS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? "bg-stone-900 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: tab === key ? "#fff" : color }}
            />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-5 w-32 mb-4" />
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2, 3, 4, 5].map((j) => (
                  <div key={j}>
                    <div className="skeleton h-3 w-14 mb-1" />
                    <div className="skeleton h-5 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filteredByMedia.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <IconBarChart size={28} className="text-stone-400" />
          </div>
          <p className="text-stone-600 font-semibold mb-1">データがありません</p>
          <p className="text-stone-400 text-sm">「データ入力」ボタンまたはCSV取込で登録してください</p>
        </div>
      ) : (
        <>
          {/* 媒体別指標カード */}
          <div
            className={`grid gap-4 ${
              tab === "ALL" ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
            }`}
          >
            {filteredByMedia.map(({ media, metrics }) => {
              const brand = MEDIA_COLORS[media];
              return (
                <div
                  key={media}
                  className="card p-6 relative overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: brand }}
                  />
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                        style={{ background: brand }}
                      >
                        {media === "META" ? "f" : media === "TIKTOK" ? "♪" : "H"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-stone-900">{MEDIA_LABELS[media]}</p>
                          {isMetaLiveSource(media) && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                              style={{ background: "#E7F0FE", color: "#1877F2" }}
                            >
                              <span className="w-1 h-1 rounded-full bg-[#1877F2]" />
                              API ライブ
                            </span>
                          )}
                          {media === "META" && metaLive?.conversion?.autoDetected && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                              style={{ background: "#E7F0FE", color: "#1877F2" }}
                            >
                              CV基準: {metaLive.conversion.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 font-medium">
                          {defaultFrom} 〜 {defaultTo}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                        ROI
                      </p>
                      <p
                        className={`text-xl font-bold tabular-nums ${
                          metrics.roi && metrics.roi > 0
                            ? "text-amber-600"
                            : "text-red-500"
                        }`}
                      >
                        {formatPercent(metrics.roi)}
                      </p>
                    </div>
                  </div>

                  {/* プライマリKPIs (3カラム) */}
                  <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-stone-100">
                    {[
                      { label: "広告費", value: formatJPY(metrics.spend) },
                      { label: "リード数", value: `${formatNumber(metrics.leads)} 件` },
                      {
                        label: "CPA",
                        value: metrics.cpa ? formatJPY(metrics.cpa) : "—",
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                          {label}
                        </p>
                        <p className="text-lg font-bold text-stone-900 tabular-nums">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* セカンダリKPIs (3x2 グリッド) */}
                  <div className="grid grid-cols-3 gap-y-3 gap-x-3 text-xs">
                    {[
                      {
                        label: "インプレッション",
                        value: formatNumber(metrics.impressions),
                      },
                      { label: "クリック", value: formatNumber(metrics.clicks) },
                      { label: "契約数", value: `${formatNumber(metrics.contracts)} 件` },
                      { label: "売上", value: formatJPY(metrics.revenue) },
                      {
                        label: "ROAS",
                        value: metrics.roas ? `${metrics.roas.toFixed(2)}倍` : "—",
                      },
                      {
                        label: "CTR",
                        value: formatPercent(metrics.ctr, 2),
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] text-stone-500 font-medium mb-0.5">
                          {label}
                        </p>
                        <p className="font-semibold text-stone-700 tabular-nums">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* トレンドチャート */}
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="section-title">月別トレンド</h2>
                <p className="section-subtitle mt-0.5">媒体ごとの推移を比較</p>
              </div>
              <div className="flex gap-1 bg-stone-50 p-1 rounded-xl">
                {METRIC_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setChartMetric(o.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      chartMetric === o.key
                        ? "bg-white text-orange-600 shadow-sm ring-1 ring-stone-200/60"
                        : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={mergedTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {activeMedia.map((m) => (
                    <linearGradient key={m} id={`g-${m}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={MEDIA_COLORS[m]} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={MEDIA_COLORS[m]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f0ea" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: "#78716c" }}
                  axisLine={{ stroke: "#e7e5e4" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#a8a29e" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => {
                    if (chartMetric === "spend" || chartMetric === "cpa") {
                      return v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`;
                    }
                    if (chartMetric === "roi") return `${v.toFixed(0)}%`;
                    return formatNumber(v);
                  }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e7e5e4",
                    boxShadow: "0 8px 24px rgba(120, 53, 15, 0.08)",
                    fontSize: 12,
                  }}
                  formatter={(val: number) =>
                    chartMetric === "spend" || chartMetric === "cpa"
                      ? formatJPY(val)
                      : chartMetric === "roi"
                      ? formatPercent(val)
                      : formatNumber(val)
                  }
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                />
                {activeMedia.map((media) => (
                  <Line
                    key={media}
                    type="monotone"
                    dataKey={`${media}_${chartMetric}`}
                    name={MEDIA_LABELS[media]}
                    stroke={MEDIA_COLORS[media]}
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 2, fill: "#fff" }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {showForm && (
        <CampaignForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
