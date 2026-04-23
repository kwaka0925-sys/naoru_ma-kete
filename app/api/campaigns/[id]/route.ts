import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  spend: z.number().min(0).optional(),
  impressions: z.number().int().min(0).optional().nullable(),
  clicks: z.number().int().min(0).optional().nullable(),
  leads: z.number().int().min(0).optional().nullable(),
  contractRate: z.number().min(0).max(100).optional().nullable(),
  avgOrderValue: z.number().min(0).optional().nullable(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await prisma.campaign.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(campaign);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
