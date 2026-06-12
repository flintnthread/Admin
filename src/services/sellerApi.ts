import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse, SellerSummary } from "@/lib/api/types";

export async function fetchSellers(params?: {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<SellerSummary>> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 20));
  return adminApiRequest(`/api/admin/sellers?${q}`);
}

export type SellerGraphFilters = {
  filterType?: string;
  year?: number;
  fromDate?: string;
  toDate?: string;
  sellerId?: number;
};

export type SellerGraphChartData = {
  labels: string[];
  registered: number[];
  profileCompleted: number[];
  approved: number[];
  productsAdded: number[];
  shiprocketUploaded: number[];
  maxY: number;
};

export type SellerGraphInsight = {
  iconName: string;
  text: string;
  color: string;
  bg: string;
};

export type SellerGraphRow = SellerSummary & {
  products?: number;
  profile?: string;
  kyc?: string;
  supplement?: string;
  shiprocket?: string;
  shipDate?: string | null;
};

function buildGraphQuery(filters?: SellerGraphFilters): string {
  const q = new URLSearchParams();
  if (filters?.filterType) q.set("filterType", filters.filterType);
  if (filters?.year != null) q.set("year", String(filters.year));
  if (filters?.fromDate) q.set("fromDate", filters.fromDate);
  if (filters?.toDate) q.set("toDate", filters.toDate);
  if (filters?.sellerId != null) q.set("sellerId", String(filters.sellerId));
  const query = q.toString();
  return query ? `?${query}` : "";
}

export async function fetchSellersForGraph(params?: {
  search?: string;
  sellerId?: number;
  page?: number;
  size?: number;
}): Promise<PageResponse<SellerGraphRow>> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.sellerId != null) q.set("sellerId", String(params.sellerId));
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 20));
  return adminApiRequest(`/api/admin/sellers/graph?${q}`);
}

export async function fetchSellerAnalyticsSummary(
  filters?: SellerGraphFilters
): Promise<Record<string, number>> {
  return adminApiRequest(`/api/admin/sellers/analytics/summary${buildGraphQuery(filters)}`);
}

export async function fetchSellerAnalyticsChart(
  filters?: SellerGraphFilters
): Promise<SellerGraphChartData> {
  return adminApiRequest(`/api/admin/sellers/analytics/chart${buildGraphQuery(filters)}`);
}

export async function fetchSellerAnalyticsInsights(
  filters?: SellerGraphFilters
): Promise<SellerGraphInsight[]> {
  return adminApiRequest(`/api/admin/sellers/analytics/insights${buildGraphQuery(filters)}`);
}

export async function fetchSellerAnalyticsYears(): Promise<string[]> {
  return adminApiRequest("/api/admin/sellers/analytics/years");
}

export function normalizeSellerGraphSummary(
  raw: Record<string, unknown> | null | undefined
): Record<string, number> {
  const s = raw ?? {};
  const num = (key: string, fallback = 0) => {
    const v = s[key];
    return typeof v === "number" ? v : Number(v ?? fallback) || fallback;
  };
  return {
    registered: num("registered", num("total")),
    profileCompleted: num("profileCompleted"),
    approved: num("approved", num("active")),
    productsAdded: num("productsAdded"),
    shiprocketUploaded: num("shiprocketUploaded"),
    total: num("total", num("registered")),
    active: num("active", num("approved")),
    pending: num("pending"),
    pendingBank: num("pendingBank"),
    bankVerified: num("bankVerified"),
    shiprocketPending: num("shiprocketPending"),
    emailPending: num("emailPending"),
  };
}

export function normalizeSellerGraphChart(raw: unknown): SellerGraphChartData {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const asNums = (key: string) =>
      Array.isArray(o[key]) ? (o[key] as unknown[]).map((v) => Number(v) || 0) : [];
    return {
      labels: Array.isArray(o.labels) ? o.labels.map(String) : [],
      registered: asNums("registered"),
      profileCompleted: asNums("profileCompleted"),
      approved: asNums("approved"),
      productsAdded: asNums("productsAdded"),
      shiprocketUploaded: asNums("shiprocketUploaded"),
      maxY: Number(o.maxY) || 100,
    };
  }
  if (Array.isArray(raw)) {
    return {
      labels: raw.map((p) => String((p as { month?: string }).month ?? "")),
      registered: raw.map((p) => Number((p as { count?: number }).count) || 0),
      profileCompleted: [],
      approved: [],
      productsAdded: [],
      shiprocketUploaded: [],
      maxY: Math.max(100, ...raw.map((p) => Number((p as { count?: number }).count) || 0)),
    };
  }
  return {
    labels: [],
    registered: [],
    profileCompleted: [],
    approved: [],
    productsAdded: [],
    shiprocketUploaded: [],
    maxY: 100,
  };
}

export async function blockSeller(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/sellers/${id}/block`, { method: "POST" });
}

export async function unblockSeller(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/sellers/${id}/unblock`, { method: "POST" });
}

export async function fetchPendingBankSellers(page = 0, size = 20): Promise<PageResponse<SellerSummary>> {
  return adminApiRequest(`/api/admin/sellers/bank/pending?page=${page}&size=${size}`);
}

export async function fetchBankStats(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/sellers/bank/stats");
}

export async function fetchSellerBankDetails(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/sellers/${id}/bank`);
}

export async function approveSellerBank(id: number, note?: string): Promise<void> {
  await adminApiRequest(`/api/admin/sellers/${id}/bank/approve`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function rejectSellerBank(id: number, note?: string): Promise<void> {
  await adminApiRequest(`/api/admin/sellers/${id}/bank/reject`, {
    method: "POST",
    body: JSON.stringify({ note, reason: note }),
  });
}

export type PendingProfileSeller = {
  sellerId: number;
  fullName: string;
  email: string;
  mobile?: string;
  businessName?: string;
  status: string;
  profileUpdatedAt?: string;
};

export type ShiprocketSellerRow = {
  id: number;
  businessName?: string;
  contactPerson?: string;
  phone?: string;
  city?: string;
  state?: string;
  email?: string;
  warehouseAddress?: string;
  status?: string;
  uploadedAt?: string | null;
};

export type SellerDetail = SellerSummary & Record<string, unknown>;

export async function fetchSellerDetail(id: number): Promise<SellerDetail> {
  return adminApiRequest(`/api/admin/sellers/${id}`);
}

export async function fetchShiprocketSellers(
  status: "pending" | "uploaded" = "pending",
  page = 0,
  size = 100
): Promise<PageResponse<ShiprocketSellerRow>> {
  return adminApiRequest(`/api/admin/sellers/shiprocket?status=${status}&page=${page}&size=${size}`);
}

export async function fetchBankVerifications(
  status: "pending" | "verified" = "pending",
  page = 0,
  size = 200
): Promise<PageResponse<SellerSummary>> {
  return adminApiRequest(`/api/admin/sellers/bank/verifications?status=${status}&page=${page}&size=${size}`);
}

export async function fetchPendingProfileSellers(): Promise<PendingProfileSeller[]> {
  return adminApiRequest("/api/admin/seller-profiles/pending");
}

export async function fetchPendingProfileDetail(sellerId: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/seller-profiles/${sellerId}`);
}

export async function approveSellerProfile(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/seller-profiles/${id}/approve`, { method: "POST" });
}

export async function rejectSellerProfile(id: number, reason: string): Promise<void> {
  await adminApiRequest(`/api/admin/seller-profiles/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
