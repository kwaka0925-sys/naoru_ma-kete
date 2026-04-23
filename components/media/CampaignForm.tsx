"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MEDIA_LABELS, MEDIA_COLORS, type MediaType } from "@/lib/types";
import { IconClose, IconBarChart, IconSparkles } from "@/components/ui/Icons";

interface Store {
  id: string;
  name: string;
  prefecture: string;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
  initialMedia?: MediaType;
}

const CURRENT_PERIOD = format(new Date(), "yyyy-MM");

export default function CampaignForm({ onClose, onSaved, initialMedia }: Props) {
  const [stores, setStores] = useState<Store[]>([]);
  const [form, setForm] = useState({
    storeId: "",
    media: initialMedia ?? ("META" as MediaType),
    period: CURRENT_PERIOD,
    spend: "",
    impressions: "",
    clicks: "",
    leads: "",
    contractRate: "",
    avgOrderValue: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then(setStores);
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeId) {
      setError("店舗を選択してください");
      return;
    }
    setSaving(true);
    setError("");

    const body = {
      storeId: form.storeId,
      media: form.media,
      period: form.period,
      spend: parseFloat(form.spend) || 0,
      impressions: form.impressions ? parseInt(form.impressions) : null,
      clicks: form.clicks ? parseInt(form.clicks) : null,
      leads: form.leads ? parseInt(form.leads) : null,
      contractRate: form.contractRate ? parseFloat(form.contractRate) : null,
      avgOrderValue: form.avgOrderValue ? parseFloat(form.avgOrderValue) : null,
    };

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json();
      setError(data.error?.message ?? "保存に失敗しました");
    }
    setSaving(false);
  };

  const showForecast =
    form.leads && form.contractRate && form.avgOrderValue
      ? {
          contracts: Math.round(
            (parseFloat(form.leads) * parseFloat(form.contractRate)) / 100
          ),
          revenue: Math.round(
            ((parseFloat(form.leads) * parseFloat(form.contractRate)) / 100) *
              parseFloat(form.avgOrderValue)
          ),
          cpa: form.spend
            ? Math.round(
                parseFloat(form.spend) /
                  ((parseFloat(form.leads) * parseFloat(form.contractRate)) / 100)
              )
            : null,
        }
      : null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ background: MEDIA_COLORS[form.media] }}
            >
              <IconBarChart size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">キャンペーンデータ入力</h2>
              <p className="text-xs text-slate-500">{MEDIA_LABELS[form.media]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <IconClose size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                店舗 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.storeId}
                onChange={(e) => set("storeId", e.target.value)}
                className="input"
                required
              >
                <option value="">選択してください</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                媒体 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.media}
                onChange={(e) => set("media", e.target.value)}
                className="input"
              >
                {(["META", "TIKTOK", "HOTPEPPER"] as MediaType[]).map((m) => (
                  <option key={m} value={m}>
                    {MEDIA_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                対象年月 <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                value={form.period}
                onChange={(e) => set("period", e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">
                広告費 (円) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.spend}
                onChange={(e) => set("spend", e.target.value)}
                className="input"
                placeholder="例: 150000"
                min="0"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              パフォーマンス
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">インプレッション</label>
                <input
                  type="number"
                  value={form.impressions}
                  onChange={(e) => set("impressions", e.target.value)}
                  className="input"
                  placeholder="50000"
                  min="0"
                />
              </div>
              <div>
                <label className="label">クリック数</label>
                <input
                  type="number"
                  value={form.clicks}
                  onChange={(e) => set("clicks", e.target.value)}
                  className="input"
                  placeholder="1200"
                  min="0"
                />
              </div>
              <div>
                <label className="label">リード数</label>
                <input
                  type="number"
                  value={form.leads}
                  onChange={(e) => set("leads", e.target.value)}
                  className="input"
                  placeholder="45"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              ROI計算用
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">契約率 (%)</label>
                <input
                  type="number"
                  value={form.contractRate}
                  onChange={(e) => set("contractRate", e.target.value)}
                  className="input"
                  placeholder="例: 30"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div>
                <label className="label">客単価 (円)</label>
                <input
                  type="number"
                  value={form.avgOrderValue}
                  onChange={(e) => set("avgOrderValue", e.target.value)}
                  className="input"
                  placeholder="例: 15000"
                  min="0"
                />
              </div>
            </div>
          </div>

          {showForecast && (
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-4 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-2">
                <IconSparkles size={14} className="text-indigo-600" />
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  予測値
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider">
                    契約数
                  </p>
                  <p className="font-bold text-indigo-900 tabular-nums">
                    {showForecast.contracts} 件
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider">
                    売上
                  </p>
                  <p className="font-bold text-indigo-900 tabular-nums">
                    ¥{showForecast.revenue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider">
                    CPA
                  </p>
                  <p className="font-bold text-indigo-900 tabular-nums">
                    {showForecast.cpa ? `¥${showForecast.cpa.toLocaleString()}` : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-slate-50/50">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving}
            onClick={handleSubmit}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
