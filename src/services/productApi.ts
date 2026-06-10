import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse, ProductSummary } from "@/lib/api/types";

export async function fetchPendingProducts(page = 0, size = 20): Promise<PageResponse<ProductSummary>> {
  return adminApiRequest(`/api/admin/products/pending?page=${page}&size=${size}`);
}

export async function fetchProductStats(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/products/stats");
}

export async function fetchProductDetail(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/products/${id}`);
}

export async function approveProduct(id: number, note?: string): Promise<void> {
  await adminApiRequest(`/api/admin/products/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function rejectProduct(id: number, note?: string): Promise<void> {
  await adminApiRequest(`/api/admin/products/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ note, reason: note }),
  });
}
