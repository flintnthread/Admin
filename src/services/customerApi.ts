import { adminApiFetch, adminApiRequest, AdminApiError } from "@/lib/api/client";
import { resolveAdminApiBaseUrl } from "@/lib/api/config";
import { getAdminToken } from "@/lib/api/session";
import type { CustomerSummary, PageResponse } from "@/lib/api/types";

export async function fetchCustomers(search?: string, page = 0, size = 20): Promise<PageResponse<CustomerSummary>> {
  const q = new URLSearchParams();
  if (search) q.set("search", search);
  q.set("page", String(page));
  q.set("size", String(size));
  return adminApiRequest(`/api/admin/customers?${q}`);
}

export async function fetchCustomerStats(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/customers/stats");
}

export async function fetchCustomerDetail(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/customers/${id}`);
}

export async function fetchCustomerAnalytics(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/customers/${id}/analytics`);
}

function parseContentDispositionFileName(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].replace(/"/g, "").trim());
  } catch {
    return match[1].replace(/"/g, "").trim() || fallback;
  }
}

function triggerBrowserFileDownload(blob: Blob, fileName: string) {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getCustomerOrderHistoryCsvUrl(id: number): string {
  return `${resolveAdminApiBaseUrl()}/api/admin/customers/${id}/orders/export`;
}

export async function fetchCustomerOrderHistoryCsv(id: number): Promise<string> {
  const response = await adminApiFetch(`/api/admin/customers/${id}/orders/export`, {
    headers: { Accept: "text/csv" },
  });
  if (!response.ok) {
    throw new AdminApiError("Failed to export customer order history.", response.status);
  }
  return response.text();
}

export async function downloadCustomerOrderHistoryCsv(id: number, preferredFileName?: string): Promise<void> {
  const response = await adminApiFetch(`/api/admin/customers/${id}/orders/export`, {
    headers: { Accept: "text/csv" },
  });
  if (!response.ok) {
    throw new AdminApiError("Failed to export customer order history.", response.status);
  }
  const csv = await response.text();
  const blob = new Blob([csv.startsWith("\uFEFF") ? csv : "\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const fileName = parseContentDispositionFileName(
    response.headers.get("content-disposition"),
    preferredFileName ?? `customer_${id}_orders.csv`
  );
  triggerBrowserFileDownload(blob, fileName);
}

export async function downloadCustomerOrderHistoryPdf(
  id: number,
  preferredFileName?: string
): Promise<void> {
  const fileName = preferredFileName ?? `customer_${id}_orders.pdf`;

  if (typeof document !== "undefined") {
    const response = await adminApiFetch(`/api/admin/customers/${id}/orders/export/pdf`, {
      headers: { Accept: "application/pdf" },
    });
    if (!response.ok) {
      throw new AdminApiError("Failed to download customer order history PDF.", response.status);
    }
    const blob = await response.blob();
    const resolvedName = parseContentDispositionFileName(
      response.headers.get("content-disposition"),
      fileName
    );
    triggerBrowserFileDownload(blob, resolvedName);
    return;
  }

  const FileSystem = await import("expo-file-system/legacy");
  const Sharing = await import("expo-sharing");
  const token = getAdminToken();
  if (!token) {
    throw new AdminApiError("Not signed in. Please log in again.", 401);
  }

  const url = `${resolveAdminApiBaseUrl()}/api/admin/customers/${id}/orders/export/pdf`;
  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) {
    throw new AdminApiError("Unable to access local storage for PDF download.");
  }

  const fileUri = `${directory}${fileName}`;
  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/pdf",
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new AdminApiError("Failed to download customer order history PDF.", result.status);
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: fileName,
      UTI: "com.adobe.pdf",
    });
    return;
  }

  throw new AdminApiError("Sharing is not available on this device.");
}

// ── Analytics UI types (matches customerAnalytics.tsx) ──────────────────────

