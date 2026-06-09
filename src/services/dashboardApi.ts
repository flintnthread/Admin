import { adminApiRequest } from "@/lib/api/client";

export type DashboardStats = Record<string, number | string | null>;

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return adminApiRequest<DashboardStats>("/api/admin/dashboard/stats");
}
