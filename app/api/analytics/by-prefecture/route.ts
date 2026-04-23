import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcMetrics } from "@/lib/calculations";
import type { Campaign } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const media = searchParams.get("media");

  const raw = await prisma.campaign.findMany({
    where: {
      ...(from || to
        ? { period: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
      ...(media ? { media } : {}),
    },
    include: { store: { select: { prefecture: true } } },
  });

  const campaigns = raw as unknown as (Campaign & { store: { prefecture: string } })[];

  // 都道府県別に集計
  const prefMap = new Map<string, Campaign[]>();
  for (const c of campaigns) {
    const pref = c.store.prefecture;
    const arr = prefMap.get(pref) ?? [];
    arr.push(c);
    prefMap.set(pref, arr);
  }

  const byPrefecture = Array.from(prefMap.entries())
    .map(([prefecture, pCampaigns]) => ({
      prefecture,
      storeCount: new Set(pCampaigns.map((c) => c.storeId)).size,
      metrics: calcMetrics(pCampaigns),
    }))
    .sort((a, b) => a.prefecture.localeCompare(b.prefecture, "ja"));

  return NextResponse.json(byPrefecture);
}
