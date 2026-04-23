import { formatJPY, formatPercent } from "@/lib/calculations";

interface StoreSummary {
  store: { id: string; name: string; prefecture: string };
  metrics: {
    spend: number; leads: number; contracts: number;
    roi: number | null; cpa: number | null; revenue: number;
  };
}

interface Props {
  stores: StoreSummary[];
}

export default function TopStoresTable({ stores }: Props) {
  if (!stores.length) {
    return <p className="text-gray-400 text-sm text-center py-8">データがありません</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="pb-2 pr-4">#</th>
            <th className="pb-2 pr-4">店舗名</th>
            <th className="pb-2 pr-4">都道府県</th>
            <th className="pb-2 pr-4 text-right">広告費</th>
            <th className="pb-2 pr-4 text-right">リード数</th>
            <th className="pb-2 pr-4 text-right">契約数</th>
            <th className="pb-2 pr-4 text-right">売上</th>
            <th className="pb-2 pr-4 text-right">ROI</th>
            <th className="pb-2 text-right">CPA</th>
          </tr>
        </thead>
        <tbody>
          {stores.map(({ store, metrics }, i) => (
            <tr key={store.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2.5 pr-4 text-gray-400">{i + 1}</td>
              <td className="py-2.5 pr-4 font-medium">{store.name}</td>
              <td className="py-2.5 pr-4 text-gray-500">{store.prefecture}</td>
              <td className="py-2.5 pr-4 text-right">{formatJPY(metrics.spend)}</td>
              <td className="py-2.5 pr-4 text-right">{Math.round(metrics.leads)}</td>
              <td className="py-2.5 pr-4 text-right">{Math.round(metrics.contracts)}</td>
              <td className="py-2.5 pr-4 text-right">{formatJPY(metrics.revenue)}</td>
              <td className={`py-2.5 pr-4 text-right font-medium ${
                metrics.roi != null && metrics.roi > 0 ? "text-green-600" : "text-red-500"
              }`}>
                {formatPercent(metrics.roi)}
              </td>
              <td className="py-2.5 text-right">
                {metrics.cpa ? formatJPY(metrics.cpa) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
