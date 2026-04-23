"use client";

import { useState, useEffect, useCallback } from "react";
import { format, subMonths, startOfMonth } from "date-fns";
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
  { key: "ALL", label: "全媒体", color: "#6366f1" },
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
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [chartMetric, setChartMetric] = useState("spend");

  const defaultTo = format(new Date(), "yyyy-MM");
  const defaultFrom = format(subMonths(startOfMonth(new Date()), months - 1), "yyyy-MM");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/by-media?from=${defaultFrom}&to=${defaultTo}`);
      const data = await res.json();
      setByMedia(data.byMedia);
      setTrend(data.trend);
    } finally {
      setLoading(false);
    }
  }, [defaultFrom, defaultTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeMedia: MediaType[] =
    tab === "ALL" ? ["META", "TIKTOK", "HOTPEPPER"] : [tab];

  const filteredByMedia = byMedia.filter((m) => activeMedia.includes(m.media));

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              Media Analytics
            </p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">媒体別分析</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <IconCalendar size={14} />
            <span>
              {defaultFrom} 〜 {defaultTo}
            </span>
            <span className="text-slate-300 mx-1">·</span>
            <span>Meta / TikTok / HPB の詳細指標</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex bg-white rounded-xl border border-slate-200 shadow-sm p-1">
            {[
              { v: 3, label: "3ヶ月" },
              { v: 6, label: "6ヶ月" },
              { v: 12, label: "12ヶ月" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setMonths(o.v)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  months === o.v
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <IconPlus size={16} />
            データ入力
          </button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex flex-wrap gap-1 bg-white border border-slate-200 shadow-sm p-1 rounded-xl w-fit">
        {TABS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
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
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <IconBarChart size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold mb-1">データがありません</p>
          <p className="text-slate-400 text-sm">「データ入力」ボタンまたはCSV取込で登録してください</p>
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
                        <p className="font-bold text-slate-900">{MEDIA_LABELS[media]}</p>
                        <p className="text-xs text-slate-400 font-medium">
                          {defaultFrom} 〜 {defaultTo}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        ROI
                      </p>
                      <p
                        className={`text-xl font-bold tabular-nums ${
                          metrics.roi && metrics.roi > 0
                            ? "text-emerald-600"
                            : "text-red-500"
                        }`}
                      >
                        {formatPercent(metrics.roi)}
                      </p>
                    </div>
                  </div>

                  {/* プライマリKPIs (3カラム) */}
                  <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-slate-100">
                    {[
                      { label: "広告費", value: formatJPY(metrics.spend) },
                      { label: "リード数", value: `${formatNumber(metrics.leads)} 件` },
                      {
                        label: "CPA",
                        value: metrics.cpa ? formatJPY(metrics.cpa) : "—",
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          {label}
                        </p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
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
                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">
                          {label}
                        </p>
                        <p className="font-semibold text-slate-700 tabular-nums">
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
              <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                {METRIC_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setChartMetric(o.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      chartMetric === o.key
                        ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/60"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {activeMedia.map((m) => (
                    <linearGradient key={m} id={`g-${m}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={MEDIA_COLORS[m]} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={MEDIA_COLORS[m]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
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
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
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