export type AnalyticsChartPoint = { label: string; value: number };
export type AnalyticsSlicePoint = { label: string; value: number; color: string };
export type AnalyticsRecentOrder = {
  id: string;
  orderNumber: string;
  productName: string;
  date: string;
  amount: number;
  status: "Delivered" | "Processing" | "Cancelled" | "Returned" | "Replacement";
  payment: string;
};

export type CustomerAnalyticsUi = {
  customer: { id: number; name: string; email: string; phone: string };
  totalOrders: number;
  lifetimeSpend: number;
  avgOrderValue: number;
  delivered: number;
  processing: number;
  cancelled: number;
  returned: number;
  replacement: number;
  refundAmount: number;
  monthlySpend: AnalyticsChartPoint[];
  monthlyOrders: AnalyticsChartPoint[];
  orderStatusBreakdown: AnalyticsSlicePoint[];
  categories: AnalyticsChartPoint[];
  brands: AnalyticsChartPoint[];
  paymentMethods: AnalyticsSlicePoint[];
  orderFrequency: AnalyticsChartPoint[];
  purchaseTime: AnalyticsChartPoint[];
  behaviour: {
    mostPurchasedCategory: string;
    favouriteBrand: string;
    avgBasketSize: string;
    mostActiveDay: string;
    mostActiveTime: string;
    avgDeliveryTime: string;
    longestGap: string;
    currentStreak: string;
  };
  returnsData: {
    returnRate: number;
    replacementRate: number;
    refundAmount: number;
    reasons: AnalyticsChartPoint[];
  };
  paymentsData: {
    successRate: number;
    preferredMethod: string;
    failedPayments: number;
    refundHistory: { date: string; amount: number; reason: string }[];
  };
  addressData: {
    primary: string;
    savedCount: number;
    mostDelivered: string;
    recentLocations: string[];
  };
  reviewsData: {
    submitted: number;
    avgRating: string;
    photoReviews: number;
    helpfulVotes: number;
  };
  supportData: {
    tickets: number;
    resolved: number;
    pending: number;
    avgResolutionTime: string;
    latestTicket: string;
  };
  loyaltyData: {
    tier: string;
    points: number;
    progressPct: number;
    nextTier: string;
    couponsUsed: number;
    lifetimeSavings: number;
  };
  riskBadges: { label: string; color: string; bg: string }[];
  aiInsights: string[];
  recommendedActions: { label: string; icon: string; color: string }[];
  recentOrders: AnalyticsRecentOrder[];
  timeline: { type: string; title: string; date: string }[];
  customerSince: string;
  lastPurchase: string;
  healthScore: number;
  isVip: boolean;
  status: string;
  trends: { spendTrend: string; ordersTrend: string };
};

const STATUS_COLORS: Record<string, string> = {
  Delivered: "#22C55E",
  Processing: "#F59E0B",
  Cancelled: "#EF4444",
  Returned: "#7C3AED",
  Replacement: "#3B82F6",
};

const PAYMENT_COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#7C3AED", "#14B8A6", "#EC4899"];

const RISK_BADGE_STYLES: Record<string, { color: string; bg: string }> = {
  "High Value Customer": { color: "#22C55E", bg: "#F0FDF4" },
  "Repeat Buyer": { color: "#3B82F6", bg: "#EFF6FF" },
  "VIP Customer": { color: "#F59E0B", bg: "#FEF9C3" },
  "Low Return Rate": { color: "#22C55E", bg: "#F0FDF4" },
  "Frequent Canceller": { color: "#EF4444", bg: "#FEF2F2" },
  "Inactive Customer": { color: "#374151", bg: "#F3F4F6" },
  "Late Payment Risk": { color: "#EF4444", bg: "#FEF2F2" },
  "Standard Customer": { color: "#374151", bg: "#F3F4F6" },
};

const ACTION_COLORS: Record<string, string> = {
  gift: "#EC4899",
  crown: "#F59E0B",
  truck: "#3B82F6",
  send: "#7C3AED",
  phone: "#22C55E",
  flag: "#EF4444",
};

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s || fallback;
}

