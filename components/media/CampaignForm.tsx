"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MEDIA_LABELS, type MediaType } from "@/lib/types";

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
    fetch("/api/stores").then((r) => r.json()).then(setStores);
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeId) { setError("店舗を選択してください"); return; }
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">キャンペーンデータ入力</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">店舗 *</label>
              <select value={form.storeId} onChange={(e) => set("storeId", e.target.value)} className="input" required>
                <option value="">選択してください</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">媒体 *</label>
              <select value={form.media} onChange={(e) => set("media", e.target.value)} className="input">
                {(["META", "TIKTOK", "HOTPEPPER"] as MediaType[]).map((m) => (
                  <option key={m} value={m}>{MEDIA_LABELS[m]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">対象年月 *</label>
              <input
                type="month"
                value={form.period}
                onChange={(e) => set("period", e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">広告費 (円) *</label>
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">インプレッション</label>
              <input type="number" value={form.impressions} onChange={(e) => set("impressions", e.target.value)} className="input" placeholder="例: 50000" min="0" />
            </div>
            <div>
              <label className="label">クリック数</label>
              <input type="number" value={form.clicks} onChange={(e) => set("clicks", e.target.value)} className="input" placeholder="例: 1200" min="0" />
            </div>
            <div>
              <label className="label">リード数</label>
              <input type="number" value={form.leads} onChange={(e) => set("leads", e.target.value)} className="input" placeholder="例: 45" min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1 border-t border-gray-100">
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

          {form.leads && form.contractRate && form.avgOrderValue && (
            <div className="bg-indigo-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-indigo-700 mb-1">予測値</p>
              <div className="flex gap-6 text-indigo-600">
                <span>契約数: {Math.round(parseFloat(form.leads) * parseFloat(form.contractRate) / 100)} 件</span>
                <span>売上: ¥{Math.round(parseFloat(form.leads) * parseFloat(form.contractRate) / 100 * parseFloat(form.avgOrderValue)).toLocaleString()}</span>
                {form.spend && (
                  <span>CPA: ¥{Math.round(parseFloat(form.spend) / (parseFloat(form.leads) * parseFloat(form.contractRate) / 100)).toLocaleString()}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              キャンセル
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
