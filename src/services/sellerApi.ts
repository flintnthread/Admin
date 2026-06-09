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

export async function fetchSellerAnalyticsSummary(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/sellers/analytics/summary");
}

export async function fetchSellerAnalyticsChart(): Promise<{ month: string; count: number }[]> {
  return adminApiRequest("/api/admin/sellers/analytics/chart");
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
  status: string;
  profileUpdatedAt?: string;
};

export async function fetchPendingProfileSellers(): Promise<PendingProfileSeller[]> {
  return adminApiRequest("/api/admin/seller-profiles/pending");
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