function chartPoints(raw: unknown): AnalyticsChartPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return { label: str(row.label), value: num(row.value) };
  });
}

function slicePoints(raw: unknown, colors?: string[]): AnalyticsSlicePoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    const row = item as Record<string, unknown>;
    const label = str(row.label);
    return {
      label,
      value: num(row.value),
      color: str(row.color) || colors?.[idx % (colors?.length ?? 1)] || STATUS_COLORS[label] || PAYMENT_COLORS[idx % PAYMENT_COLORS.length],
    };
  });
}

function orderStatus(raw: unknown): AnalyticsRecentOrder["status"] {
  const value = str(raw, "Processing");
  if (value === "Delivered" || value === "Processing" || value === "Cancelled" || value === "Returned" || value === "Replacement") {
    return value;
  }
  return "Processing";
}

export function mapApiAnalyticsToUi(raw: Record<string, unknown>): CustomerAnalyticsUi {
  const customerRaw = (raw.customer ?? {}) as Record<string, unknown>;
  const behaviour = (raw.behaviour ?? {}) as Record<string, unknown>;
  const returnsData = (raw.returnsData ?? {}) as Record<string, unknown>;
  const paymentsData = (raw.paymentsData ?? {}) as Record<string, unknown>;
  const addressData = (raw.addressData ?? {}) as Record<string, unknown>;
  const reviewsData = (raw.reviewsData ?? {}) as Record<string, unknown>;
  const supportData = (raw.supportData ?? {}) as Record<string, unknown>;
  const loyaltyData = (raw.loyaltyData ?? {}) as Record<string, unknown>;
  const trends = (raw.trends ?? {}) as Record<string, unknown>;

  const orderStatusBreakdown = slicePoints(raw.orderStatusBreakdown).map((item) => ({
    ...item,
    color: STATUS_COLORS[item.label] ?? item.color,
  }));

  const paymentMethods = slicePoints(raw.paymentMethods, PAYMENT_COLORS);

  const recentOrders: AnalyticsRecentOrder[] = Array.isArray(raw.recentOrders)
    ? raw.recentOrders.map((item) => {
        const row = item as Record<string, unknown>;
        const id = str(row.id ?? row.orderId);
        const productName = str(row.productName ?? row.product_name);
        return {
          id,
          orderNumber: str(row.orderNumber, id),
          productName: productName || "—",
          date: str(row.date),
          amount: num(row.amount),
          status: orderStatus(row.status),
          payment: str(row.payment, "—"),
        };
      })
    : [];

  const refundHistory = Array.isArray(paymentsData.refundHistory)
    ? (paymentsData.refundHistory as Record<string, unknown>[]).map((row) => ({
        date: str(row.date),
        amount: num(row.amount),
        reason: str(row.reason, "—"),
      }))
    : [];

  const riskBadges = Array.isArray(raw.riskBadges)
    ? (raw.riskBadges as Record<string, unknown>[]).map((row) => {
        const label = str(row.label, "Standard Customer");
        const style = RISK_BADGE_STYLES[label] ?? RISK_BADGE_STYLES["Standard Customer"];
        return { label, ...style };
      })
    : [{ label: "Standard Customer", ...RISK_BADGE_STYLES["Standard Customer"] }];

  const recommendedActions = Array.isArray(raw.recommendedActions)
    ? (raw.recommendedActions as Record<string, unknown>[]).map((row) => ({
        label: str(row.label),
        icon: str(row.icon),
        color: ACTION_COLORS[str(row.icon)] ?? "#7C3AED",
      }))
    : [];

  const timeline = Array.isArray(raw.timeline)
    ? (raw.timeline as Record<string, unknown>[]).map((row) => ({
        type: str(row.type, "order"),
        title: str(row.title),
        date: str(row.date),
      }))
    : [];

  const recentLocations = Array.isArray(addressData.recentLocations)
    ? (addressData.recentLocations as unknown[]).map((v) => str(v)).filter(Boolean)
    : [];

  return {
    customer: {
      id: num(customerRaw.id),
      name: str(customerRaw.name, "Customer"),
      email: str(customerRaw.email),
      phone: str(customerRaw.phone, "—"),
    },
    totalOrders: num(raw.totalOrders),
    lifetimeSpend: num(raw.lifetimeSpend),
    avgOrderValue: num(raw.avgOrderValue),
    delivered: num(raw.delivered),
    processing: num(raw.processing),
    cancelled: num(raw.cancelled),
    returned: num(raw.returned),
    replacement: num(raw.replacement),
    refundAmount: num(raw.refundAmount),
    monthlySpend: chartPoints(raw.monthlySpend),
    monthlyOrders: chartPoints(raw.monthlyOrders),
    orderStatusBreakdown,
    categories: chartPoints(raw.categories),
    brands: chartPoints(raw.brands),
    paymentMethods,
    orderFrequency: chartPoints(raw.orderFrequency),
    purchaseTime: chartPoints(raw.purchaseTime),
    behaviour: {
      mostPurchasedCategory: str(behaviour.mostPurchasedCategory, "—"),
      favouriteBrand: str(behaviour.favouriteBrand, "—"),
      avgBasketSize: str(behaviour.avgBasketSize, "—"),
      mostActiveDay: str(behaviour.mostActiveDay, "—"),
      mostActiveTime: str(behaviour.mostActiveTime, "—"),
      avgDeliveryTime: str(behaviour.avgDeliveryTime, "—"),
      longestGap: str(behaviour.longestGap, "—"),
      currentStreak: str(behaviour.currentStreak, "—"),
    },
    returnsData: {
      returnRate: num(returnsData.returnRate),
      replacementRate: num(returnsData.replacementRate),
      refundAmount: num(returnsData.refundAmount),
      reasons: chartPoints(returnsData.reasons),
    },
    paymentsData: {
      successRate: num(paymentsData.successRate),
      preferredMethod: str(paymentsData.preferredMethod, "—"),
      failedPayments: num(paymentsData.failedPayments),
      refundHistory,
    },
    addressData: {
      primary: str(addressData.primary, "—"),
      savedCount: num(addressData.savedCount, 1),
      mostDelivered: str(addressData.mostDelivered, "—"),
      recentLocations,
    },
    reviewsData: {
      submitted: num(reviewsData.submitted),
      avgRating: str(reviewsData.avgRating, "0.0"),
      photoReviews: num(reviewsData.photoReviews),
      helpfulVotes: num(reviewsData.helpfulVotes),
    },
    supportData: {
      tickets: num(supportData.tickets),
      resolved: num(supportData.resolved),
      pending: num(supportData.pending),
      avgResolutionTime: str(supportData.avgResolutionTime, "—"),
      latestTicket: str(supportData.latestTicket, "No tickets raised"),
    },
    loyaltyData: {
      tier: str(loyaltyData.tier, "Bronze"),
      points: num(loyaltyData.points),
      progressPct: num(loyaltyData.progressPct),
      nextTier: str(loyaltyData.nextTier, "Silver"),
      couponsUsed: num(loyaltyData.couponsUsed),
      lifetimeSavings: num(loyaltyData.lifetimeSavings),
    },
    riskBadges,
    aiInsights: Array.isArray(raw.aiInsights) ? (raw.aiInsights as unknown[]).map((v) => str(v)).filter(Boolean) : [],
    recommendedActions,
    recentOrders,
    timeline,
    customerSince: str(raw.customerSince, "—"),
    lastPurchase: str(raw.lastPurchase, "—"),
    healthScore: num(raw.healthScore, 60),
    isVip: Boolean(raw.isVip),
    status: str(raw.status, "Inactive"),
    trends: {
      spendTrend: str(trends.spendTrend, "0%"),
      ordersTrend: str(trends.ordersTrend, "0%"),
    },
  };
}
