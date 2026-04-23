import type { Campaign, CampaignMetrics } from "./types";

export function calcMetrics(campaigns: Campaign[]): CampaignMetrics {
  const spend = campaigns.reduce((s, c) => s + c.spend, 0);
  const impressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const clicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const leads = campaigns.reduce((s, c) => s + (c.leads ?? 0), 0);

  // 契約数 = リード × 契約率の加重平均
  const contracts = campaigns.reduce((s, c) => {
    if (c.leads && c.contractRate != null) {
      return s + c.leads * (c.contractRate / 100);
    }
    return s;
  }, 0);

  // 売上 = 契約数 × 客単価の加重平均
  const revenue = campaigns.reduce((s, c) => {
    if (c.leads && c.contractRate != null && c.avgOrderValue) {
      const cnt = c.leads * (c.contractRate / 100);
      return s + cnt * c.avgOrderValue;
    }
    return s;
  }, 0);

  const roi = spend > 0 && revenue > 0 ? ((revenue - spend) / spend) * 100 : null;
  const cpa = contracts > 0 ? spend / contracts : null;
  const cpl = leads > 0 ? spend / leads : null;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
  const roas = spend > 0 && revenue > 0 ? revenue / spend : null;

  return { spend, impressions, clicks, leads, contracts, revenue, roi, cpa, cpl, ctr, roas };
}

export function formatJPY(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(Math.round(value));
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value == null) return "-";
  return `${value.toFixed(digits)}%`;
}
