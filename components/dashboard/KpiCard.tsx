interface KpiCardProps {
  title: string;
  value: string;
  icon: string;
  color: "indigo" | "blue" | "green" | "red" | "purple" | "yellow";
  subtitle?: string;
  delta?: { value: string; positive: boolean };
}

const COLOR_MAP = {
  indigo: "bg-indigo-50 text-indigo-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
  purple: "bg-purple-50 text-purple-700",
  yellow: "bg-yellow-50 text-yellow-700",
};

export default function KpiCard({ title, value, icon, color, subtitle, delta }: KpiCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          {delta && (
            <p className={`text-xs mt-1 font-medium ${delta.positive ? "text-green-600" : "text-red-500"}`}>
              {delta.positive ? "↑" : "↓"} {delta.value}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${COLOR_MAP[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
