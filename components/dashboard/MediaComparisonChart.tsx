"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { MEDIA_LABELS, MEDIA_COLORS, type MediaType } from "@/lib/types";
import { formatJPY, formatNumber } from "@/lib/calculations";

interface MediaMetrics {
  media: MediaType;
  metrics: {
    spend: number;
    leads: number;
    contracts: number;
    roi: number | null;
    cpa: number | null;
  };
}

type ChartType = "spend" | "leads" | "roi" | "cpa";

interface Props {
  data: MediaMetrics[];
  activeChart?: ChartType;
  onChangeChart?: (c: ChartType) => void;
}

const CHART_CONFIG: Record<
  ChartType,
  { label: string; unit: string; format: (v: number) => string; tickFormat: (v: number) => string; color: string }
> = {
  spend: {
    label: "広告費",
    unit: "円",
    format: (v) => formatJPY(v),
    tickFormat: (v) => `${(v / 10000).toFixed(0)}万`,
    color: "#ea580c",
  },
  leads: {
    label: "リード数",
    unit: "件",
    format: (v) => formatNumber(v) + " 件",
    tickFormat: (v) => formatNumber(v),
    color: "#f43f5e",
  },
  roi: {
    label: "ROI",
    unit: "%",
    format: (v) => `${v.toFixed(1)}%`,
    tickFormat: (v) => `${v.toFixed(0)}%`,
    color: "#d97706",
  },
  cpa: {
    label: "CPA",
    unit: "円",
    format: (v) => formatJPY(v),
    tickFormat: (v) => `${(v / 1000).toFixed(0)}K`,
    color: "#b45309",
  },
};

const CustomTooltip = ({ active, payload, cfg }: { active?: boolean; payload?: Array<{ value: number; payload: { fullName: string; color: string } }>; cfg: (typeof CHART_CONFIG)[ChartType] }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg bg-stone-900 text-white px-3 py-2 shadow-xl border border-white/10">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-2 h-2 rounded-full" style={{ background: p.payload.color }} />
        <span className="text-xs font-medium">{p.payload.fullName}</span>
      </div>
      <p className="text-sm font-bold">{cfg.format(p.value)}</p>
    </div>
  );
};

export default function MediaComparisonChart({ data, activeChart = "spend", onChangeChart }: Props) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-3">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-stone-400"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <p className="text-stone-500 text-sm">比較するデータがありません</p>
        <p className="text-stone-400 text-xs mt-1">サンプルデータの追加またはCSV取込を行ってください</p>
      </div>
    );
  }

  const cfg = CHART_CONFIG[activeChart];

  const chartData = data.map(({ media, metrics }) => {
    const rawVal =
      activeChart === "spend"
        ? metrics.spend
        : activeChart === "leads"
        ? metrics.leads
        : activeChart === "roi"
        ? metrics.roi ?? 0
        : metrics.cpa ?? 0;
    return {
      name: MEDIA_LABELS[media].replace("広告", "").replace("ホットペッパー", "HPB"),
      fullName: MEDIA_LABELS[media],
      value: rawVal,
      color: MEDIA_COLORS[media],
    };
  });

  const tabs: { key: ChartType; label: string }[] = [
    { key: "spend", label: "広告費" },
    { key: "leads", label: "リード数" },
    { key: "roi", label: "ROI" },
    { key: "cpa", label: "CPA" },
  ];

  return (
    <div>
      {/* タブ */}
      {onChangeChart && (
        <div className="flex flex-wrap gap-1 mb-4 bg-stone-50 p-1 rounded-xl w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onChangeChart(t.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChart === t.key
                  ? "bg-white text-orange-600 shadow-sm ring-1 ring-stone-200/60"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {chartData.map((d, i) => (
              <linearGradient key={i} id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={d.color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f0ea" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#78716c" }}
            axisLine={{ stroke: "#e7e5e4" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#a8a29e" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={cfg.tickFormat}
          />
          <Tooltip
            cursor={{ fill: "rgba(234, 88, 12, 0.05)" }}
            content={<CustomTooltip cfg={cfg} />}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={`url(#bar-${i})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
