"use client";

import { useState, useEffect, useCallback } from "react";
import KpiCard from "@/components/dashboard/KpiCard";
import MediaComparisonChart from "@/components/dashboard/MediaComparisonChart";
import TopStoresTable from "@/components/dashboard/TopStoresTable";
import { formatJPY, formatNumber, formatPercent } from "@/lib/calculations";
import { MEDIA_LABELS } from "@/lib/types";
import type { MediaType } from "@/lib/types";
import { format, subMonths, startOfMonth } from "date-fns";

interface Summary {
  overall: {
    spend: number;
    leads: number;
    contracts: number;
    revenue: number;
    roi: number | null;
    cpa: number | null;
  };
  byMedia: Array<{ media: MediaType; metrics: { spend: number; leads: number; contracts: number; roi: number | null; cpa: number | null } }>;
  topStores: Array<{
    store: { id: string; name: string; prefecture: string };
    metrics: { spend: number; leads: number; contracts: number; roi: number | null; cpa: number | null; revenue: number };
  }>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(3);
  const [seeding, setSeeding] = useState(false);

  const defaultTo = format(new Date(), "yyyy-MM");
  const defaultFrom = format(subMonths(startOfMonth(new Date()), months - 1), "yyyy-MM");

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/summary?from=${defaultFrom}&to=${defaultTo}`);
      const data = await res.json();
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, [defaultFrom, defaultTo]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleSeed = async () => {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    setSeeding(false);
    fetchSummary();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-sm">読み込み中...</div>
      </div>
    );
  }

  const { overall, byMedia, topStores } = summary ?? { overall: null, byMedia: [], topStores: [] };

  const isEmpty = !overall || (overall.spend === 0 && overall.leads === 0);

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {defaultFrom} 〜 {defaultTo} の集計
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="input w-auto"
          >
            <option value={1}>直近1ヶ月</option>
            <option value={3}>直近3ヶ月</option>
            <option value={6}>直近6ヶ月</option>
            <option value={12}>直近12ヶ月</option>
          </select>
          {isEmpty && (
            <button onClick={handleSeed} disabled={seeding} className="btn-primary">
              {seeding ? "生成中..." : "サンプルデータを追加"}
            </button>
          )}
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="総広告費"
          value={overall ? formatJPY(overall.spend) : "-"}
          icon="💴"
          color="indigo"
        />
        <KpiCard
          title="総リード数"
          value={overall ? formatNumber(overall.leads) + " 件" : "-"}
          icon="👤"
          color="blue"
        />
        <KpiCard
          title="平均ROI"
          value={overall ? formatPercent(overall.roi) : "-"}
          icon="📈"
          color={overall && overall.roi && overall.roi > 0 ? "green" : "red"}
          subtitle="(売上-広告費)÷広告費"
        />
        <KpiCard
          title="平均CPA"
          value={overall && overall.cpa ? formatJPY(overall.cpa) : "-"}
          icon="🎯"
          color="purple"
          subtitle="広告費÷契約数"
        />
      </div>

      {/* 媒体別 KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {byMedia.map(({ media, metrics }) => (
          <div key={media} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className={`badge-${media.toLowerCase()}`}>{MEDIA_LABELS[media]}</span>
              <span className="text-xs text-gray-400">{defaultFrom}〜{defaultTo}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">広告費</p>
                <p className="text-lg font-bold">{formatJPY(metrics.spend)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">リード数</p>
                <p className="text-lg font-bold">{formatNumber(metrics.leads)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ROI</p>
                <p className={`text-lg font-bold ${metrics.roi && metrics.roi > 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatPercent(metrics.roi)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CPA</p>
                <p className="text-lg font-bold">{metrics.cpa ? formatJPY(metrics.cpa) : "-"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 媒体比較チャート */}
      <div className="card p-4">
        <h2 className="text-base font-semibold mb-4">媒体別パフォーマンス比較</h2>
        <MediaComparisonChart data={byMedia} />
      </div>

      {/* Top店舗 */}
      <div className="card p-4">
        <h2 className="text-base font-semibold mb-4">ROI上位店舗</h2>
        <TopStoresTable stores={topStores} />
      </div>
    </div>
  );
}
