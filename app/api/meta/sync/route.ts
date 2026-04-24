import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  fetchMetaInsights,
  extractStoreName,
  findActionValue,
  toPeriod,
} from "@/lib/meta-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SyncBodySchema = z.object({
  since: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください")
    .optional(),
  until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください")
    .optional(),
  defaultContractRate: z.number().min(0).max(100).optional(),
  defaultAvgOrderValue: z.number().min(0).optional(),
  fallbackStoreName: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    return NextResponse.json(
      {
        error:
          "META_ACCESS_TOKEN または META_AD_ACCOUNT_ID が未設定です。Vercel 環境変数を確認してください。",
      },
      { status: 500 }
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = SyncBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    since,
    until,
    defaultContractRate,
    defaultAvgOrderValue,
    fallbackStoreName = "Meta広告（未分類）",
  } = parsed.data;

  let rows;
  try {
    rows = await fetchMetaInsights({ accountId, accessToken, since, until });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  type Aggregated = {
    storeName: string;
    period: string;
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    campaignNames: Set<string>;
  };
  const grouped = new Map<string, Aggregated>();

  for (const row of rows) {
    const period = toPeriod(row.date_start);
    const storeName = extractStoreName(row.campaign_name) ?? fallbackStoreName;
    const key = `${storeName}::${period}`;

    const purchases =
      findActionValue(row.actions, [
        "omni_purchase",
        "purchase",
        "offsite_conversion.fb_pixel_purchase",
      ]) ?? 0;

    const entry = grouped.get(key) ?? {
      storeName,
      period,
      spend: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      campaignNames: new Set<string>(),
    };

    entry.spend += Number(row.spend) || 0;
    entry.impressions += Number(row.impressions) || 0;
    entry.clicks += Number(row.clicks) || 0;
    entry.leads += purchases;
    if (row.campaign_name) entry.campaignNames.add(row.campaign_name);

    grouped.set(key, entry);
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const importedItems: Array<{
    store: string;
    period: string;
    spend: number;
    leads: number;
  }> = [];

  for (const agg of grouped.values()) {
    try {
      let store = await prisma.store.findFirst({
        where: { name: { contains: agg.storeName } },
      });

      if (!store) {
        store = await prisma.store.create({
          data: {
            name: agg.storeName,
            prefecture: "未設定",
            isActive: true,
          },
        });
      }

      await prisma.campaign.upsert({
        where: {
          storeId_media_period: {
            storeId: store.id,
            media: "META",
            period: agg.period,
          },
        },
        update: {
          spend: agg.spend,
          impressions: agg.impressions || null,
          clicks: agg.clicks || null,
          leads: agg.leads || null,
          ...(defaultContractRate != null ? { contractRate: defaultContractRate } : {}),
          ...(defaultAvgOrderValue != null ? { avgOrderValue: defaultAvgOrderValue } : {}),
        },
        create: {
          storeId: store.id,
          media: "META",
          period: agg.period,
          spend: agg.spend,
          impressions: agg.impressions || null,
          clicks: agg.clicks || null,
          leads: agg.leads || null,
          contractRate: defaultContractRate ?? null,
          avgOrderValue: defaultAvgOrderValue ?? null,
        },
      });
      imported++;
      importedItems.push({
        store: store.name,
        period: agg.period,
        spend: agg.spend,
        leads: agg.leads,
      });
    } catch (e) {
      skipped++;
      errors.push(
        `${agg.storeName} ${agg.period}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    total: grouped.size,
    rawRows: rows.length,
    errors: errors.slice(0, 10),
    items: importedItems.slice(0, 20),
  });
}
