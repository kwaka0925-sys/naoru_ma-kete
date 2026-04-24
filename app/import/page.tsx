"use client";

import CsvUploader from "@/components/import/CsvUploader";
import MetaSyncCard from "@/components/import/MetaSyncCard";
import { IconUpload } from "@/components/ui/Icons";

export default function ImportPage() {
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ヘッダー */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
            Data Import
          </p>
        </div>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">データ取込</h1>
        <p className="text-sm text-stone-500 mt-1">
          ホットペッパービューティCSV・Meta広告APIから実績データを取り込み
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MetaSyncCard />
          <CsvUploader />
        </div>

        {/* サイドガイド */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <IconUpload size={16} />
              </div>
              <h3 className="font-bold text-sm text-stone-900">CSVの取得方法</h3>
            </div>
            <ol className="text-sm text-stone-600 space-y-2">
              {[
                "サロンボードにログイン",
                "「レポート」→「広告レポート」を開く",
                "集計期間を選択",
                "「CSVダウンロード」をクリック",
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-sm mb-3 text-stone-900">対応カラム</h3>
            <div className="text-xs space-y-2">
              {[
                ["サロン名・店舗名", "必須"],
                ["期間・年月", "必須"],
                ["掲載料・広告費", "必須"],
                ["ページビュー・PV", "任意"],
                ["クリック数", "任意"],
                ["予約数・問い合わせ数", "任意"],
              ].map(([col, req]) => (
                <div
                  key={col}
                  className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0"
                >
                  <span className="text-stone-700">{col}</span>
                  <span
                    className={
                      req === "必須"
                        ? "badge bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/10"
                        : "badge bg-stone-100 text-stone-500"
                    }
                  >
                    {req}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                !
              </span>
              <h3 className="font-bold text-sm text-amber-900">注意事項</h3>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              インポート後、都道府県が「未設定」になっている店舗は
              <span className="font-semibold">「店舗管理」</span>
              ページで正しく設定してください。地図分析には都道府県情報が必要です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
