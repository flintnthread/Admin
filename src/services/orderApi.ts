import { adminApiRequest, adminApiFetch, AdminApiError } from "@/lib/api/client";
import { resolveAdminApiBaseUrl } from "@/lib/api/config";
import type { OrderSummary, PageResponse } from "@/lib/api/types";

export async function fetchOrders(params?: {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  search?: string;
  sort?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<OrderSummary>> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  if (params?.paymentMethod) q.set("paymentMethod", params.paymentMethod);
  if (params?.search) q.set("search", params.search);
  if (params?.sort) q.set("sort", params.sort);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 20));
  return adminApiRequest(`/api/admin/orders?${q}`);
}

export type OrderStats = {
  totalOrders: number;
  thisMonth: number;
  monthRevenue: number;
  pendingPayments: number;
};

export async function fetchOrderStats(): Promise<OrderStats> {
  return adminApiRequest("/api/admin/orders/stats");
}

export function getOrderExportUrl(params?: {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  search?: string;
  sort?: string;
}): string {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  if (params?.paymentMethod) q.set("paymentMethod", params.paymentMethod);
  if (params?.search) q.set("search", params.search);
  if (params?.sort) q.set("sort", params.sort);
  const qs = q.toString();
  return `${resolveAdminApiBaseUrl()}/api/admin/orders/export${qs ? `?${qs}` : ""}`;
}

export async function fetchOrderExportCsv(params?: {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  search?: string;
  sort?: string;
}): Promise<string> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  if (params?.paymentMethod) q.set("paymentMethod", params.paymentMethod);
  if (params?.search) q.set("search", params.search);
  if (params?.sort) q.set("sort", params.sort);
  const qs = q.toString();
  const path = `/api/admin/orders/export${qs ? `?${qs}` : ""}`;
  const response = await adminApiFetch(path, { headers: { Accept: "text/csv" } });
  if (!response.ok) {
    throw new Error("Export failed");
  }
  return response.text();
}

export async function fetchOrderDetail(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/orders/${id}`);
}

export async function updateOrderGstStatus(id: number, gstStatus: string): Promise<void> {
  await adminApiRequest(`/api/admin/orders/${id}/gst-status`, {
    method: "PATCH",
    body: JSON.stringify({ gstStatus }),
  });
}

export async function updateOrderStatus(
  id: number,
  status: string,
  note?: string
): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });
}

export type OrderInvoiceAddress = {
  name?: string;
  email?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  address?: string;
};

export type OrderInvoiceLineItem = {
  id?: number;
  productId?: number;
  name?: string;
  imageUrl?: string;
  sku?: string;
  hsnCode?: string;
  color?: string;
  size?: string;
  qty?: number;
  unitPrice?: number;
  taxPercent?: number;
  lineSubtotal?: number;
  taxAmount?: number;
  lineTotal?: number;
};

export type OrderInvoiceSellerGroup = {
  seller?: {
    name?: string;
    email?: string;
    phone?: string;
    gstin?: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      pincode?: string;
      phone?: string;
      email?: string;
      gstin?: string;
    };
  };
  products?: OrderInvoiceLineItem[];
};

export type OrderInvoice = {
  invoiceNumber?: string;
  orderId?: number;
  orderNumber?: string;
  invoiceDate?: string;
  orderDate?: string;
  company?: {
    name?: string;
    country?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
  billing?: OrderInvoiceAddress;
  shipping?: OrderInvoiceAddress;
  sellerGroups?: OrderInvoiceSellerGroup[];
  payment?: {
    method?: string;
    status?: string;
    paid?: boolean;
  };
  orderStatus?: string;
  gstStatus?: string;
  gstNumber?: string;
  totals?: {
    subtotal?: number;
    tax?: number;
    shipping?: number;
    discount?: number;
    walletDeduction?: number;
    referralDiscount?: number;
    grandTotal?: number;
  };
  isIntraState?: boolean;
  gstBreakdown?: {
    cgst?: number;
    sgst?: number;
    igst?: number;
    total?: number;
  };
  qrCode?: {
    url?: string;
    imageDataUrl?: string;
  };
};

export async function fetchOrderInvoice(id: number): Promise<OrderInvoice> {
  return adminApiRequest(`/api/admin/orders/${id}/invoice`);
}

function parseContentDispositionFileName(header: string | null, fallback: string) {
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

export async function downloadOrderInvoicePdf(
  id: number,
  preferredFileName?: string
): Promise<void> {
  const res = await adminApiFetch(`/api/admin/orders/${id}/invoice/pdf`, {
    headers: { Accept: "application/pdf" },
  });

  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore
    }
    throw new AdminApiError(message, res.status);
  }

  const blob = await res.blob();
  const fileName = parseContentDispositionFileName(
    res.headers.get("content-disposition"),
    preferredFileName ?? `invoice-${id}.pdf`
  );
  triggerBrowserFileDownload(blob, fileName);
}
