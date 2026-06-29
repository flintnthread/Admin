import { adminApiRequest, adminApiFetch } from "@/lib/api/client";
import { resolveAdminApiBaseUrl } from "@/lib/api/config";
import type { PageResponse, PayoutSummary } from "@/lib/api/types";

export async function fetchPayoutStats(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/payouts/stats");
}

export async function fetchPayouts(status?: string, page = 0, size = 20): Promise<PageResponse<PayoutSummary>> {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  q.set("page", String(page));
  q.set("size", String(size));
  return adminApiRequest(`/api/admin/payouts?${q}`);
}

export async function fetchPayoutDetail(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/payouts/${id}`);
}

export async function markPayoutPaid(
  id: number,
  transactionRef?: string,
  adminNote?: string,
  status?: string,
): Promise<void> {
  await adminApiRequest(`/api/admin/payouts/${id}/pay`, {
    method: "POST",
    body: JSON.stringify({ transactionRef, adminNote, note: adminNote, status }),
  });
}

export async function generatePayoutInvoice(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/payouts/${id}/invoice`);
}

export function getPayoutExportUrl(status?: string, minReminderDays?: number): string {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (minReminderDays != null) q.set("minReminderDays", String(minReminderDays));
  const qs = q.toString();
  return `${resolveAdminApiBaseUrl()}/api/admin/payouts/export${qs ? `?${qs}` : ""}`;
}

export async function fetchPayoutExportCsv(status?: string, minReminderDays?: number): Promise<string> {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (minReminderDays != null) q.set("minReminderDays", String(minReminderDays));
  const qs = q.toString();
  const path = `/api/admin/payouts/export${qs ? `?${qs}` : ""}`;
  const response = await adminApiFetch(path, { headers: { Accept: "text/csv" } });
  if (!response.ok) {
    throw new Error("Export failed");
  }
  return response.text();
}
