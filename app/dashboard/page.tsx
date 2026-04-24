"use client";

import { useState, useEffect, useCallback } from "react";
import KpiCard, { KpiCardSkeleton } from "@/components/dashboard/KpiCard";
import MediaComparisonChart from "@/components/dashboard/MediaComparisonChart";
import TopStoresTable from "@/components/dashboard/TopStoresTable";
import MetaLiveCard from "@/components/dashboard/MetaLiveCard";
import { formatJPY, formatNumber, formatPercent } from "@/lib/calculations";
import { MEDIA_LABELS, MEDIA_COLORS } from "@/lib/types";
import type { MediaType } from "@/lib/types";
import { resolvePeriod, SINGLE_MONTH_OPTIONS, type PeriodSelection } from "@/lib/period";
import {
  IconYen,
  IconUsers,
  IconTrendingUp,
  IconTarget,
  IconSparkles,
  IconCalendar,
} from "@/components/ui/Icons";

interface Summary {
  overall: {
    spend: number;
    leads: number;
    contracts: number;
    revenue: number;
    roi: number | null;
    cpa: number | null;
  };
  byMedia: Array<{
    media: MediaType;
    metrics: {
      spend: number;
      leads: number;
      contracts: number;
      roi: number | null;
      cpa: number | null;
    };
  }>;
  topStores: Array<{
    store: { id: string; name: string; prefecture: string };
    metrics: { spend: number; leads: number; contracts: number; roi: number | null; cpa: number | null; revenue: number };
  }>;
}

type ChartMetric = "spend" | "leads" | "roi" | "cpa";

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodSelection>({ mode: "single", offset: 0 });
  const [seeding, setSeeding] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>("spend");

  const resolved = resolvePeriod(period);
  const defaultTo = resolved.to;
  const defaultFrom = resolved.from;

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

  const { overall, byMedia, topStores } = summary ?? { overall: null, byMedia: [], topStores: [] };
  const isEmpty = !loading && (!overall || (overall.spend === 0 && overall.leads === 0));

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
              Overview
            </p>
          </div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
            マーケティングダッシュボード
          </h1>
          <p className="text-sm text-stone-500 mt-1 flex items-center gap-1.5">
            <IconCalendar size={14} />
            <span>
              {defaultFrom} 〜 {defaultTo}
            </span>
            <span className="text-stone-300 mx-1">·</span>
            <span>全国100店舗のマーケティング効果を一元管理</span>
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
          {isEmpty && (
            <button onClick={handleSeed} disabled={seeding} className="btn-primary">
              <IconSparkles size={16} />
              {seeding ? "生成中..." : "サンプルデータを追加"}
            </button>
          )}
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="総広告費"
              value={overall ? formatJPY(overall.spend) : "—"}
              icon={<IconYen size={20} />}
              color="indigo"
              subtitle={`${defaultFrom}〜${defaultTo}`}
            />
            <KpiCard
              title="総リード数"
              value={overall ? formatNumber(overall.leads) + " 件" : "—"}
              icon={<IconUsers size={20} />}
              color="blue"
              subtitle="獲得件数の合計"
            />
            <KpiCard
              title="平均ROI"
              value={overall ? formatPercent(overall.roi) : "—"}
              icon={<IconTrendingUp size={20} />}
              color={overall && overall.roi && overall.roi > 0 ? "emerald" : "rose"}
              subtitle="(売上-広告費)÷広告費"
            />
            <KpiCard
              title="平均CPA"
              value={overall && overall.cpa ? formatJPY(overall.cpa) : "—"}
              icon={<IconTarget size={20} />}
              color="violet"
              subtitle="契約1件あたりの広告費"
            />
          </>
        )}
      </div>

      {/* Meta広告 ライブ実績 (API直接取得) */}
      <MetaLiveCard
        since={resolved.sinceDate}
        until={resolved.untilDate}
        periodLabel={resolved.label}
      />

      {/* 媒体別カード (ブランドカラー) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="section-title">媒体別パフォーマンス（DB集計）</h2>
            <p className="section-subtitle mt-0.5">
              取込済みデータの主要指標サマリー（DB未接続時は0表示）
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading
            ? [0, 1, 2].map((i) => (
                <div key={i} className="card p-5">
                  <div className="skeleton h-5 w-24 mb-4" />
                  <div className="grid grid-cols-2 gap-3">
                    {[0, 1, 2, 3].map((j) => (
                      <div key={j}>
                        <div className="skeleton h-3 w-12 mb-1" />
                        <div className="skeleton h-5 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            : byMedia.map(({ media, metrics }) => {
                const brand = MEDIA_COLORS[media];
                return (
                  <div
                    key={media}
                    className="card p-5 relative overflow-hidden hover:shadow-md transition-shadow duration-200"
                  >
                    {/* ブランドカラーの上端ストライプ */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ background: brand }}
                    />
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
                          style={{ background: brand }}
                        >
                          {media === "META" ? "f" : media === "TIKTOK" ? "♪" : "HPB"}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 text-sm leading-tight">
                            {MEDIA_LABELS[media]}
                          </p>
                          <p className="text-[10px] text-stone-400 font-medium">
                            {metrics.spend > 0 ? "稼働中" : "データなし"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          metrics.roi && metrics.roi > 0
                            ? "text-amber-600"
                            : "text-red-500"
                        }`}
                      >
                        {formatPercent(metrics.roi)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">
                          広告費
                        </p>
                        <p className="text-base font-bold text-stone-900 tabular-nums">
                          {formatJPY(metrics.spend)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">
                          リード
                        </p>
                        <p className="text-base font-bold text-stone-900 tabular-nums">
                          {formatNumber(metrics.leads)} 件
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">
                          契約数
                        </p>
                        <p className="text-base font-bold text-stone-900 tabular-nums">
                          {Math.round(metrics.contracts)} 件
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">
                          CPA
                        </p>
                        <p className="text-base font-bold text-stone-900 tabular-nums">
                          {metrics.cpa ? formatJPY(metrics.cpa) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* 2カラム: 比較チャート + TOPストア */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 媒体比較チャート */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="section-title">媒体別比較</h2>
              <p className="section-subtitle mt-0.5">指標を切り替えて比較</p>
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="skeleton h-[260px] w-full" />
            ) : (
              <MediaComparisonChart
                data={byMedia}
                activeChart={chartMetric}
                onChangeChart={setChartMetric}
              />
            )}
          </div>
        </div>

        {/* 空のスペース or 将来のウィジェット - 今はTopStoresTableに譲る */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">ROI上位店舗</h2>
              <p className="section-subtitle mt-0.5">
                投資対効果が高い上位 {topStores.length} 店舗
              </p>
            </div>
            <span className="badge-success">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-dot" />
              Live
            </span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-10 w-full" />
              ))}
            </div>
          ) : (
            <TopStoresTable stores={topStores} />
          )}
        </div>
      </div>
    </div>
  );
}
