import { adminApiRequest } from "@/lib/api/client";

export type LifecycleRequestRow = {
  sellerId: number;
  sellerCode?: string;
  businessName?: string;
  email?: string;
  status?: string;
  requestType?: string;
  duration?: string;
  requestedAt?: string;
  startedAt?: string;
  expiresAt?: string;
  requestStatus?: string;
};

export async function fetchSellerLifecycleRequests(type: "deactivation" | "activation") {
  return adminApiRequest<{ type: string; count: number; items: LifecycleRequestRow[] }>(
    `/api/admin/sellers/lifecycle-requests?type=${type}`
  );
}

export async function fetchSellerLifecycleRequestDetails(sellerId: number) {
  return adminApiRequest<Record<string, unknown>>(`/api/admin/sellers/${sellerId}/lifecycle-request`);
}

export async function approveSellerDeactivation(sellerId: number) {
  return adminApiRequest(`/api/admin/sellers/${sellerId}/deactivation/approve`, { method: "POST" });
}

export async function rejectSellerDeactivation(sellerId: number, note?: string) {
  return adminApiRequest(`/api/admin/sellers/${sellerId}/deactivation/reject`, {
    method: "POST",
    body: JSON.stringify({ note: note || "Rejected" }),
  });
}

export async function approveSellerActivation(sellerId: number) {
  return adminApiRequest(`/api/admin/sellers/${sellerId}/activation/approve`, { method: "POST" });
}

export async function rejectSellerActivation(sellerId: number, note?: string) {
  return adminApiRequest(`/api/admin/sellers/${sellerId}/activation/reject`, {
    method: "POST",
    body: JSON.stringify({ note: note || "Rejected" }),
  });
}
