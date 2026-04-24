import { NextRequest, NextResponse } from "next/server";
import {
  fetchMetaInsights,
  findActionValue,
  detectDominantConversionType,
  labelForConversionType,
  type MetaInsightRow,
} from "@/lib/meta-client";
import { mapRegionToPrefecture } from "@/lib/meta-regions";
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

  let rows: MetaInsightRow[];
  try {
    rows = await fetchMetaInsights({
      accountId,
      accessToken,
      since: normalizePeriodToDate(since, "start"),
      until: normalizePeriodToDate(until, "end"),
      breakdowns: ["region"],
      level: "account",
      timeIncrement: "all_days",
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

  const prefAgg = new Map<
    string,
    { spend: number; impressions: number; clicks: number; purchases: number; revenue: number; unmappedRegions: Set<string> }
  >();

  const unmapped: Array<{ region: string; spend: number }> = [];

  for (const row of rows) {
    const base = rowToBase(row, conversionTypes);
    const pref = mapRegionToPrefecture(row.region);
    if (!pref) {
      if (row.region) {
        unmapped.push({ region: row.region, spend: base.spend });
      }
      continue;
    }
    const entry =
      prefAgg.get(pref) ??
      {
        spend: 0,
        impressions: 0,
        clicks: 0,
        purchases: 0,
        revenue: 0,
        unmappedRegions: new Set<string>(),
      };
    entry.spend += base.spend;
    entry.impressions += base.impressions;
    entry.clicks += base.clicks;
    entry.purchases += base.purchases;
    entry.revenue += base.revenue;
    prefAgg.set(pref, entry);
  }

  const byPrefecture: PrefectureEntry[] = PREFECTURES.filter((p) => prefAgg.has(p.name))
    .map((p) => ({
      prefecture: p.name,
      storeCount: 0,
      metrics: buildMetrics(prefAgg.get(p.name)!),
    }))
    .sort((a, b) => a.prefecture.localeCompare(b.prefecture, "ja"));

  return NextResponse.json({
    byPrefecture,
    meta: {
      rawRowCount: rows.length,
      mappedCount: byPrefecture.length,
      unmapped: unmapped.slice(0, 20),
      unmappedSpend: unmapped.reduce((s, u) => s + u.spend, 0),
      conversion: {
        actionType: dominantConversionType,
        label: labelForConversionType(dominantConversionType),
        autoDetected: !!dominantConversionType,
      },
      fetchedAt: new Date().toISOString(),
    },
  });
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
