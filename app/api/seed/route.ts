import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SAMPLE_STORES = [
  { name: "ナオル整体院 新宿店", prefecture: "東京都", city: "新宿区", lat: 35.6938, lng: 139.7034 },
  { name: "ナオル整体院 渋谷店", prefecture: "東京都", city: "渋谷区", lat: 35.6580, lng: 139.7016 },
  { name: "ナオル整体院 横浜店", prefecture: "神奈川県", city: "横浜市", lat: 35.4437, lng: 139.6380 },
  { name: "ナオル整体院 大阪梅田店", prefecture: "大阪府", city: "大阪市", lat: 34.7024, lng: 135.4959 },
  { name: "ナオル整体院 心斎橋店", prefecture: "大阪府", city: "大阪市", lat: 34.6747, lng: 135.5023 },
  { name: "ナオル整体院 名古屋栄店", prefecture: "愛知県", city: "名古屋市", lat: 35.1710, lng: 136.9073 },
  { name: "ナオル整体院 福岡天神店", prefecture: "福岡県", city: "福岡市", lat: 33.5904, lng: 130.3990 },
  { name: "ナオル整体院 札幌大通店", prefecture: "北海道", city: "札幌市", lat: 43.0619, lng: 141.3542 },
  { name: "ナオル整体院 仙台店", prefecture: "宮城県", city: "仙台市", lat: 38.2682, lng: 140.8694 },
  { name: "ナオル整体院 広島店", prefecture: "広島県", city: "広島市", lat: 34.3853, lng: 132.4553 },
  { name: "ナオル整体院 京都四条店", prefecture: "京都府", city: "京都市", lat: 35.0030, lng: 135.7680 },
  { name: "ナオル整体院 神戸三宮店", prefecture: "兵庫県", city: "神戸市", lat: 34.6913, lng: 135.1956 },
];

const MEDIAS = ["META", "TIKTOK", "HOTPEPPER"] as const;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function getPastPeriods(months: number): string[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return periods;
}

export async function POST() {
  // 既存データのクリア
  await prisma.campaign.deleteMany();
  await prisma.store.deleteMany();

  // 店舗作成
  const stores = await Promise.all(
    SAMPLE_STORES.map((s) => prisma.store.create({ data: s }))
  );

  const periods = getPastPeriods(6);

  // キャンペーンデータ生成（媒体・月・店舗ごと）
  const campaigns = [];
  for (const store of stores) {
    for (const period of periods) {
      for (const media of MEDIAS) {
        const spend = media === "HOTPEPPER"
          ? randInt(30000, 100000)
          : randInt(50000, 300000);

        const impressions = media === "HOTPEPPER"
          ? randInt(5000, 30000)
          : randInt(20000, 200000);

        const ctr = randFloat(1.5, 4.5) / 100;
        const clicks = Math.floor(impressions * ctr);
        const cvr = randFloat(2.0, 8.0) / 100;
        const leads = Math.floor(clicks * cvr);

        campaigns.push({
          storeId: store.id,
          media,
          period,
          spend,
          impressions,
          clicks,
          leads,
          contractRate: randFloat(15, 45),
          avgOrderValue: randInt(8000, 25000),
        });
      }
    }
  }

  await prisma.campaign.createMany({ data: campaigns });

  return NextResponse.json({
    success: true,
    stores: stores.length,
    campaigns: campaigns.length,
  });
}
