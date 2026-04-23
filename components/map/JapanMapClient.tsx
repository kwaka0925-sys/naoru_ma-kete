"use client";

import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { PREFECTURES } from "@/lib/prefectures";

const JAPAN_TOPOJSON =
  "https://raw.githubusercontent.com/dataofjapan/land/master/japan.topojson";

interface PrefData {
  prefecture: string;
  storeCount: number;
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
  data: PrefData[];
  getColor: (d: PrefData) => string;
  formatMetric: (d: PrefData) => string;
  onSelect: (d: PrefData | null) => void;
  selected: PrefData | null;
}

export default function JapanMapClient({ data, getColor, formatMetric, onSelect, selected }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; pref: PrefData } | null>(null);

  const dataMap = new Map(data.map((d) => [d.prefecture, d]));

  const storesWithData = PREFECTURES.filter(
    (p) => dataMap.has(p.name) && (dataMap.get(p.name)?.storeCount ?? 0) > 0
  );

  return (
    <div className="relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [136.5, 35.5],
          scale: 1400,
        }}
        width={700}
        height={500}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={JAPAN_TOPOJSON}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const prefName = (geo.properties.nam_ja ?? geo.properties.name ?? "") as string;
              const d = dataMap.get(prefName);
              const isSelected = selected?.prefecture === prefName;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={d ? getColor(d) : "#e5e7eb"}
                  stroke="#ffffff"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none", opacity: isSelected ? 1 : 0.85 },
                    hover: { outline: "none", opacity: 1, cursor: "pointer" },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={(e) => {
                    if (d) {
                      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
                      if (rect) {
                        setTooltip({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          pref: d,
                        });
                      }
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => onSelect(d ?? null)}
                />
              );
            })
          }
        </Geographies>

        {/* 店舗マーカー */}
        {storesWithData.map((pref) => {
          const d = dataMap.get(pref.name)!;
          return (
            <Marker
              key={pref.code}
              coordinates={[pref.lng, pref.lat]}
              onClick={() => onSelect(d)}
            >
              <circle
                r={Math.min(3 + d.storeCount * 1.5, 12)}
                fill="#4f46e5"
                fillOpacity={0.7}
                stroke="#ffffff"
                strokeWidth={1}
                style={{ cursor: "pointer" }}
              />
            </Marker>
          );
        })}
      </ComposableMap>

      {/* ツールチップ */}
      {tooltip && (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none z-10 shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 40 }}
        >
          <p className="font-medium">{tooltip.pref.prefecture}</p>
          <p>{formatMetric(tooltip.pref)}</p>
          <p className="text-gray-400">{tooltip.pref.storeCount} 店舗</p>
        </div>
      )}

      {/* 凡例 */}
      <div className="absolute bottom-3 right-3 bg-white/90 rounded-lg p-2 text-xs shadow">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3 rounded-full bg-gray-200" />
          <span className="text-gray-500">データなし</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ background: "rgb(255,80,80)" }} />
          <span className="text-gray-500">低</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ background: "rgb(0,200,80)" }} />
          <span className="text-gray-500">高</span>
        </div>
      </div>
    </div>
  );
}
