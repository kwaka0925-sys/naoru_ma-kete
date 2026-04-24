import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcMetrics } from "@/lib/calculations";
import type { Campaign, MediaType } from "@/lib/types";

const MEDIA_TYPES: MediaType[] = ["META", "TIKTOK", "HOTPEPPER"];
const EMPTY_METRICS = calcMetrics([]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const raw = await prisma.campaign.findMany({
      where: {
        ...(from || to
          ? { period: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      include: { store: true },
    });

    const campaigns = raw as unknown as (Campaign & {
      store: { id: string; name: string; prefecture: string };
    })[];

    const overall = calcMetrics(campaigns);

    const byMedia = MEDIA_TYPES.map((media) => ({
      media,
      metrics: calcMetrics(campaigns.filter((c) => c.media === media)),
    }));

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
  } catch (e) {
    return NextResponse.json({
      overall: EMPTY_METRICS,
      byMedia: MEDIA_TYPES.map((media) => ({ media, metrics: EMPTY_METRICS })),
      topStores: [],
      dbError: e instanceof Error ? e.message : String(e),
    });
  }
}
