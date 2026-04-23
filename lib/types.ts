export type MediaType = "META" | "TIKTOK" | "HOTPEPPER";

export interface Store {
  id: string;
  name: string;
  prefecture: string;
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  storeId: string;
  media: MediaType;
  period: string; // YYYY-MM
  spend: number;
  impressions?: number | null;
  clicks?: number | null;
  leads?: number | null;
  contractRate?: number | null; // 0-100 %
  avgOrderValue?: number | null; // 円
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  contracts: number;
  revenue: number;
  roi: number | null;
  cpa: number | null;
  cpl: number | null;
  ctr: number | null;
  roas: number | null;
}

export interface MediaSummary {
  media: MediaType;
  metrics: CampaignMetrics;
}

export interface PrefectureSummary {
  prefecture: string;
  storeCount: number;
  metrics: CampaignMetrics;
}

export interface StoreSummary {
  store: Store;
  metrics: CampaignMetrics;
  byMedia: MediaSummary[];
}

export interface DashboardSummary {
  totalSpend: number;
  totalLeads: number;
  totalContracts: number;
  totalRevenue: number;
  avgROI: number | null;
  avgCPA: number | null;
  byMedia: MediaSummary[];
  topStores: StoreSummary[];
}

// ホットペッパー CSVカラムマッピング
export interface HotpepperCsvRow {
  period?: string;
  storeName?: string;
  views?: number;
  bookings?: number;
  spend?: number;
  clicks?: number;
  [key: string]: string | number | undefined;
}

export const MEDIA_LABELS: Record<MediaType, string> = {
  META: "Meta広告",
  TIKTOK: "TikTok広告",
  HOTPEPPER: "ホットペッパー",
};

export const MEDIA_COLORS: Record<MediaType, string> = {
  META: "#1877F2",
  TIKTOK: "#FF0050",
  HOTPEPPER: "#E2001B",
};
