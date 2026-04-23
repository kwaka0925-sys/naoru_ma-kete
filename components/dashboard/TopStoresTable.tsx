import { formatJPY, formatPercent } from "@/lib/calculations";

interface StoreSummary {
  store: { id: string; name: string; prefecture: string };
  metrics: {
    spend: number;
    leads: number;
    contracts: number;
    roi: number | null;
    cpa: number | null;
    revenue: number;
  };
}

interface Props {
  stores: StoreSummary[];
}

const MEDAL_COLORS = [
  "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-sm shadow-amber-500/40",
  "bg-gradient-to-br from-stone-300 to-stone-400 text-white shadow-sm shadow-stone-400/40",
  "bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-sm shadow-orange-500/40",
];

export default function TopStoresTable({ stores }: Props) {
  if (!stores.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-3">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-stone-400"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <p className="text-stone-500 text-sm">店舗データがありません</p>
      </div>
    );
  }

  const maxRoi = Math.max(...stores.map((s) => s.metrics.roi ?? 0), 1);

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            <th className="pb-3 pr-3 w-10">順位</th>
            <th className="pb-3 pr-3">店舗</th>
            <th className="pb-3 pr-3 text-right">広告費</th>
            <th className="pb-3 pr-3 text-right">リード</th>
            <th className="pb-3 pr-3 text-right">契約</th>
            <th className="pb-3 pr-3 text-right">売上</th>
            <th className="pb-3 pr-3 text-right">CPA</th>
            <th className="pb-3 text-right w-[200px]">ROI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {stores.map(({ store, metrics }, i) => {
            const roiWidth = metrics.roi
              ? Math.min(100, (Math.abs(metrics.roi) / maxRoi) * 100)
              : 0;
            const positive = metrics.roi != null && metrics.roi > 0;
            return (
              <tr
                key={store.id}
                className="hover:bg-orange-50/60 transition-colors group"
              >
                <td className="py-3 pr-3">
                  {i < 3 ? (
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${MEDAL_COLORS[i]}`}
                    >
                      {i + 1}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-stone-400 bg-stone-100">
                      {i + 1}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-3">
                  <p className="font-semibold text-stone-900 group-hover:text-orange-600 transition-colors">
                    {store.name}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">{store.prefecture}</p>
                </td>
                <td className="py-3 pr-3 text-right text-stone-700 font-medium tabular-nums">
                  {formatJPY(metrics.spend)}
                </td>
                <td className="py-3 pr-3 text-right text-stone-700 tabular-nums">
                  {Math.round(metrics.leads)}
                </td>
                <td className="py-3 pr-3 text-right text-stone-700 tabular-nums">
                  {Math.round(metrics.contracts)}
                </td>
                <td className="py-3 pr-3 text-right text-stone-900 font-semibold tabular-nums">
                  {formatJPY(metrics.revenue)}
                </td>
                <td className="py-3 pr-3 text-right text-stone-600 tabular-nums">
                  {metrics.cpa ? formatJPY(metrics.cpa) : "—"}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="flex-1 max-w-[100px] h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          positive
                            ? "bg-gradient-to-r from-amber-400 to-orange-500"
                            : "bg-gradient-to-r from-rose-400 to-red-500"
                        }`}
                        style={{ width: `${roiWidth}%` }}
                      />
                    </div>
                    <span
                      className={`font-bold text-sm tabular-nums w-16 text-right ${
                        positive ? "text-amber-600" : "text-red-500"
                      }`}
                    >
                      {formatPercent(metrics.roi)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
