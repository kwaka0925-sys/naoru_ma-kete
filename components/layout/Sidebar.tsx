"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconBarChart,
  IconMap,
  IconStore,
  IconUpload,
} from "@/components/ui/Icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", Icon: IconDashboard, desc: "全体KPI" },
  { href: "/media", label: "媒体別分析", Icon: IconBarChart, desc: "Meta / TikTok / HPB" },
  { href: "/map", label: "地図分析", Icon: IconMap, desc: "都道府県別" },
  { href: "/stores", label: "店舗管理", Icon: IconStore, desc: "100店舗" },
  { href: "/import", label: "データ取込", Icon: IconUpload, desc: "CSVアップロード" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-60 flex-shrink-0 bg-stone-950 text-stone-100 flex flex-col h-screen relative overflow-hidden">
      {/* 装飾的な背景グラデーション */}
      <div
        aria-hidden
        className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #f43f5e 0%, transparent 70%)" }}
      />

      {/* ロゴ */}
      <div className="relative px-5 py-5 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-orange flex items-center justify-center shadow-lg shadow-orange-500/30 ring-1 ring-white/10 group-hover:scale-105 transition-transform">
            <span className="text-white font-bold text-lg leading-none">N</span>
          </div>
          <div className="leading-tight">
            <p className="text-[11px] text-stone-400 font-medium tracking-wider uppercase">Naoru</p>
            <p className="font-bold text-sm text-white">Marketing Hub</p>
          </div>
        </Link>
      </div>

      {/* ナビゲーション */}
      <div className="relative flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-bold text-stone-500 tracking-[0.14em] uppercase">
          メニュー
        </p>
        {NAV_ITEMS.map(({ href, label, Icon, desc }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-gradient-to-r from-orange-600 to-red-500 text-white shadow-lg shadow-orange-600/20"
                  : "text-stone-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-white/60" />
              )}
              <span
                className={`flex-shrink-0 ${
                  active ? "text-white" : "text-stone-400 group-hover:text-white"
                }`}
              >
                <Icon size={18} />
              </span>
              <div className="flex-1 min-w-0 leading-tight">
                <p className="truncate">{label}</p>
                <p
                  className={`text-[10px] font-normal truncate ${
                    active ? "text-orange-100" : "text-stone-500 group-hover:text-stone-400"
                  }`}
                >
                  {desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* フッター */}
      <div className="relative px-4 py-4 border-t border-white/5">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <p className="text-[11px] font-semibold text-white">Phase 1 MVP</p>
          </div>
          <p className="text-[10px] text-stone-400 leading-relaxed">
            Meta / TikTok API 連携は Phase 2
          </p>
        </div>
      </div>
    </nav>
  );
}
