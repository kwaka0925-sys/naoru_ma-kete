import Papa from "papaparse";

export interface ParsedCsvRow {
  [key: string]: string;
}

export interface HotpepperMappedRow {
  storeName: string;
  period: string; // YYYY-MM
  spend: number;
  impressions?: number;
  clicks?: number;
  leads?: number; // 予約数
  views?: number; // ページビュー
}

export interface CsvParseResult {
  headers: string[];
  rows: ParsedCsvRow[];
  error?: string;
}

export function parseCsvText(text: string): CsvParseResult {
  const result = Papa.parse<ParsedCsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return { headers: [], rows: [], error: result.errors[0].message };
  }

  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}

// ホットペッパーサロンボードの一般的なCSVカラム名マッピング候補
export const HPB_COLUMN_HINTS: Record<keyof HotpepperMappedRow, string[]> = {
  storeName: ["サロン名", "店舗名", "salon_name", "store_name", "name"],
  period: ["期間", "年月", "対象月", "month", "period", "date"],
  spend: ["掲載料", "広告費", "費用", "コスト", "spend", "cost"],
  impressions: ["インプレッション", "表示回数", "impressions", "imp"],
  clicks: ["クリック数", "クリック", "clicks", "click"],
  leads: ["予約数", "問い合わせ数", "コンバージョン", "bookings", "leads", "cv"],
  views: ["PV", "ページビュー", "閲覧数", "views", "pageviews"],
};

export function autoDetectMapping(headers: string[]): Partial<Record<keyof HotpepperMappedRow, string>> {
  const mapping: Partial<Record<keyof HotpepperMappedRow, string>> = {};

  for (const [field, hints] of Object.entries(HPB_COLUMN_HINTS)) {
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      if (hints.some((h) => normalized.includes(h.toLowerCase()))) {
        mapping[field as keyof HotpepperMappedRow] = header;
        break;
      }
    }
  }
  return mapping;
}

export function applyMapping(
  rows: ParsedCsvRow[],
  mapping: Partial<Record<keyof HotpepperMappedRow, string>>
): HotpepperMappedRow[] {
  return rows
    .map((row) => {
      const storeName = mapping.storeName ? row[mapping.storeName] ?? "" : "";
      const rawPeriod = mapping.period ? row[mapping.period] ?? "" : "";
      const period = normalizePeriod(rawPeriod);

      if (!storeName || !period) return null;

      return {
        storeName,
        period,
        spend: parseNum(mapping.spend ? row[mapping.spend] : undefined),
        impressions: parseNum(mapping.impressions ? row[mapping.impressions] : undefined) || undefined,
        clicks: parseNum(mapping.clicks ? row[mapping.clicks] : undefined) || undefined,
        leads: parseNum(mapping.leads ? row[mapping.leads] : undefined) || undefined,
        views: parseNum(mapping.views ? row[mapping.views] : undefined) || undefined,
      } as HotpepperMappedRow;
    })
    .filter((r): r is HotpepperMappedRow => r !== null);
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  return Number(val.replace(/[,¥￥\s]/g, "")) || 0;
}

function normalizePeriod(raw: string): string {
  // Supports: "2024/01", "2024-01", "2024年1月", "202401"
  const clean = raw.trim();
  const m1 = clean.match(/(\d{4})[\/\-](\d{1,2})/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, "0")}`;
  const m2 = clean.match(/(\d{4})年(\d{1,2})月/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, "0")}`;
  const m3 = clean.match(/^(\d{4})(\d{2})$/);
  if (m3) return `${m3[1]}-${m3[2]}`;
  return "";
}
