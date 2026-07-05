import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse, ProductSummary } from "@/lib/api/types";

function normalizePageResponse<T>(raw: unknown): PageResponse<T> {
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

export type ProductListRow = ProductSummary & {
  categoryName?: string;
  mainCategoryName?: string;
  subcategoryName?: string;
  sellerName?: string;
  sellerEmail?: string;
  categoryId?: number;
  subcategoryId?: number;
  color?: string;
  size?: string;
  price?: number;
  stock?: number;
  displayStatus?: string;
  imageUrl?: string;
  updatedLabel?: string;
};

export type SellerRow = {
  id: number;
  storeName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  businessName?: string;
  email?: string;
  status?: string;
};

export async function fetchProducts(params?: {
  status?: string;
  search?: string;
  sellerId?: number;
  /** When true, only products added by admin (seller_id IS NULL in DB). */
  adminOnly?: boolean;
  mainCategoryId?: number;
  categoryId?: number;
  subcategoryId?: number;
  page?: number;
  size?: number;
}): Promise<PageResponse<ProductListRow>> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  if (params?.sellerId != null) q.set("sellerId", String(params.sellerId));
  if (params?.adminOnly) q.set("adminOnly", "true");
  if (params?.mainCategoryId != null) q.set("mainCategoryId", String(params.mainCategoryId));
  if (params?.categoryId != null) q.set("categoryId", String(params.categoryId));
  if (params?.subcategoryId != null) q.set("subcategoryId", String(params.subcategoryId));
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 100));
  const raw = await adminApiRequest<unknown>(`/api/admin/products?${q}`);
  return normalizePageResponse<ProductListRow>(raw);
}

/** Products added through the admin catalog (not seller listings). */
export async function fetchAdminCatalogProducts(params?: {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<ProductListRow>> {
  return fetchProducts({ ...params, adminOnly: true });
}

export async function fetchProductCatalog(): Promise<{ categories: { id: number; name: string; subcategories: { id: number; name: string }[] }[] }> {
  return adminApiRequest("/api/admin/products/catalog");
}

export async function fetchPendingProducts(page = 0, size = 20): Promise<PageResponse<ProductSummary>> {
  const raw = await adminApiRequest<unknown>(`/api/admin/products/pending?page=${page}&size=${size}`);
  return normalizePageResponse<ProductSummary>(raw);
}

export async function fetchProductStats(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/products/stats");
}

export async function fetchProductDetail(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/products/${id}`);
}

export async function fetchSellers(search?: string): Promise<PageResponse<SellerRow>> {
  const q = new URLSearchParams();
  if (search) q.set("search", search);
  q.set("page", "0");
  q.set("size", "500");
  const raw = await adminApiRequest<unknown>(`/api/admin/sellers/approved?${q}`);
  return normalizePageResponse<SellerRow>(raw);
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
