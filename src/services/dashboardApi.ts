import { adminApiRequest } from "@/lib/api/client";

export type DashboardStats = Record<string, number | string | null>;

export type RevenueChartData = {
  labels: string[];
  revenue: number[];
  orders: number[];
  maxVal: number;
};

export type DashboardTopProduct = {
  id: string;
  productId?: number;
  name: string;
  sales: number;
  revenue: number;
  stock: string;
  stockCount: number;
  image?: string;
};

export type DashboardTopSeller = {
  id: number;
  name: string;
  business: string;
  orders: number;
  revenue: number;
  rating: string;
  status: string;
};

export type DashboardInventoryAlert = {
  id: number;
  name: string;
  type: string;
  qty: number;
  severity: string;
};

export type DashboardActivity = {
  id: number | string;
  type: string;
  message: string;
  read: boolean;
  time: string;
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return adminApiRequest<DashboardStats>("/api/admin/dashboard/stats");
}

export async function fetchDashboardRevenueChart(
  timeframe: "daily" | "weekly" | "monthly" | "yearly" = "monthly"
): Promise<RevenueChartData> {
  return adminApiRequest<RevenueChartData>(`/api/admin/dashboard/revenue-chart?timeframe=${timeframe}`);
}

export async function fetchDashboardTopProducts(limit = 10): Promise<DashboardTopProduct[]> {
  return adminApiRequest<DashboardTopProduct[]>(`/api/admin/dashboard/top-products?limit=${limit}`);
}

export async function fetchDashboardTopSellers(limit = 10): Promise<DashboardTopSeller[]> {
  return adminApiRequest<DashboardTopSeller[]>(`/api/admin/dashboard/top-sellers?limit=${limit}`);
}

export async function fetchDashboardInventoryAlerts(limit = 10): Promise<DashboardInventoryAlert[]> {
  return adminApiRequest<DashboardInventoryAlert[]>(`/api/admin/dashboard/inventory-alerts?limit=${limit}`);
}

export async function fetchDashboardActivity(limit = 10): Promise<DashboardActivity[]> {
  return adminApiRequest<DashboardActivity[]>(`/api/admin/dashboard/activity?limit=${limit}`);
}
