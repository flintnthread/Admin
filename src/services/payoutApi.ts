import { adminApiRequest } from "@/lib/api/client";
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

export async function markPayoutPaid(id: number, transactionRef?: string, adminNote?: string): Promise<void> {
  await adminApiRequest(`/api/admin/payouts/${id}/pay`, {
    method: "POST",
    body: JSON.stringify({ transactionRef, adminNote, note: adminNote }),
  });
}
