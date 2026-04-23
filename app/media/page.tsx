"use client";

import { useState, useEffect, useCallback } from "react";
import { format, subMonths, startOfMonth } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import CampaignForm from "@/components/media/CampaignForm";
import { formatJPY, formatNumber, formatPercent } from "@/lib/calculations";
import { MEDIA_LABELS, MEDIA_COLORS, type MediaType } from "@/lib/types";

const TABS: { key: MediaType | "ALL"; label: string }[] = [
  { key: "ALL", label: "全媒体比較" },
  { key: "META", label: "Meta広告" },
  { key: "TIKTOK", label: "TikTok広告" },
  { key: "HOTPEPPER", label: "ホットペッパー" },
];

interface MediaMetrics {
  media: MediaType;
  metrics: {
    spend: number; impressions: number; clicks: number; leads: number;
    contracts: number; revenue: number; roi: number | null;
    cpa: number | null; cpl: number | null; ctr: number | null; roas: number | null;
  };
}

interface TrendEntry {
  period: string;
  [key: string]: string | number;
}

export default function MediaPage() {
  const [tab, setTab] = useState<MediaType | "ALL">("ALL");
  const [byMedia, setByMedia] = useState<MediaMetrics[]>([]);
  const [trend, setTrend] = useState<TrendEntry[]>([]);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeMedia: MediaType[] = tab === "ALL"
    ? ["META", "TIKTOK", "HOTPEPPER"]
    : [tab];

  const filteredByMedia = byMedia.filter((m) => activeMedia.includes(m.media));

  const METRIC_OPTIONS = [
    { key: "spend", label: "広告費" },
    { key: "leads", label: "リード数" },
    { key: "cpa", label: "CPA" },
    { key: "roi", label: "ROI (%)" },
  ];
  const [chartMetric, setChartMetric] = useState("spend");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">媒体別分析</h1>
        <div className="flex gap-3">
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="input w-auto">
            <option value={3}>直近3ヶ月</option>
            <option value={6}>直近6ヶ月</option>
            <option value={12}>直近12ヶ月</option>
          </select>
          <button onClick={() => setShowForm(true)} className="btn-primary">+ データ入力</button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? "bg-white shadow text-indigo-600" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm py-10 text-center">読み込み中...</div>
      ) : (
        <>
          {/* 媒体別指標カード */}
          <div className={`grid gap-4 ${tab === "ALL" ? "grid-cols-3" : "grid-cols-1"}`}>
            {filteredByMedia.map(({ media, metrics }) => (
              <div key={media} className="card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: MEDIA_COLORS[media] }}
                  />
                  <span className="font-semibold text-base">{MEDIA_LABELS[media]}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {[
                    { label: "広告費", value: formatJPY(metrics.spend) },
                    { label: "インプレッション", value: formatNumber(metrics.impressions) },
                    { label: "クリック数", value: formatNumber(metrics.clicks) },
                    { label: "リード数", value: formatNumber(metrics.leads) + " 件" },
                    { label: "契約数", value: formatNumber(metrics.contracts) + " 件" },
                    { label: "売上", value: formatJPY(metrics.revenue) },
                    { label: "ROI", value: formatPercent(metrics.roi), highlight: metrics.roi != null && metrics.roi > 0 },
                    { label: "CPA", value: metrics.cpa ? formatJPY(metrics.cpa) : "-" },
                    { label: "ROAS", value: metrics.roas ? `${metrics.roas.toFixed(2)}倍` : "-" },
                    { label: "CPL", value: metrics.cpl ? formatJPY(metrics.cpl) : "-" },
                    { label: "CTR", value: formatPercent(metrics.ctr, 2) },
                  ].map(({ label, value, highlight }) => (
                    <div key={label}>
                      <p className="text-gray-500 text-xs">{label}</p>
                      <p className={`font-semibold ${highlight ? "text-green-600" : ""}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* トレンドチャート */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">月別トレンド</h2>
              <select
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value)}
                className="input w-auto text-xs"
              >
                {METRIC_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: number) =>
                    chartMetric === "spend" || chartMetric === "cpa"
                      ? formatJPY(val)
                      : chartMetric === "roi"
                      ? formatPercent(val)
                      : formatNumber(val)
                  }
                />
                <Legend />
                {activeMedia.map((media) => (
                  <Line
                    key={media}
                    type="monotone"
                    dataKey={`${media}_${chartMetric}`}
                    name={MEDIA_LABELS[media]}
                    stroke={MEDIA_COLORS[media]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
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
          onSaved={() => { setShowForm(false); fetchData(); }}
        />
      )}
    </div>
  );
}
