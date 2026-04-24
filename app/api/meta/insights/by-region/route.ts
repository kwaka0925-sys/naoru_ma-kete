import { NextRequest, NextResponse } from "next/server";
import {
  fetchMetaInsights,
  findActionValue,
  detectDominantConversionType,
  labelForConversionType,
  type MetaInsightRow,
} from "@/lib/meta-client";
import { mapRegionToPrefecture } from "@/lib/meta-regions";
import { matchAreaToPrefecture } from "@/lib/store-regions";
import { PREFECTURES } from "@/lib/prefectures";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Metrics {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  contracts: number;
  revenue: number;
  roi: number | null;
  cpa: number | null;
  cpl: number | null;
  ctr: number | null;
  roas: number | null;
}

interface PrefectureEntry {
  prefecture: string;
  storeCount: number;
  metrics: Metrics;
}

function rowToBase(row: MetaInsightRow, conversionTypes: string[]) {
  const spend = Number(row.spend) || 0;
  const impressions = Number(row.impressions) || 0;
  const clicks = Number(row.clicks) || 0;
  const purchases = findActionValue(row.actions, conversionTypes) ?? 0;
  const revenue = findActionValue(row.action_values, conversionTypes) ?? 0;
  return { spend, impressions, clicks, purchases, revenue };
}

function buildMetrics(base: {
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
}): Metrics {
  const { spend, impressions, clicks, purchases, revenue } = base;
  return {
    spend,
    impressions,
    clicks,
    leads: purchases,
    contracts: purchases,
    revenue,
    roi: spend > 0 && revenue > 0 ? ((revenue - spend) / spend) * 100 : null,
    cpa: purchases > 0 ? spend / purchases : null,
    cpl: purchases > 0 ? spend / purchases : null,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    roas: spend > 0 && revenue > 0 ? revenue / spend : null,
  };
}

type AggBase = {
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
};

function emptyAgg(): AggBase {
  return { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
}

function addInto(target: AggBase, add: AggBase) {
  target.spend += add.spend;
  target.impressions += add.impressions;
  target.clicks += add.clicks;
  target.purchases += add.purchases;
  target.revenue += add.revenue;
}

export async function GET(req: NextRequest) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    return NextResponse.json(
      { error: "META_ACCESS_TOKEN または META_AD_ACCOUNT_ID が未設定です。" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") ?? searchParams.get("from") ?? undefined;
  const until = searchParams.get("until") ?? searchParams.get("to") ?? undefined;
  const mode = (searchParams.get("mode") ?? "viewer") === "store" ? "store" : "viewer";

  let rows: MetaInsightRow[];
  try {
    rows = await fetchMetaInsights({
      accountId,
      accessToken,
      since: normalizePeriodToDate(since, "start"),
      until: normalizePeriodToDate(until, "end"),
      ...(mode === "viewer"
        ? { breakdowns: ["region"], level: "account", timeIncrement: "all_days" }
        : { level: "campaign", timeIncrement: "all_days" }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  const dominantConversionType = detectDominantConversionType(rows);
  const conversionTypes = dominantConversionType
    ? [dominantConversionType]
    : ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];

  const prefAgg = new Map<string, AggBase>();
  const unmapped: Array<{ region?: string; campaignName?: string; spend: number }> = [];

  if (mode === "viewer") {
    for (const row of rows) {
      const base = rowToBase(row, conversionTypes);
      const pref = mapRegionToPrefecture(row.region);
      if (!pref) {
        if (row.region) unmapped.push({ region: row.region, spend: base.spend });
        continue;
      }
      const entry = prefAgg.get(pref) ?? emptyAgg();
      addInto(entry, base);
      prefAgg.set(pref, entry);
    }
  } else {
    for (const row of rows) {
      const base = rowToBase(row, conversionTypes);
      const match = matchAreaToPrefecture(row.campaign_name);
      if (!match) {
        unmapped.push({
          campaignName: row.campaign_name,
          spend: base.spend,
        });
        continue;
      }
      const entry = prefAgg.get(match.prefecture) ?? emptyAgg();
      addInto(entry, base);
      prefAgg.set(match.prefecture, entry);
    }
  }

  const byPrefecture: PrefectureEntry[] = PREFECTURES.filter((p) => prefAgg.has(p.name))
    .map((p) => ({
      prefecture: p.name,
      storeCount: 0,
      metrics: buildMetrics(prefAgg.get(p.name)!),
    }))
    .sort((a, b) => a.prefecture.localeCompare(b.prefecture, "ja"));

  const unmappedSpend = unmapped.reduce((s, u) => s + u.spend, 0);
  const unmappedAggregated = aggregateUnmapped(unmapped);

  return NextResponse.json({
    byPrefecture,
    meta: {
      mode,
      rawRowCount: rows.length,
      mappedCount: byPrefecture.length,
      unmapped: unmappedAggregated.slice(0, 30),
      unmappedCount: unmappedAggregated.length,
      unmappedSpend,
      conversion: {
        actionType: dominantConversionType,
        label: labelForConversionType(dominantConversionType),
        autoDetected: !!dominantConversionType,
      },
      fetchedAt: new Date().toISOString(),
    },
  });
}

function aggregateUnmapped(
  items: Array<{ region?: string; campaignName?: string; spend: number }>
): Array<{ label: string; spend: number }> {
  const map = new Map<string, number>();
  for (const u of items) {
    const label = u.campaignName ?? u.region ?? "(不明)";
    map.set(label, (map.get(label) ?? 0) + u.spend);
  }
  return Array.from(map.entries())
    .map(([label, spend]) => ({ label, spend }))
    .sort((a, b) => b.spend - a.spend);
}

function normalizePeriodToDate(
  value: string | undefined,
  edge: "start" | "end"
): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) {
    if (edge === "start") return `${value}-01`;
    const [y, m] = value.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${value}-${String(last).padStart(2, "0")}`;
  }
  return undefined;
}
