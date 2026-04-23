import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCsvText, applyMapping } from "@/lib/csv-parser";
import type { HotpepperMappedRow } from "@/lib/csv-parser";
import { z } from "zod";

const ImportBodySchema = z.object({
  csvText: z.string().min(1),
  mapping: z.record(z.string()),
  defaultContractRate: z.number().min(0).max(100).optional(),
  defaultAvgOrderValue: z.number().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ImportBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { csvText, mapping, defaultContractRate, defaultAvgOrderValue } = parsed.data;
  const { rows, headers, error } = parseCsvText(csvText);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const mappedRows = applyMapping(
    rows,
    mapping as Partial<Record<keyof HotpepperMappedRow, string>>
  );

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of mappedRows) {
    // 店舗を名前で検索（なければ作成）
    let store = await prisma.store.findFirst({
      where: { name: { contains: row.storeName } },
    });

    if (!store) {
      store = await prisma.store.create({
        data: {
          name: row.storeName,
          prefecture: "未設定",
          isActive: true,
        },
      });
    }

    try {
      await prisma.campaign.upsert({
        where: {
          storeId_media_period: {
            storeId: store.id,
            media: "HOTPEPPER",
            period: row.period,
          },
        },
        update: {
          spend: row.spend,
          impressions: row.views ?? null,
          clicks: row.clicks ?? null,
          leads: row.leads ?? null,
          contractRate: defaultContractRate ?? null,
          avgOrderValue: defaultAvgOrderValue ?? null,
        },
        create: {
          storeId: store.id,
          media: "HOTPEPPER",
          period: row.period,
          spend: row.spend,
          impressions: row.views ?? null,
          clicks: row.clicks ?? null,
          leads: row.leads ?? null,
          contractRate: defaultContractRate ?? null,
          avgOrderValue: defaultAvgOrderValue ?? null,
        },
      });
      imported++;
    } catch (e) {
      skipped++;
      errors.push(`${row.storeName} ${row.period}: ${String(e)}`);
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    total: mappedRows.length,
    errors: errors.slice(0, 10),
    headers,
  });
}
