import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse } from "@/lib/api/types";

function normalizePage<T>(raw: unknown): PageResponse<T> {
  const page = (raw ?? {}) as Record<string, unknown>;
  const items = (page.items ?? page.content ?? []) as T[];
  return {
    items: Array.isArray(items) ? items : [],
    totalElements: Number(page.totalElements ?? page.total ?? items.length ?? 0),
    totalPages: Number(page.totalPages ?? 0),
    page: Number(page.page ?? 0),
    size: Number(page.size ?? items.length ?? 0),
  };
}

export type AdsApiRow = Record<string, unknown>;

// ── Catalog CRUD helpers ────────────────────────────────────────────────────

async function listCatalog(path: string, params?: { search?: string; status?: string }): Promise<AdsApiRow[]> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return adminApiRequest(`${path}${qs ? `?${qs}` : ""}`);
}

async function createCatalog(path: string, body: AdsApiRow): Promise<AdsApiRow> {
  return adminApiRequest(path, { method: "POST", body: JSON.stringify(body) });
}

async function updateCatalog(path: string, id: number, body: AdsApiRow): Promise<AdsApiRow> {
  return adminApiRequest(`${path}/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

async function deleteCatalog(path: string, id: number): Promise<void> {
  await adminApiRequest(`${path}/${id}`, { method: "DELETE" });
}

// Ads types
export const fetchAdsTypes = (params?: { search?: string; status?: string }) =>
  listCatalog("/api/admin/ads/types", params);
export const createAdsType = (body: AdsApiRow) => createCatalog("/api/admin/ads/types", body);
export const updateAdsType = (id: number, body: AdsApiRow) => updateCatalog("/api/admin/ads/types", id, body);
export const deleteAdsType = (id: number) => deleteCatalog("/api/admin/ads/types", id);

// Placements
export const fetchAdPlacements = (params?: { search?: string; status?: string }) =>
  listCatalog("/api/admin/ads/placements", params);
export const createAdPlacement = (body: AdsApiRow) => createCatalog("/api/admin/ads/placements", body);
export const updateAdPlacement = (id: number, body: AdsApiRow) => updateCatalog("/api/admin/ads/placements", id, body);
export const deleteAdPlacement = (id: number) => deleteCatalog("/api/admin/ads/placements", id);

// Performance ads
export const fetchPerformanceAds = (params?: { search?: string; status?: string }) =>
  listCatalog("/api/admin/ads/performance", params);
export const createPerformanceAd = (body: AdsApiRow) => createCatalog("/api/admin/ads/performance", body);
export const updatePerformanceAd = (id: number, body: AdsApiRow) =>
  updateCatalog("/api/admin/ads/performance", id, body);
export const deletePerformanceAd = (id: number) => deleteCatalog("/api/admin/ads/performance", id);

// Campaign packages
export const fetchCampaignPackages = (params?: { search?: string; status?: string }) =>
  listCatalog("/api/admin/ads/campaigns", params);
export const createCampaignPackage = (body: AdsApiRow) => createCatalog("/api/admin/ads/campaigns", body);
export const updateCampaignPackage = (id: number, body: AdsApiRow) =>
  updateCatalog("/api/admin/ads/campaigns", id, body);
export const deleteCampaignPackage = (id: number) => deleteCatalog("/api/admin/ads/campaigns", id);

// Ads admin users
export const fetchAdsAdminUsers = (params?: { search?: string; status?: string }) =>
  listCatalog("/api/admin/ads/admin-users", params);
export const createAdsAdminUser = (body: AdsApiRow) => createCatalog("/api/admin/ads/admin-users", body);
export const updateAdsAdminUser = (id: number, body: AdsApiRow) =>
  updateCatalog("/api/admin/ads/admin-users", id, body);
export const deleteAdsAdminUser = (id: number) => deleteCatalog("/api/admin/ads/admin-users", id);

// Ads customers
export async function fetchAdsCustomers(params?: {
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<AdsApiRow>> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 50));
  const raw = await adminApiRequest<unknown>(`/api/admin/ads/customers?${q}`);
  return normalizePage(raw);
}

export async function fetchAdsCustomer(id: number): Promise<AdsApiRow> {
  return adminApiRequest(`/api/admin/ads/customers/${id}`);
}

export async function deleteAdsCustomer(id: number): Promise<AdsApiRow> {
  return adminApiRequest(`/api/admin/ads/customers/${id}`, { method: "DELETE" });
}

// Orders
export async function fetchAdsOrders(params?: {
  search?: string;
  status?: string;
  billingType?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<AdsApiRow>> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.status) q.set("status", params.status);
  if (params?.billingType) q.set("billingType", params.billingType);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 50));
  const raw = await adminApiRequest<unknown>(`/api/admin/ads/orders?${q}`);
  return normalizePage(raw);
}

export async function fetchAdsOrder(id: number): Promise<AdsApiRow> {
  return adminApiRequest(`/api/admin/ads/orders/${id}`);
}

export async function fetchAdsOrderByCode(orderId: string): Promise<AdsApiRow | null> {
  const page = await fetchAdsOrders({ search: orderId, page: 0, size: 20 });
  const match = page.items.find((row) => String(row.orderId ?? "") === orderId);
  if (match?.id != null) {
    return fetchAdsOrder(Number(match.id));
  }
  return match ?? null;
}

export async function fetchAdsOrderStats(): Promise<AdsApiRow> {
  return adminApiRequest("/api/admin/ads/orders/stats");
}

// Payments
export async function fetchAdsPayments(params?: {
  search?: string;
  status?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<AdsApiRow>> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.status) q.set("status", params.status);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 50));
  const raw = await adminApiRequest<unknown>(`/api/admin/ads/payments?${q}`);
  return normalizePage(raw);
}

export async function fetchAdsPayment(id: number): Promise<AdsApiRow> {
  return adminApiRequest(`/api/admin/ads/payments/${id}`);
}

export async function fetchAdsPaymentStats(): Promise<AdsApiRow> {
  return adminApiRequest("/api/admin/ads/payments/stats");
}

// Notifications
export async function fetchAdsNotifications(params?: {
  search?: string;
  status?: string;
  unreadOnly?: boolean;
  page?: number;
  size?: number;
}): Promise<PageResponse<AdsApiRow>> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.status) q.set("status", params.status);
  if (params?.unreadOnly) q.set("unreadOnly", "true");
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 50));
  const raw = await adminApiRequest<unknown>(`/api/admin/ads/notifications?${q}`);
  return normalizePage(raw);
}

export async function updateAdsNotification(
  id: number,
  body: { isRead?: boolean; status?: string },
): Promise<AdsApiRow> {
  return adminApiRequest(`/api/admin/ads/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchAdsNotificationStats(): Promise<AdsApiRow> {
  return adminApiRequest("/api/admin/ads/notifications/stats");
}

// Dashboard
export async function fetchAdsDashboard(period = "monthly"): Promise<AdsApiRow> {
  return adminApiRequest(`/api/admin/ads/dashboard?period=${encodeURIComponent(period)}`);
}

/** Normalize API status (active/inactive) → UI Title Case */
export function toUiStatus(status?: unknown): "Active" | "Inactive" {
  return String(status ?? "").toLowerCase() === "inactive" ? "Inactive" : "Active";
}

export function toApiStatus(status?: string): "active" | "inactive" {
  return String(status ?? "").toLowerCase() === "inactive" ? "inactive" : "active";
}

export function formatAdsDate(value?: unknown): string {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
