"use client";

import { useState, useEffect, useCallback } from "react";
import StoreForm from "@/components/stores/StoreForm";
import { PREFECTURE_NAMES } from "@/lib/prefectures";

interface Store {
  id: string;
  name: string;
  prefecture: string;
  city: string | null;
  isActive: boolean;
  _count?: { campaigns: number };
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [search, setSearch] = useState("");
  const [prefFilter, setPrefFilter] = useState("");

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stores");
      const data = await res.json();
      setStores(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const handleDelete = async (id: string) => {
    if (!confirm("この店舗を削除しますか？関連データも削除されます。")) return;
    await fetch(`/api/stores/${id}`, { method: "DELETE" });
    fetchStores();
  };

  const handleToggleActive = async (store: Store) => {
    await fetch(`/api/stores/${store.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !store.isActive }),
    });
    fetchStores();
  };

  const filtered = stores.filter((s) => {
    const matchSearch = !search || s.name.includes(search) || (s.city ?? "").includes(search);
    const matchPref = !prefFilter || s.prefecture === prefFilter;
    return matchSearch && matchPref;
  });

  // 都道府県別グループ
  const prefGroups = filtered.reduce<Record<string, Store[]>>((acc, s) => {
    const arr = acc[s.prefecture] ?? [];
    arr.push(s);
    acc[s.prefecture] = arr;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">店舗管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">全 {stores.length} 店舗</p>
        </div>
        <button onClick={() => { setEditStore(null); setShowForm(true); }} className="btn-primary">
          + 店舗を追加
        </button>
      </div>

      {/* フィルター */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="店舗名・市区町村で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <select value={prefFilter} onChange={(e) => setPrefFilter(e.target.value)} className="input w-auto">
          <option value="">全都道府県</option>
          {PREFECTURE_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm py-10 text-center">読み込み中...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(prefGroups).map(([pref, prefStores]) => (
            <div key={pref} className="card overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-700">{pref}</span>
                <span className="ml-2 text-xs text-gray-400">{prefStores.length} 店舗</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-2">店舗名</th>
                    <th className="px-4 py-2">市区町村</th>
                    <th className="px-4 py-2">キャンペーン数</th>
                    <th className="px-4 py-2">ステータス</th>
                    <th className="px-4 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {prefStores.map((store) => (
                    <tr key={store.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">{store.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{store.city ?? "-"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{store._count?.campaigns ?? 0} 件</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            store.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {store.isActive ? "稼働中" : "停止"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setEditStore(store); setShowForm(true); }}
                            className="text-indigo-600 hover:text-indigo-800 text-xs"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleToggleActive(store)}
                            className="text-gray-500 hover:text-gray-700 text-xs"
                          >
                            {store.isActive ? "停止" : "有効化"}
                          </button>
                          <button
                            onClick={() => handleDelete(store.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card p-12 text-center text-gray-400">
              <p className="text-lg mb-2">店舗がありません</p>
              <p className="text-sm">「+ 店舗を追加」から店舗を登録してください</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <StoreForm
          store={editStore}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchStores(); }}
        />
      )}
    </div>
  );
}
