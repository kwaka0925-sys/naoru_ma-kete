"use client";

import { useState, useEffect, useCallback } from "react";
import StoreForm from "@/components/stores/StoreForm";
import { PREFECTURE_NAMES } from "@/lib/prefectures";
import {
  IconPlus,
  IconSearch,
  IconStore,
  IconEdit,
  IconTrash,
  IconPower,
  IconCircleCheck,
} from "@/components/ui/Icons";

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

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

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

  // 統計
  const activeCount = stores.filter((s) => s.isActive).length;
  const prefectureCount = new Set(stores.map((s) => s.prefecture)).size;
  const totalCampaigns = stores.reduce((sum, s) => sum + (s._count?.campaigns ?? 0), 0);

  // 都道府県別グループ
  const prefGroups = filtered.reduce<Record<string, Store[]>>((acc, s) => {
    const arr = acc[s.prefecture] ?? [];
    arr.push(s);
    acc[s.prefecture] = arr;
    return acc;
  }, {});

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
              Stores
            </p>
          </div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">店舗管理</h1>
          <p className="text-sm text-stone-500 mt-1">
            全 {stores.length} 店舗 · {prefectureCount} 都道府県 · {totalCampaigns} キャンペーン
          </p>
        </div>
        <button
          onClick={() => {
            setEditStore(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <IconPlus size={16} />
          店舗を追加
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "総店舗数",
            value: stores.length,
            icon: <IconStore size={18} />,
            color: "from-orange-500 to-amber-500",
          },
          {
            label: "稼働中",
            value: activeCount,
            icon: <IconCircleCheck size={18} />,
            color: "from-amber-500 to-yellow-500",
          },
          {
            label: "展開都道府県",
            value: prefectureCount,
            icon: <IconStore size={18} />,
            color: "from-rose-500 to-orange-500",
          },
          {
            label: "総キャンペーン",
            value: totalCampaigns,
            icon: <IconStore size={18} />,
            color: "from-amber-500 to-orange-500",
          },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${color} shadow-sm`}
            >
              {icon}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                {label}
              </p>
              <p className="text-xl font-bold text-stone-900 tabular-nums leading-tight">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 検索/フィルター */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -transtone-y-1/2 text-stone-400"
          />
          <input
            type="text"
            placeholder="店舗名・市区町村で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={prefFilter}
          onChange={(e) => setPrefFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">全都道府県</option>
          {PREFECTURE_NAMES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {(search || prefFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setPrefFilter("");
            }}
            className="btn-ghost"
          >
            クリア
          </button>
        )}
        <div className="ml-auto text-xs text-stone-500">
          {filtered.length} / {stores.length} 店舗を表示
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-24 mb-3" />
              <div className="skeleton h-12 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <IconStore size={28} className="text-stone-400" />
          </div>
          <p className="text-stone-600 font-semibold mb-1">
            {stores.length === 0 ? "店舗がまだ登録されていません" : "該当する店舗がありません"}
          </p>
          <p className="text-stone-400 text-sm mb-4">
            {stores.length === 0
              ? "「店舗を追加」ボタンから登録を開始しましょう"
              : "検索条件を変更してください"}
          </p>
          {stores.length === 0 && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <IconPlus size={16} />
              最初の店舗を追加
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(prefGroups).map(([pref, prefStores]) => (
            <div key={pref} className="card overflow-hidden">
              <div className="px-5 py-3 bg-stone-50/60 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span className="text-sm font-bold text-stone-800">{pref}</span>
                  <span className="text-xs text-stone-500">
                    {prefStores.length} 店舗
                  </span>
                </div>
                <div className="text-xs text-stone-500">
                  稼働中 {prefStores.filter((s) => s.isActive).length} /{" "}
                  {prefStores.length}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-stone-500 uppercase tracking-wider bg-white">
                    <th className="px-5 py-2.5">店舗名</th>
                    <th className="px-5 py-2.5">市区町村</th>
                    <th className="px-5 py-2.5 text-center">キャンペーン</th>
                    <th className="px-5 py-2.5">ステータス</th>
                    <th className="px-5 py-2.5 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {prefStores.map((store) => (
                    <tr
                      key={store.id}
                      className="hover:bg-stone-50/60 transition-colors group"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              store.isActive
                                ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white"
                                : "bg-stone-100 text-stone-400"
                            }`}
                          >
                            {store.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-stone-900">
                            {store.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-stone-500">{store.city ?? "—"}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="badge-neutral tabular-nums">
                          {store._count?.campaigns ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {store.isActive ? (
                          <span className="badge-success">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            稼働中
                          </span>
                        ) : (
                          <span className="badge-neutral">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                            停止
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-1 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditStore(store);
                              setShowForm(true);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            title="編集"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(store)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title={store.isActive ? "停止" : "有効化"}
                          >
                            <IconPower size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(store.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="削除"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <StoreForm
          store={editStore}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchStores();
          }}
        />
      )}
    </div>
  );
}
