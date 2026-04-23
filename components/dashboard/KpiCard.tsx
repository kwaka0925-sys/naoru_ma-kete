import type { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  color: "indigo" | "blue" | "emerald" | "rose" | "violet" | "amber";
  subtitle?: string;
  trend?: { value: string; positive: boolean };
}

const COLOR_MAP = {
  indigo: {
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500",
    accent: "from-indigo-500/20 via-indigo-500/0 to-transparent",
    ring: "ring-indigo-500/20",
  },
  blue: {
    iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
    accent: "from-blue-500/20 via-blue-500/0 to-transparent",
    ring: "ring-blue-500/20",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
    accent: "from-emerald-500/20 via-emerald-500/0 to-transparent",
    ring: "ring-emerald-500/20",
  },
  rose: {
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-500",
    accent: "from-rose-500/20 via-rose-500/0 to-transparent",
    ring: "ring-rose-500/20",
  },
  violet: {
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-500",
    accent: "from-violet-500/20 via-violet-500/0 to-transparent",
    ring: "ring-violet-500/20",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
    accent: "from-amber-500/20 via-amber-500/0 to-transparent",
    ring: "ring-amber-500/20",
  },
};

export default function KpiCard({ title, value, icon, color, subtitle, trend }: KpiCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="card relative overflow-hidden p-5 group hover:shadow-md transition-shadow duration-200">
      {/* 装飾グラデーション */}
      <div
        aria-hidden
        className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${c.accent} blur-2xl opacity-60 pointer-events-none`}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              {title}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${c.iconBg} shadow-sm ring-4 ${c.ring} flex-shrink-0`}
          >
            {icon}
          </div>
        </div>
        <p className="metric-value">{value}</p>
        <div className="flex items-center gap-2 mt-3 h-4">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                trend.positive ? "text-emerald-600" : "text-red-500"
              }`}
            >
              <span>{trend.positive ? "↑" : "↓"}</span>
              {trend.value}
            </span>
          )}
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-medium truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-10 w-10 rounded-xl" />
      </div>
      <div className="skeleton h-7 w-28 mb-3" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}
