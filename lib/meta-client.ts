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
}): Promise<MetaInsightRow[]> {
  const { accountId, accessToken, since, until } = params;
  const url = new URL(`${META_GRAPH_URL}/${normalizeAccountId(accountId)}/insights`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set(
    "fields",
    "campaign_id,campaign_name,spend,impressions,clicks,reach,actions,action_values,purchase_roas"
  );
  url.searchParams.set("level", "campaign");
  url.searchParams.set("time_increment", "monthly");
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
