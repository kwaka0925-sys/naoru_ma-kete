import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { calcMetrics } from "@/lib/calculations";
import type { Campaign, MediaType } from "@/lib/types";

const MEDIA_LABELS: Record<MediaType, string> = {
  META: "Meta広告",
  TIKTOK: "TikTok広告",
  HOTPEPPER: "ホットペッパー",
};

export async function POST(req: NextRequest) {
  const { targetCpa, from, to } = await req.json();

  if (!targetCpa || isNaN(Number(targetCpa))) {
    return new Response(JSON.stringify({ error: "目標CPAを入力してください" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY が設定されていません" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch campaign data from DB
  const raw = await prisma.campaign.findMany({
    where: {
      ...(from || to
        ? { period: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    include: { store: true },
  });

  type CampaignWithStore = Campaign & {
    store: { id: string; name: string; prefecture: string };
  };
  const campaigns = raw as unknown as CampaignWithStore[];

  if (campaigns.length === 0) {
    return new Response(JSON.stringify({ error: "分析するデータがありません。先にキャンペーンデータを登録してください。" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Aggregate by store × media
  type Key = string;
  const groupMap = new Map<Key, CampaignWithStore[]>();
  for (const c of campaigns) {
    const key = `${c.storeId}::${c.media}`;
    const arr = groupMap.get(key) ?? [];
    arr.push(c);
    groupMap.set(key, arr);
  }

  const groups = Array.from(groupMap.entries()).map(([key, cs]) => {
    const [, media] = key.split("::");
    const metrics = calcMetrics(cs);
    return {
      storeName: cs[0].store.name,
      prefecture: cs[0].store.prefecture,
      media: MEDIA_LABELS[media as MediaType] ?? media,
      spend: metrics.spend,
      leads: metrics.leads,
      contracts: Math.round(metrics.contracts * 10) / 10,
      revenue: metrics.revenue,
      cpa: metrics.cpa,
      roi: metrics.roi,
      cpl: metrics.cpl,
    };
  });

  const targetCpaNum = Number(targetCpa);
  const underperforming = groups.filter((g) => g.cpa !== null && g.cpa > targetCpaNum);
  const performing = groups.filter((g) => g.cpa !== null && g.cpa <= targetCpaNum);
  const noData = groups.filter((g) => g.cpa === null);

  // Build data summary for Claude
  const fmt = (n: number) =>
    new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", minimumFractionDigits: 0 }).format(n);

  const fmtRow = (g: (typeof groups)[0]) =>
    `- ${g.storeName}（${g.prefecture}）/ ${g.media}: 広告費${fmt(g.spend)}, リード${g.leads}件, 契約${g.contracts}件, CPA${g.cpa ? fmt(g.cpa) : "算出不可"}, ROI${g.roi != null ? g.roi.toFixed(1) + "%" : "-"}`;

  const systemPrompt = `あなたはサロン・整体院チェーンの広告マーケティングアナリストです。
店舗の広告パフォーマンスデータを分析し、日本語で具体的な改善提案を行います。
提案は実行可能で優先度の高いものから順に記述し、各提案には根拠を明示してください。
数字を引用しながら、担当者がすぐに行動できるレベルの具体性を持たせてください。`;

  const userPrompt = `## 広告パフォーマンス分析依頼

**目標CPA**: ${fmt(targetCpaNum)}

### 目標未達の店舗・媒体（${underperforming.length}件）
${underperforming.length > 0 ? underperforming.map(fmtRow).join("\n") : "なし"}

### 目標達成中の店舗・媒体（${performing.length}件）
${performing.length > 0 ? performing.map(fmtRow).join("\n") : "なし"}

### データ不足（契約率・客単価未入力）（${noData.length}件）
${noData.length > 0 ? noData.map((g) => `- ${g.storeName}（${g.prefecture}）/ ${g.media}: 広告費${fmt(g.spend)}, リード${g.leads}件`).join("\n") : "なし"}

---

上記データを基に以下を分析してください：

1. **総評** — 全体の状況を2〜3文で要約
2. **目標未達店舗・媒体の改善提案** — 各店舗/媒体について具体的な改善アクションを提示（入札戦略・クリエイティブ・ターゲティング・LPなど）
3. **データ不足への対処** — 計測体制の改善提案
4. **今月の優先アクション** — 最も効果が見込める3つのアクションをリストアップ`;

  // Stream response from Claude
  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = await client.messages.stream({
          model: "claude-opus-4-7",
          max_tokens: 4096,
          thinking: { type: "adaptive" },
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI分析に失敗しました";
        controller.enqueue(encoder.encode(`\n\nエラー: ${msg}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
