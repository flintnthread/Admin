import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse } from "@/lib/api/types";

export type CustomerSupportTicketSummary = {
  id: number;
  ticketNumber?: string;
  customerId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  subject?: string;
  type?: string;
  typeLabel?: string;
  message?: string;
  orderId?: number;
  orderNumber?: string;
  attachmentPath?: string;
  status?: string;
  statusLabel?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: CustomerSupportMessage[];
};

export type CustomerSupportMessage = {
  id: number | string;
  senderType?: string;
  senderName?: string;
  message?: string;
  createdAt?: string;
};

export type CustomerSupportStats = {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
};

export async function fetchCustomerSupportStats(): Promise<CustomerSupportStats> {
  return adminApiRequest("/api/admin/customer-support/tickets/stats");
}

export async function fetchCustomerSupportTickets(params?: {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<CustomerSupportTicketSummary>> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.type) q.set("type", params.type);
  if (params?.search) q.set("search", params.search);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 50));
  return adminApiRequest(`/api/admin/customer-support/tickets?${q}`);
}

export async function fetchCustomerSupportTicket(
  id: number
): Promise<CustomerSupportTicketSummary> {
  return adminApiRequest(`/api/admin/customer-support/tickets/${id}`);
}

export async function replyCustomerSupportTicket(
  id: number,
  message: string
): Promise<void> {
  await adminApiRequest(`/api/admin/customer-support/tickets/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply: message }),
  });
}

export async function updateCustomerSupportTicketStatus(
  id: number,
  status: string
): Promise<void> {
  await adminApiRequest(`/api/admin/customer-support/tickets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
