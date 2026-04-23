import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const StoreSchema = z.object({
  name: z.string().min(1),
  prefecture: z.string().min(1),
  city: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prefecture = searchParams.get("prefecture");

  const stores = await prisma.store.findMany({
    where: prefecture ? { prefecture } : undefined,
    orderBy: [{ prefecture: "asc" }, { name: "asc" }],
    include: { _count: { select: { campaigns: true } } },
  });

  return NextResponse.json(stores);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = StoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const store = await prisma.store.create({ data: parsed.data });
  return NextResponse.json(store, { status: 201 });
}
