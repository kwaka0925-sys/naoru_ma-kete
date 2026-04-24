"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, LeafletMouseEvent } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";

const GEOJSON_URL =
  "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson";

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
  showStores?: boolean;
}

interface PrefProperties {
  nam_ja?: string;
  name?: string;
  [key: string]: unknown;
}

export default function LeafletJapanMap({
  data,
  getColor,
  formatMetric,
  onSelect,
  selected,
  showStores = true,
}: Props) {
  const [geo, setGeo] = useState<FeatureCollection<Geometry, PrefProperties> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON load failed (${r.status})`);
        return r.json();
      })
      .then((json: FeatureCollection<Geometry, PrefProperties>) => {
        if (!cancelled) {
          setGeo(json);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dataMap = useMemo(
    () => new Map(data.map((d) => [d.prefecture, d])),
    [data]
  );

  const geoKey = useMemo(() => {
    const selKey = selected?.prefecture ?? "";
    const dataKey = data
      .map((d) => `${d.prefecture}:${getColor(d)}`)
      .join("|");
    return `${selKey}::${dataKey}`;
  }, [data, getColor, selected]);

  const style = (feature?: Feature<Geometry, PrefProperties>) => {
    const prefName = feature?.properties?.nam_ja ?? feature?.properties?.name ?? "";
    const d = dataMap.get(prefName);
    const isSelected = selected?.prefecture === prefName;
    return {
      fillColor: d ? getColor(d) : "#e5e7eb",
      weight: isSelected ? 2 : 0.8,
      color: isSelected ? "#ea580c" : "#ffffff",
      fillOpacity: d ? 0.72 : 0.3,
    };
  };

  const onEachFeature = (feature: Feature<Geometry, PrefProperties>, layer: Layer) => {
    const prefName = feature.properties?.nam_ja ?? feature.properties?.name ?? "";
    const d = dataMap.get(prefName);

    const tooltipHtml = d
      ? `<div style="font-family:system-ui"><strong style="font-size:13px">${prefName}</strong><br/><span style="color:#ea580c;font-weight:600">${formatMetric(
          d
        )}</span>${
          showStores && d.storeCount > 0
            ? `<br/><span style="color:#78716c;font-size:11px">${d.storeCount} 店舗</span>`
            : ""
        }</div>`
      : `<div style="font-family:system-ui;color:#a8a29e"><strong>${prefName}</strong><br/>データなし</div>`;

    layer.bindTooltip(tooltipHtml, { sticky: true, direction: "top" });

    layer.on({
      click: () => onSelect(d ?? null),
      mouseover: (e: LeafletMouseEvent) => {
        const path = e.target as { setStyle?: (s: Record<string, number | string>) => void };
        path.setStyle?.({ weight: 2, fillOpacity: 0.9 });
      },
      mouseout: (e: LeafletMouseEvent) => {
        const path = e.target as { setStyle?: (s: Record<string, number | string>) => void };
        const isSelected = selected?.prefecture === prefName;
        path.setStyle?.({
          weight: isSelected ? 2 : 0.8,
          fillOpacity: d ? 0.72 : 0.3,
        });
      },
    });
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-stone-200" style={{ height: 560 }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-stone-200 border-t-orange-500 animate-spin" />
            <span className="text-stone-500 text-sm font-medium">地図を読み込み中...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-rose-50">
          <p className="text-xs text-rose-700">地図の読み込みに失敗: {error}</p>
        </div>
      )}
      <MapContainer
        center={[37.5, 137.5]}
        zoom={5}
        minZoom={4}
        maxZoom={10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geo && (
          <GeoJSON key={geoKey} data={geo} style={style} onEachFeature={onEachFeature} />
        )}
      </MapContainer>
    </div>
  );
}
