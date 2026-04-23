"use client";

import { useState } from "react";
import { PREFECTURE_NAMES } from "@/lib/prefectures";

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">{store ? "店舗を編集" : "店舗を追加"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded">{error}</p>}

          <div>
            <label className="label">店舗名 *</label>
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
              <label className="label">都道府県 *</label>
              <select value={form.prefecture} onChange={(e) => set("prefecture", e.target.value)} className="input" required>
                <option value="">選択してください</option>
                {PREFECTURE_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">稼働中</label>
          </div>

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
