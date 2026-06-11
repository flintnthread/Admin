import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse, SupportTicketSummary } from "@/lib/api/types";

export async function fetchSupportTickets(params?: {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<SupportTicketSummary>> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 20));
  return adminApiRequest(`/api/admin/support/tickets?${q}`);
}

export async function fetchSupportTicket(id: number): Promise<SupportTicketSummary> {
  return adminApiRequest(`/api/admin/support/tickets/${id}`);
}

export async function replySupportTicket(id: number, message: string): Promise<void> {
  await adminApiRequest(`/api/admin/support/tickets/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function updateSupportTicketStatus(id: number, status: string): Promise<void> {
  await adminApiRequest(`/api/admin/support/tickets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
