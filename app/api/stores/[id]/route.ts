import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  prefecture: z.string().min(1).optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const store = await prisma.store.findUnique({
    where: { id: params.id },
    include: { campaigns: { orderBy: { period: "desc" } } },
  });
  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(store);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const store = await prisma.store.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(store);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.store.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
