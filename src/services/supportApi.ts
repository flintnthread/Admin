import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse, SupportTicketSummary } from "@/lib/api/types";

export async function fetchSupportTicketStats(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/support/tickets/stats");
}

export async function fetchSupportTickets(params?: {
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<SupportTicketSummary>> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.priority) q.set("priority", params.priority);
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
