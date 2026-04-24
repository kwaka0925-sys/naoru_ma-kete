const META_API_VERSION = "v21.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaInsightAction {
  action_type: string;
  value: string;
}

export interface MetaInsightRow {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  actions?: MetaInsightAction[];
  action_values?: MetaInsightAction[];
  purchase_roas?: MetaInsightAction[];
  region?: string;
  country?: string;
  date_start: string;
  date_stop: string;
}

export interface MetaApiError {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export function normalizeAccountId(id: string): string {
  return id.startsWith("act_") ? id : `act_${id}`;
}

export async function fetchMetaInsights(params: {
  accountId: string;
  accessToken: string;
  since?: string;
  until?: string;
  breakdowns?: string[];
  level?: "account" | "campaign" | "adset" | "ad";
  timeIncrement?: "monthly" | "all_days" | number;
}): Promise<MetaInsightRow[]> {
  const {
    accountId,
    accessToken,
    since,
    until,
    breakdowns,
    level = "campaign",
    timeIncrement = "monthly",
  } = params;
  const url = new URL(`${META_GRAPH_URL}/${normalizeAccountId(accountId)}/insights`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set(
    "fields",
    "campaign_id,campaign_name,spend,impressions,clicks,reach,actions,action_values,purchase_roas"
  );
  url.searchParams.set("level", level);
  url.searchParams.set("time_increment", String(timeIncrement));
  if (breakdowns && breakdowns.length > 0) {
    url.searchParams.set("breakdowns", breakdowns.join(","));
  }
  if (since && until) {
    url.searchParams.set("time_range", JSON.stringify({ since, until }));
  } else {
    url.searchParams.set("date_preset", "last_90d");
  }

  const all: MetaInsightRow[] = [];
  let nextUrl: string | null = url.toString();
  let safety = 10;
  while (nextUrl && safety-- > 0) {
    const res = await fetch(nextUrl);
    const json = (await res.json()) as { data?: MetaInsightRow[]; paging?: { next?: string }; error?: MetaApiError };
    if (!res.ok || json.error) {
      const err = json.error;
      throw new Error(
        err ? `Meta API error (${err.code ?? res.status}): ${err.message}` : `Meta API returned ${res.status}`
      );
    }
    if (json.data) all.push(...json.data);
    nextUrl = json.paging?.next ?? null;
  }
  return all;
}

export async function fetchAccountInfo(params: {
  accountId: string;
  accessToken: string;
}): Promise<{ id: string; name: string; currency: string; account_status: number }> {
  const { accountId, accessToken } = params;
  const url = new URL(`${META_GRAPH_URL}/${normalizeAccountId(accountId)}`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", "id,name,currency,account_status");
  const res = await fetch(url.toString());
  const json = (await res.json()) as {
    id?: string;
    name?: string;
    currency?: string;
    account_status?: number;
    error?: MetaApiError;
  };
  if (!res.ok || json.error) {
    throw new Error(
      json.error
        ? `Meta API error (${json.error.code ?? res.status}): ${json.error.message}`
        : `Meta API returned ${res.status}`
    );
  }
  return {
    id: json.id ?? "",
    name: json.name ?? "",
    currency: json.currency ?? "",
    account_status: json.account_status ?? 0,
  };
}

export function extractStoreName(campaignName: string | undefined): string | null {
  if (!campaignName) return null;
  const match = campaignName.match(/^[\s]*[【［\[]\s*([^】］\]]+?)\s*[】］\]]/);
  return match ? match[1].trim() : null;
}

export function findActionValue(
  actions: MetaInsightAction[] | undefined,
  types: string[]
): number | null {
  if (!actions || actions.length === 0) return null;
  for (const type of types) {
    const found = actions.find((a) => a.action_type === type);
    if (found) {
      const n = Number(found.value);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

export function toPeriod(dateStart: string): string {
  return dateStart.slice(0, 7);
}

export const HIGH_INTENT_CONVERSION_TYPES: string[] = [
  // Lead系（整体/サロン/店舗ビジネスの本命）
  "lead",
  "omni_lead",
  "offsite_conversion.fb_pixel_lead",
  "onsite_web_lead",
  "onsite_web_app_lead",
  "leadgen.other",
  // 登録/申込
  "complete_registration",
  "offsite_conversion.fb_pixel_complete_registration",
  "submit_application",
  // お問い合わせ/予約
  "contact",
  "schedule",
  "offsite_conversion.fb_pixel_schedule",
  // 購入
  "omni_purchase",
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
];

export const LOW_INTENT_CONVERSION_TYPES: string[] = [
  "omni_view_content",
  "view_content",
  "landing_page_view",
];

export const CONVERSION_TYPE_PRIORITY: string[] = [
  ...HIGH_INTENT_CONVERSION_TYPES,
  ...LOW_INTENT_CONVERSION_TYPES,
];

export function detectDominantConversionType(
  rows: Array<{ actions?: MetaInsightAction[] }>
): string | null {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.actions) continue;
    for (const a of row.actions) {
      if (!CONVERSION_TYPE_PRIORITY.includes(a.action_type)) continue;
      const n = Number(a.value);
      if (Number.isNaN(n) || n <= 0) continue;
      totals.set(a.action_type, (totals.get(a.action_type) ?? 0) + n);
    }
  }
  if (totals.size === 0) return null;

  const pickFrom = (candidates: string[]): string | null => {
    let best: string | null = null;
    let bestCount = -1;
    let bestPriority = Infinity;
    for (const type of candidates) {
      const count = totals.get(type);
      if (count == null || count <= 0) continue;
      const priority = candidates.indexOf(type);
      if (count > bestCount || (count === bestCount && priority < bestPriority)) {
        best = type;
        bestCount = count;
        bestPriority = priority;
      }
    }
    return best;
  };

  return pickFrom(HIGH_INTENT_CONVERSION_TYPES) ?? pickFrom(LOW_INTENT_CONVERSION_TYPES);
}

export const CONVERSION_TYPE_LABELS: Record<string, string> = {
  lead: "リード",
  omni_lead: "リード（全体）",
  "offsite_conversion.fb_pixel_lead": "リード（Pixel）",
  onsite_web_lead: "リード（Meta内）",
  onsite_web_app_lead: "リード（Metaアプリ）",
  "leadgen.other": "リード（その他）",
  complete_registration: "登録完了",
  "offsite_conversion.fb_pixel_complete_registration": "登録完了（Pixel）",
  submit_application: "申込",
  contact: "問い合わせ",
  schedule: "予約",
  "offsite_conversion.fb_pixel_schedule": "予約（Pixel）",
  omni_purchase: "購入",
  purchase: "購入",
  "offsite_conversion.fb_pixel_purchase": "購入（Pixel）",
  omni_view_content: "コンテンツ閲覧",
  view_content: "コンテンツ閲覧",
  landing_page_view: "LP閲覧",
};

export function labelForConversionType(type: string | null | undefined): string {
  if (!type) return "コンバージョン";
  return CONVERSION_TYPE_LABELS[type] ?? type;
}
