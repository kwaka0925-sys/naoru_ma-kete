"use client";

import { useState } from "react";
import { PREFECTURE_NAMES } from "@/lib/prefectures";
import { IconClose, IconStore } from "@/components/ui/Icons";

interface Store {
  id: string;
  name: string;
  prefecture: string;
  city: string | null;
  isActive: boolean;
}

interface Props {
  store: Store | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function StoreForm({ store, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: store?.name ?? "",
    prefecture: store?.prefecture ?? "",
    city: store?.city ?? "",
    address: "",
    isActive: store?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = store ? `/api/stores/${store.id}` : "/api/stores";
    const method = store ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json();
      setError(JSON.stringify(data.error) ?? "保存に失敗しました");
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-sm">
              <IconStore size={16} />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {store ? "店舗を編集" : "店舗を追加"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <IconClose size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div>
            <label className="label">
              店舗名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="input"
              placeholder="例: ナオル整体院 新宿店"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                都道府県 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.prefecture}
                onChange={(e) => set("prefecture", e.target.value)}
                className="input"
                required
              >
                <option value="">選択してください</option>
                {PREFECTURE_NAMES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">市区町村</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className="input"
                placeholder="例: 新宿区"
              />
            </div>
          </div>

          <div>
            <label className="label">住所</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="input"
              placeholder="例: 新宿区西新宿1-1-1"
            />
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100/80 transition-colors">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <p className="text-sm font-semibold text-slate-800">稼働中</p>
              <p className="text-xs text-slate-500">
                分析対象に含めます
              </p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              キャンセル
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
