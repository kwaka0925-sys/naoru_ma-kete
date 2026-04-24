import { NextRequest, NextResponse } from "next/server";
import {
  fetchMetaInsights,
  fetchAccountInfo,
  findActionValue,
  normalizeAccountId,
  toPeriod,
  detectDominantConversionType,
  labelForConversionType,
  type MetaInsightRow,
} from "@/lib/meta-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Metrics {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchases: number;
  purchaseValue: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  costPerPurchase: number | null;
  roas: number | null;
}

interface CampaignMetrics extends Metrics {
  campaignId: string;
  campaignName: string;
}

interface PeriodMetrics extends Metrics {
  period: string;
}

function computeMetrics(base: Omit<Metrics, "ctr" | "cpc" | "cpm" | "costPerPurchase" | "roas">): Metrics {
  const { spend, impressions, clicks, reach, purchases, purchaseValue } = base;
  return {
    spend,
    impressions,
    clicks,
    reach,
    purchases,
    purchaseValue,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    costPerPurchase: purchases > 0 ? spend / purchases : null,
    roas: spend > 0 && purchaseValue > 0 ? purchaseValue / spend : null,
  };
}

function rowToBase(row: MetaInsightRow, conversionTypes: string[]) {
  return {
    spend: Number(row.spend) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    reach: Number(row.reach) || 0,
    purchases: findActionValue(row.actions, conversionTypes) ?? 0,
    purchaseValue: findActionValue(row.action_values, conversionTypes) ?? 0,
  };
}

function addBase(
  a: Omit<Metrics, "ctr" | "cpc" | "cpm" | "costPerPurchase" | "roas">,
  b: Omit<Metrics, "ctr" | "cpc" | "cpm" | "costPerPurchase" | "roas">
) {
  return {
    spend: a.spend + b.spend,
    impressions: a.impressions + b.impressions,
    clicks: a.clicks + b.clicks,
    reach: a.reach + b.reach,
    purchases: a.purchases + b.purchases,
    purchaseValue: a.purchaseValue + b.purchaseValue,
  };
}

export async function GET(req: NextRequest) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    return NextResponse.json(
      {
        configured: false,
        error: "META_ACCESS_TOKEN または META_AD_ACCOUNT_ID が未設定です。",
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") ?? undefined;
  const until = searchParams.get("until") ?? undefined;

  let all: MetaInsightRow[];
  let accountInfo: Awaited<ReturnType<typeof fetchAccountInfo>> | null = null;
  try {
    const [info, rows] = await Promise.all([
      fetchAccountInfo({ accountId, accessToken }).catch(() => null),
      fetchMetaInsights({ accountId, accessToken, since, until }),
    ]);
    accountInfo = info;
    all = rows;
  } catch (e) {
    return NextResponse.json(
      { configured: true, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  const dominantConversionType = detectDominantConversionType(all);
  const conversionTypes = dominantConversionType
    ? [dominantConversionType]
    : ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];

  let overallBase = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    reach: 0,
    purchases: 0,
    purchaseValue: 0,
  };
  const byCampaignMap = new Map<string, CampaignMetrics>();
  const byPeriodMap = new Map<string, PeriodMetrics>();

  for (const row of all) {
    const base = rowToBase(row, conversionTypes);
    overallBase = addBase(overallBase, base);

    const cid = row.campaign_id ?? "unknown";
    const cname = row.campaign_name ?? "(名前なし)";
    const existingC = byCampaignMap.get(cid);
    if (existingC) {
      const merged = addBase(existingC, base);
      byCampaignMap.set(cid, {
        campaignId: cid,
        campaignName: cname,
        ...computeMetrics(merged),
      });
    } else {
      byCampaignMap.set(cid, {
        campaignId: cid,
        campaignName: cname,
        ...computeMetrics(base),
      });
    }

    const period = toPeriod(row.date_start);
    const existingP = byPeriodMap.get(period);
    if (existingP) {
      const merged = addBase(existingP, base);
      byPeriodMap.set(period, { period, ...computeMetrics(merged) });
    } else {
      byPeriodMap.set(period, { period, ...computeMetrics(base) });
    }
  }

  const overall = computeMetrics(overallBase);

  const byCampaign = Array.from(byCampaignMap.values()).sort((a, b) => b.spend - a.spend);
  const byPeriod = Array.from(byPeriodMap.values()).sort((a, b) => a.period.localeCompare(b.period));

  return NextResponse.json({
    configured: true,
    accountId: normalizeAccountId(accountId),
    accountName: accountInfo?.name ?? "",
    currency: accountInfo?.currency ?? "JPY",
    period: { since: since ?? null, until: until ?? null },
    overall,
    byCampaign,
    byPeriod,
    rawRowCount: all.length,
    conversion: {
      actionType: dominantConversionType,
      label: labelForConversionType(dominantConversionType),
      autoDetected: !!dominantConversionType,
    },
    fetchedAt: new Date().toISOString(),
  });
}
