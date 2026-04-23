import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcMetrics } from "@/lib/calculations";
import type { Campaign, MediaType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const raw = await prisma.campaign.findMany({
    where: {
      ...(from || to
        ? { period: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    include: { store: true },
  });

  const campaigns = raw as unknown as (Campaign & { store: { id: string; name: string; prefecture: string } })[];

  const overall = calcMetrics(campaigns);

  // 媒体別
  const mediaTypes: MediaType[] = ["META", "TIKTOK", "HOTPEPPER"];
  const byMedia = mediaTypes.map((media) => ({
    media,
    metrics: calcMetrics(campaigns.filter((c) => c.media === media)),
  }));

  // 店舗別 Top 10
  const storeMap = new Map<string, typeof campaigns>();
  for (const c of campaigns) {
    const arr = storeMap.get(c.storeId) ?? [];
    arr.push(c);
    storeMap.set(c.storeId, arr);
  }

  const topStores = Array.from(storeMap.entries())
    .map(([, storeCampaigns]) => ({
      store: storeCampaigns[0].store,
      metrics: calcMetrics(storeCampaigns),
    }))
    .sort((a, b) => (b.metrics.roi ?? -Infinity) - (a.metrics.roi ?? -Infinity))
    .slice(0, 10);

  return NextResponse.json({ overall, byMedia, topStores });
}
