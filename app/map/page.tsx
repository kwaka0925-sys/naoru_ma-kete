"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { format, subMonths, startOfMonth } from "date-fns";
import { formatJPY, formatPercent } from "@/lib/calculations";
import { MEDIA_LABELS, type MediaType } from "@/lib/types";
import { IconCalendar, IconClose, IconMap } from "@/components/ui/Icons";

const JapanMapClient = dynamic(() => import("@/components/map/JapanMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px] bg-slate-50 rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
        <span className="text-slate-400 text-sm font-medium">地図を読み込み中...</span>
      </div>
    </div>
  ),
});

interface PrefData {
  prefecture: string;
  storeCount: number;
  metrics: {
    spend: number;
    leads: number;
    contracts: number;
    roi: number | null;
    cpa: number | null;
    revenue: number;
  };
}

const METRIC_OPTIONS = [
  { key: "roi", label: "ROI", unit: "%" },
  { key: "cpa", label: "CPA", unit: "円" },
  { key: "spend", label: "広告費", unit: "円" },
  { key: "leads", label: "リード数", unit: "件" },
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getMetricValue = (d: PrefData): number => {
    switch (metric) {
      case "roi":
        return d.metrics.roi ?? 0;
      case "cpa":
        return d.metrics.cpa ?? 0;
      case "spend":
        return d.metrics.spend;
      case "leads":
        return d.metrics.leads;
      default:
        return 0;
    }
  };

  const formatMetric = (d: PrefData): string => {
    switch (metric) {
      case "roi":
        return formatPercent(d.metrics.roi);
      case "cpa":
        return d.metrics.cpa ? formatJPY(d.metrics.cpa) : "—";
      case "spend":
        return formatJPY(d.metrics.spend);
      case "leads":
        return `${d.metrics.leads} 件`;
      default:
        return "—";
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
      // CPA: 低いほど良い → 逆
      const invRatio = 1 - ratio;
      const r = Math.round(244 - 44 * invRatio);
      const g = Math.round(63 + 122 * invRatio);
      const b = Math.round(94 + 26 * invRatio);
      return `rgb(${r},${g},${b})`;
    }
    // ROI/spend/leads: 高いほど良い
    const r = Math.round(244 - 44 * ratio);
    const g = Math.round(63 + 122 * ratio);
    const b = Math.round(94 + 26 * ratio);
    return `rgb(${r},${g},${b})`;
  };

  const sortedData = [...data].sort((a, b) => getMetricValue(b) - getMetricValue(a));
  const activePrefs = sortedData.filter((d) => d.storeCount > 0).length;

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              Geographic Analytics
            </p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">地図分析</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <IconCalendar size={14} />
            <span>
              {defaultFrom} 〜 {defaultTo}
            </span>
            <span className="text-slate-300 mx-1">·</span>
            <span>全国 {activePrefs} 都道府県のデータ</span>
          </p>
        </div>
      </div>

      {/* フィルターバー */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            期間
          </span>
          <div className="inline-flex bg-slate-50 rounded-lg p-1">
            {[
              { v: 1, label: "1ヶ月" },
              { v: 3, label: "3ヶ月" },
              { v: 6, label: "6ヶ月" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setMonths(o.v)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  months === o.v
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            媒体
          </span>
          <select
            value={media}
            onChange={(e) => setMedia(e.target.value as MediaType | "")}
            className="input w-auto text-xs py-1.5"
          >
            <option value="">全媒体</option>
            {(["META", "TIKTOK", "HOTPEPPER"] as MediaType[]).map((m) => (
              <option key={m} value={m}>
                {MEDIA_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            指標
          </span>
          <div className="inline-flex bg-slate-50 rounded-lg p-1">
            {METRIC_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setMetric(o.key)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  metric === o.key
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 地図 */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="section-title">都道府県マップ</h2>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-200" />
                <span className="text-slate-500">データなし</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: "rgb(244,63,94)" }}
                />
                <span className="text-slate-500">低</span>
              </div>
              <div className="h-1 w-16 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500" />
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: "rgb(200,185,120)" }}
                />
                <span className="text-slate-500">高</span>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="h-[500px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                <span className="text-slate-400 text-sm font-medium">読み込み中...</span>
              </div>
            </div>
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

        {/* ランキング */}
        <div className="card p-6">
          <div className="mb-4">
            <h2 className="section-title">
              {METRIC_OPTIONS.find((o) => o.key === metric)?.label} ランキング
            </h2>
            <p className="section-subtitle mt-0.5">都道府県別パフォーマンス</p>
          </div>
          <div className="space-y-1 overflow-y-auto max-h-[500px] -mr-2 pr-2 scrollbar-hide">
            {sortedData.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                  <IconMap size={20} className="text-slate-400" />
                </div>
                <p className="text-slate-400 text-sm">データがありません</p>
              </div>
            ) : (
              sortedData.map((d, i) => {
                const isSelected = selected?.prefecture === d.prefecture;
                return (
                  <button
                    key={d.prefecture}
                    onClick={() => setSelected(d)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-50 to-violet-50 ring-1 ring-indigo-200 shadow-sm"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold w-5 text-center tabular-nums ${
                        i < 3 ? "text-amber-500" : "text-slate-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                      style={{ background: getColor(d) }}
                    />
                    <span
                      className={`flex-1 truncate font-medium ${
                        isSelected ? "text-indigo-700" : "text-slate-700"
                      }`}
                    >
                      {d.prefecture}
                    </span>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-xs tabular-nums text-slate-900">
                        {formatMetric(d)}
                      </p>
                      <p className="text-[10px] text-slate-400">{d.storeCount}店舗</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 選択都道府県の詳細 */}
      {selected && (
        <div className="card p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
                <IconMap size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selected.prefecture}
                </h2>
                <p className="text-xs text-slate-500">
                  {selected.storeCount} 店舗のデータ
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <IconClose size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "店舗数", value: `${selected.storeCount} 店舗`, color: "text-slate-900" },
              { label: "広告費", value: formatJPY(selected.metrics.spend), color: "text-slate-900" },
              { label: "リード数", value: `${selected.metrics.leads} 件`, color: "text-blue-600" },
              { label: "契約数", value: `${Math.round(selected.metrics.contracts)} 件`, color: "text-slate-900" },
              {
                label: "ROI",
                value: formatPercent(selected.metrics.roi),
                color:
                  selected.metrics.roi && selected.metrics.roi > 0
                    ? "text-emerald-600"
                    : "text-red-500",
              },
              {
                label: "CPA",
                value: selected.metrics.cpa ? formatJPY(selected.metrics.cpa) : "—",
                color: "text-violet-600",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl bg-slate-50 border border-slate-100 p-3"
              >
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {label}
                </p>
                <p className={`text-base font-bold mt-1 tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
