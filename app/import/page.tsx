"use client";

import CsvUploader from "@/components/import/CsvUploader";

export default function ImportPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">データ取込</h1>
        <p className="text-sm text-gray-500 mt-1">
          ホットペッパービューティ サロンボードのCSVをアップロードして分析データとして取り込みます
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CsvUploader />
        </div>

        {/* ガイド */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-2">CSVの取得方法</h3>
            <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
              <li>サロンボードにログイン</li>
              <li>「レポート」→「広告レポート」を開く</li>
              <li>集計期間を選択</li>
              <li>「CSVダウンロード」をクリック</li>
            </ol>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-2">対応カラム</h3>
            <div className="text-xs text-gray-600 space-y-1">
              {[
                ["サロン名・店舗名", "必須"],
                ["期間・年月", "必須"],
                ["掲載料・広告費", "必須"],
                ["ページビュー・PV", "任意"],
                ["クリック数", "任意"],
                ["予約数・問い合わせ数", "任意"],
              ].map(([col, req]) => (
                <div key={col} className="flex justify-between">
                  <span>{col}</span>
                  <span className={req === "必須" ? "text-red-500 font-medium" : "text-gray-400"}>{req}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 bg-yellow-50 border-yellow-200">
            <h3 className="font-semibold text-sm mb-1 text-yellow-800">注意事項</h3>
            <p className="text-xs text-yellow-700 leading-relaxed">
              インポート後、都道府県が「未設定」になっている店舗は「店舗管理」ページで正しく設定してください。
              地図分析には都道府県情報が必要です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
