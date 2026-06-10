import { adminApiRequest } from "@/lib/api/client";

export type CommissionRates = { b2c: string; b2b: string };

export async function fetchCommissionRates(): Promise<CommissionRates> {
  return adminApiRequest("/api/admin/settings/commission");
}

export async function updateCommissionRates(b2c: string, b2b: string): Promise<CommissionRates> {
  return adminApiRequest("/api/admin/settings/commission", {
    method: "PUT",
    body: JSON.stringify({ b2c, b2b }),
  });
}
