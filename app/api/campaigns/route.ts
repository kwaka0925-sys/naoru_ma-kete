import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const CampaignSchema = z.object({
  storeId: z.string().min(1),
  media: z.enum(["META", "TIKTOK", "HOTPEPPER"]),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  spend: z.number().min(0),
  impressions: z.number().int().min(0).optional().nullable(),
  clicks: z.number().int().min(0).optional().nullable(),
  leads: z.number().int().min(0).optional().nullable(),
  contractRate: z.number().min(0).max(100).optional().nullable(),
  avgOrderValue: z.number().min(0).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const media = searchParams.get("media");
  const period = searchParams.get("period");
  const fromPeriod = searchParams.get("from");
  const toPeriod = searchParams.get("to");

  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(storeId ? { storeId } : {}),
      ...(media ? { media } : {}),
      ...(period ? { period } : {}),
      ...(fromPeriod || toPeriod
        ? {
            period: {
              ...(fromPeriod ? { gte: fromPeriod } : {}),
              ...(toPeriod ? { lte: toPeriod } : {}),
            },
          }
        : {}),
    },
    include: { store: true },
    orderBy: [{ period: "desc" }, { media: "asc" }],
  });

  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await prisma.campaign.upsert({
    where: {
      storeId_media_period: {
        storeId: parsed.data.storeId,
        media: parsed.data.media,
        period: parsed.data.period,
      },
    },
    update: parsed.data,
    create: parsed.data,
  });

  return NextResponse.json(campaign, { status: 201 });
}
