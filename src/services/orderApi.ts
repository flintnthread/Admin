import { adminApiRequest } from "@/lib/api/client";
import type { OrderSummary, PageResponse } from "@/lib/api/types";

export async function fetchOrders(params?: {
  status?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<OrderSummary>> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  if (params?.search) q.set("search", params.search);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 20));
  return adminApiRequest(`/api/admin/orders?${q}`);
}

export async function fetchOrderDetail(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/orders/${id}`);
}

export async function updateOrderGstStatus(id: number, gstStatus: string): Promise<void> {
  await adminApiRequest(`/api/admin/orders/${id}/gst-status`, {
    method: "PATCH",
    body: JSON.stringify({ gstStatus }),
  });
}
