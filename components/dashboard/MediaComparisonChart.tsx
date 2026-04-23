"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
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

interface Props {
  data: MediaMetrics[];
}

export default function MediaComparisonChart({ data }: Props) {
  if (!data.length) {
    return <p className="text-gray-400 text-sm text-center py-8">データがありません</p>;
  }

  const chartData = data.map(({ media, metrics }) => ({
    name: MEDIA_LABELS[media],
    広告費: metrics.spend,
    リード数: metrics.leads,
    ROI: metrics.roi ?? 0,
    CPA: metrics.cpa ?? 0,
    color: MEDIA_COLORS[media],
  }));

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 広告費 */}
      <div>
        <p className="text-xs text-gray-500 mb-2 font-medium">広告費 (円)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
            <Tooltip formatter={(v: number) => formatJPY(v)} />
            <Bar dataKey="広告費" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* リード数 */}
      <div>
        <p className="text-xs text-gray-500 mb-2 font-medium">リード数 (件)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatNumber(v) + " 件"} />
            <Bar dataKey="リード数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ROI */}
      <div>
        <p className="text-xs text-gray-500 mb-2 font-medium">ROI (%)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Bar dataKey="ROI" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* CPA */}
      <div>
        <p className="text-xs text-gray-500 mb-2 font-medium">CPA (円/件)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v: number) => formatJPY(v)} />
            <Bar dataKey="CPA" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
