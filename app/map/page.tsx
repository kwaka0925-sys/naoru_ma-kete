"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { format, subMonths, startOfMonth } from "date-fns";
import { formatJPY, formatPercent } from "@/lib/calculations";
import { MEDIA_LABELS, type MediaType } from "@/lib/types";

const JapanMapClient = dynamic(() => import("@/components/map/JapanMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl">
      <span className="text-gray-400 text-sm">地図を読み込み中...</span>
    </div>
  ),
});

interface PrefData {
  prefecture: string;
  storeCount: number;
  metrics: {
    spend: number; leads: number; contracts: number;
    roi: number | null; cpa: number | null; revenue: number;
  };
}

const METRIC_OPTIONS = [
  { key: "roi", label: "ROI (%)" },
  { key: "cpa", label: "CPA (円)" },
  { key: "spend", label: "広告費" },
  { key: "leads", label: "リード数" },
];

export default function MapPage() {
  const [data, setData] = useState<PrefData[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(3);
  const [media, setMedia] = useState<MediaType | "">("");
  const [metric, setMetric] = useState("roi");
  const [selected, setSelected] = useState<PrefData | null>(null);

  const defaultTo = format(new Date(), "yyyy-MM");
  const defaultFrom = format(subMonths(startOfMonth(new Date()), months - 1), "yyyy-MM");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: defaultFrom, to: defaultTo });
      if (media) params.set("media", media);
      const res = await fetch(`/api/analytics/by-prefecture?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [defaultFrom, defaultTo, media]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getMetricValue = (d: PrefData): number => {
    switch (metric) {
      case "roi": return d.metrics.roi ?? 0;
      case "cpa": return d.metrics.cpa ?? 0;
      case "spend": return d.metrics.spend;
      case "leads": return d.metrics.leads;
      default: return 0;
    }
  };

  const formatMetric = (d: PrefData): string => {
    switch (metric) {
      case "roi": return formatPercent(d.metrics.roi);
      case "cpa": return d.metrics.cpa ? formatJPY(d.metrics.cpa) : "-";
      case "spend": return formatJPY(d.metrics.spend);
      case "leads": return `${d.metrics.leads} 件`;
      default: return "-";
    }
  };

  const values = data.map(getMetricValue).filter((v) => v > 0);
  const maxVal = values.length ? Math.max(...values) : 1;
  const minVal = values.length ? Math.min(...values) : 0;

  const getColor = (d: PrefData): string => {
    const val = getMetricValue(d);
    if (val === 0) return "#e5e7eb";
    const ratio = maxVal === minVal ? 0.5 : (val - minVal) / (maxVal - minVal);
    if (metric === "cpa") {
      // CPA は低いほど良い → 逆スケール
      const invRatio = 1 - ratio;
      const r = Math.round(255 * (1 - invRatio));
      const g = Math.round(200 * invRatio);
      return `rgb(${r},${g},80)`;
    }
    // ROI / spend / leads は高いほど良い
    const r = Math.round(255 * (1 - ratio));
    const g = Math.round(200 * ratio);
    return `rgb(${r},${g},80)`;
  };

  const sortedData = [...data].sort((a, b) => getMetricValue(b) - getMetricValue(a));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">地図分析</h1>
        <div className="flex gap-3">
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="input w-auto">
            <option value={1}>直近1ヶ月</option>
            <option value={3}>直近3ヶ月</option>
            <option value={6}>直近6ヶ月</option>
          </select>
          <select value={media} onChange={(e) => setMedia(e.target.value as MediaType | "")} className="input w-auto">
            <option value="">全媒体</option>
            {(["META", "TIKTOK", "HOTPEPPER"] as MediaType[]).map((m) => (
              <option key={m} value={m}>{MEDIA_LABELS[m]}</option>
            ))}
          </select>
          <select value={metric} onChange={(e) => setMetric(e.target.value)} className="input w-auto">
            {METRIC_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 地図 */}
        <div className="lg:col-span-2 card p-4">
          {loading ? (
            <div className="h-96 flex items-center justify-center text-gray-400 text-sm">読み込み中...</div>
          ) : (
            <JapanMapClient
              data={data}
              getColor={getColor}
              formatMetric={formatMetric}
              onSelect={setSelected}
              selected={selected}
            />
          )}
        </div>

        {/* ランキングサイドバー */}
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-3">
            {METRIC_OPTIONS.find((o) => o.key === metric)?.label} ランキング
          </h2>
          <div className="space-y-1.5 overflow-y-auto max-h-[480px]">
            {sortedData.map((d, i) => (
              <button
                key={d.prefecture}
                onClick={() => setSelected(d)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  selected?.prefecture === d.prefecture
                    ? "bg-indigo-50 text-indigo-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <span className="text-gray-400 w-5 text-right text-xs">{i + 1}</span>
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: getColor(d) }}
                />
                <span className="flex-1 truncate">{d.prefecture}</span>
                <span className="font-medium text-xs">{formatMetric(d)}</span>
                <span className="text-gray-400 text-xs">{d.storeCount}店</span>
              </button>
            ))}
            {sortedData.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">データなし</p>
            )}
          </div>
        </div>
      </div>

      {/* 選択都道府県の詳細 */}
      {selected && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">{selected.prefecture} の詳細</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            {[
              { label: "店舗数", value: `${selected.storeCount} 店舗` },
              { label: "広告費合計", value: formatJPY(selected.metrics.spend) },
              { label: "リード数", value: `${selected.metrics.leads} 件` },
              { label: "契約数", value: `${Math.round(selected.metrics.contracts)} 件` },
              { label: "ROI", value: formatPercent(selected.metrics.roi) },
              { label: "CPA", value: selected.metrics.cpa ? formatJPY(selected.metrics.cpa) : "-" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs">{label}</p>
                <p className="font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
