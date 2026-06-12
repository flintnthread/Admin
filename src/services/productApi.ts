import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse, ProductSummary } from "@/lib/api/types";

export type ProductListRow = ProductSummary & {
  categoryName?: string;
  subcategoryName?: string;
  color?: string;
  size?: string;
  price?: number;
  stock?: number;
  displayStatus?: string;
  imageUrl?: string;
  updatedLabel?: string;
};

export async function fetchProducts(params?: {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<ProductListRow>> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 100));
  return adminApiRequest(`/api/admin/products?${q}`);
}

export async function fetchProductCatalog(): Promise<{ categories: { id: number; name: string; subcategories: { id: number; name: string }[] }[] }> {
  return adminApiRequest("/api/admin/products/catalog");
}

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
