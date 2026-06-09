import { adminApiRequest } from "@/lib/api/client";
import type { CustomerSummary, PageResponse } from "@/lib/api/types";

export async function fetchCustomers(search?: string, page = 0, size = 20): Promise<PageResponse<CustomerSummary>> {
  const q = new URLSearchParams();
  if (search) q.set("search", search);
  q.set("page", String(page));
  q.set("size", String(size));
  return adminApiRequest(`/api/admin/customers?${q}`);
}

export async function fetchCustomerStats(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/customers/stats");
}

export async function fetchCustomerDetail(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/customers/${id}`);
}
