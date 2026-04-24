import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcMetrics } from "@/lib/calculations";
import type { Campaign, MediaType } from "@/lib/types";
import { format, subMonths, startOfMonth } from "date-fns";

const MEDIA_TYPES: MediaType[] = ["META", "TIKTOK", "HOTPEPPER"];
const EMPTY_METRICS = calcMetrics([]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const months = parseInt(searchParams.get("months") ?? "6");

  const defaultTo = format(new Date(), "yyyy-MM");
  const defaultFrom = format(subMonths(startOfMonth(new Date()), months - 1), "yyyy-MM");

  try {
    const raw = await prisma.campaign.findMany({
      where: {
        period: {
          gte: from ?? defaultFrom,
          lte: to ?? defaultTo,
        },
      },
    });

    const campaigns = raw as unknown as Campaign[];

    const byMedia = MEDIA_TYPES.map((media) => ({
      media,
      metrics: calcMetrics(campaigns.filter((c) => c.media === media)),
    }));

    const periods = [...new Set(campaigns.map((c) => c.period))].sort();
    const trend = periods.map((period) => {
      const periodCampaigns = campaigns.filter((c) => c.period === period);
      const entry: Record<string, number | string> = { period };
      for (const media of MEDIA_TYPES) {
        const m = calcMetrics(periodCampaigns.filter((c) => c.media === media));
        entry[`${media}_spend`] = m.spend;
        entry[`${media}_leads`] = m.leads;
        entry[`${media}_cpa`] = m.cpa ?? 0;
        entry[`${media}_roi`] = m.roi ?? 0;
      }
      return entry;
    });

    return NextResponse.json({ byMedia, trend });
  } catch {
    return NextResponse.json({
      byMedia: MEDIA_TYPES.map((media) => ({ media, metrics: EMPTY_METRICS })),
      trend: [],
    });
  }
}
