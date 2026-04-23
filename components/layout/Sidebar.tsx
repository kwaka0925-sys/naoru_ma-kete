"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: "🏠" },
  { href: "/media", label: "媒体別分析", icon: "📊" },
  { href: "/map", label: "地図分析", icon: "🗾" },
  { href: "/stores", label: "店舗管理", icon: "🏪" },
  { href: "/import", label: "データ取込", icon: "📥" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-56 flex-shrink-0 bg-gray-900 text-white flex flex-col h-screen">
      {/* ロゴ */}
      <div className="px-5 py-5 border-b border-gray-700">
        <p className="text-xs text-gray-400 leading-tight">マーケティング</p>
        <p className="font-bold text-base leading-tight">ダッシュボード</p>
        <p className="text-xs text-gray-400 mt-0.5">全国100店舗対応</p>
      </div>

      {/* ナビゲーション */}
      <div className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </div>

      {/* フッター */}
      <div className="px-5 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">Phase 1 MVP</p>
        <p className="text-xs text-gray-500">Meta / TikTok / HPB</p>
      </div>
    </nav>
  );
}
