import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse } from "@/lib/api/types";

export type CategoryRequestRow = {
  id: number;
  sellerId?: number;
  sellerName?: string;
  categoryName?: string;
  description?: string;
  reason?: string;
  status?: string;
  adminNotes?: string;
  createdAt?: string;
};

export async function fetchCategoryRequestStats(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/category-requests/stats");
}

export async function fetchCategoryRequests(
  status?: string,
  page = 0,
  size = 20
): Promise<PageResponse<CategoryRequestRow>> {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  q.set("page", String(page));
  q.set("size", String(size));
  return adminApiRequest(`/api/admin/category-requests?${q}`);
}

export async function approveCategoryRequest(id: number, note?: string): Promise<void> {
  await adminApiRequest(`/api/admin/category-requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function rejectCategoryRequest(id: number, note?: string): Promise<void> {
  await adminApiRequest(`/api/admin/category-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ note, reason: note }),
  });
}
