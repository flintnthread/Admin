import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse, SellerSummary } from "@/lib/api/types";

/** Canonical seller code — matches seller-service `SellerUniqueIdService`. */
export function formatSellerUniqueId(sellerId: number): string {
  const id = Math.max(0, Math.floor(Number(sellerId)));
  return `FNT-SELLER-${String(id).padStart(6, "0")}`;
}

export function readSellerUniqueIdRaw(row: Record<string, unknown>): string {
  const raw = row.sellerUniqueId ?? row.seller_unique_id ?? row.sellerUniqueID;
  return raw != null ? String(raw).trim() : "";
}

export function pickSellerUniqueId(
  sellerId: number,
  ...candidates: (string | null | undefined)[]
): string {
  for (const candidate of candidates) {
    const trimmed = String(candidate ?? "").trim();
    if (trimmed) return trimmed;
  }
  return formatSellerUniqueId(sellerId);
}

export function resolveSellerUniqueId(
  sellerId: number,
  raw?: string | null
): string {
  const trimmed = String(raw ?? "").trim();
  if (trimmed) return trimmed;
  return formatSellerUniqueId(sellerId);
}

/** Primary seller label: business (or owner name) + unique ID — matches analytics caption. */
export function formatSellerDisplayName(
  s: Pick<{ id: number; fullName?: string | null; businessName?: string | null; sellerUniqueId?: string | null }, "id" | "fullName" | "businessName" | "sellerUniqueId">
): string {
  const business = String(s.businessName ?? "").trim();
  const name = String(s.fullName ?? "").trim() || `Seller #${s.id}`;
  const uniqueId = pickSellerUniqueId(s.id, s.sellerUniqueId);
  const primary = business && business !== "—" ? business : name;
  return `${primary} (${uniqueId})`;
}

function csvCell(value: unknown): string {
  const str = value == null ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function csvPhone(value: unknown): string {
  const phone = value == null ? "" : String(value).trim();
  if (!phone) return csvCell("");
  // Leading tab keeps Excel from converting long numbers to scientific notation.
  return csvCell(`\t${phone}`);
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

function csvSellerDataRow(values: unknown[]): string {
  return values
    .map((value, index) => (index === 5 ? csvPhone(value) : csvCell(value)))
    .join(",");
}

function resolveKycExportLabel(seller: Record<string, unknown>): string {
  if (seller.kycVerified === true) return "Complete";
  if (seller.kycCompleted === true) return "Pending";
  return "Not done";
}

function resolveProfileExportLabel(seller: Record<string, unknown>): string {
  return seller.profileCompleted === true ? "Complete" : "Incomplete";
}

function formatExportDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export async function fetchApprovedSellers(size = 500): Promise<SellerSummary[]> {
  const page = await adminApiRequest<PageResponse<SellerSummary>>(
    `/api/admin/sellers/approved?page=0&size=${size}`
  );
  return page.items ?? [];
}

export type ApprovedSellerLocationStat = { name: string; count: number };

export async function fetchApprovedSellerLocationStats(): Promise<{
  stateCounts: ApprovedSellerLocationStat[];
  cityCounts: ApprovedSellerLocationStat[];
}> {
  const raw = await adminApiRequest<Record<string, unknown>>("/api/admin/sellers/approved/location-stats");
  const parseRows = (key: string): ApprovedSellerLocationStat[] => {
    const rows = raw[key];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => {
        const r = row as Record<string, unknown>;
        const name = String(r.name ?? "").trim();
        if (!name) return null;
        return { name, count: Number(r.count) || 0 };
      })
      .filter((row): row is ApprovedSellerLocationStat => row != null);
  };
  return {
    stateCounts: parseRows("stateCounts"),
    cityCounts: parseRows("cityCounts"),
  };
}

export async function resendSellerVerification(id: number): Promise<{ message: string }> {
  return adminApiRequest(`/api/admin/sellers/${id}/resend-verification`, { method: "POST" });
}

export async function createSeller(body: {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
}): Promise<Record<string, unknown>> {
  return adminApiRequest("/api/admin/sellers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchSellers(params?: {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<SellerSummary>> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 20));
  return adminApiRequest(`/api/admin/sellers?${q}`);
}

export type SellerGraphFilters = {
  filterType?: string;
  year?: number;
  fromDate?: string;
  toDate?: string;
  sellerId?: number;
};

export type SellerGraphChartData = {
  labels: string[];
  registered: number[];
  profileCompleted: number[];
  approved: number[];
  productsAdded: number[];
  shiprocketUploaded: number[];
  maxY: number;
};

export type SellerGraphInsight = {
  iconName: string;
  text: string;
  color: string;
  bg: string;
};

export type SellerGraphRow = SellerSummary & {
  products?: number;
  profile?: string;
  kyc?: string;
  supplement?: string;
  shiprocket?: string;
  shipDate?: string | null;
};

export type SellerGraphNameOption = {
  id: number;
  fullName: string;
  businessName?: string | null;
  sellerUniqueId?: string | null;
};

function buildGraphQuery(filters?: SellerGraphFilters): string {
  const q = new URLSearchParams();
  if (filters?.filterType) q.set("filterType", filters.filterType);
  if (filters?.year != null) q.set("year", String(filters.year));
  if (filters?.fromDate) q.set("fromDate", filters.fromDate);
  if (filters?.toDate) q.set("toDate", filters.toDate);
  if (filters?.sellerId != null) q.set("sellerId", String(filters.sellerId));
  const query = q.toString();
  return query ? `?${query}` : "";
}

export async function fetchSellersForGraph(params?: {
  search?: string;
  sellerId?: number;
  page?: number;
  size?: number;
}): Promise<PageResponse<SellerGraphRow>> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.sellerId != null) q.set("sellerId", String(params.sellerId));
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 20));
  return adminApiRequest(`/api/admin/sellers/graph?${q}`);
}

export async function fetchSellerGraphNames(): Promise<SellerGraphNameOption[]> {
  const rows = await adminApiRequest<unknown[]>("/api/admin/sellers/graph/names");
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row): SellerGraphNameOption | null => {
      const r = row as Record<string, unknown>;
      const id = Number(r.id);
      if (!Number.isFinite(id)) return null;
      return {
        id,
        fullName: String(r.fullName ?? `Seller #${id}`),
        businessName: r.businessName != null ? String(r.businessName) : null,
        sellerUniqueId: readSellerUniqueIdRaw(r) || null,
      };
    })
    .filter((row): row is SellerGraphNameOption => row != null);
}

export async function fetchSellerAnalyticsSummary(
  filters?: SellerGraphFilters
): Promise<Record<string, number>> {
  return adminApiRequest(`/api/admin/sellers/analytics/summary${buildGraphQuery(filters)}`);
}

export async function fetchSellerAnalyticsChart(
  filters?: SellerGraphFilters
): Promise<SellerGraphChartData> {
  return adminApiRequest(`/api/admin/sellers/analytics/chart${buildGraphQuery(filters)}`);
}

export async function fetchSellerAnalyticsInsights(
  filters?: SellerGraphFilters
): Promise<SellerGraphInsight[]> {
  return adminApiRequest(`/api/admin/sellers/analytics/insights${buildGraphQuery(filters)}`);
}

export async function fetchSellerAnalyticsYears(): Promise<string[]> {
  return adminApiRequest("/api/admin/sellers/analytics/years");
}

export function normalizeSellerGraphSummary(
  raw: Record<string, unknown> | null | undefined
): Record<string, number> {
  const s = raw ?? {};
  const num = (key: string, fallback = 0) => {
    const v = s[key];
    return typeof v === "number" ? v : Number(v ?? fallback) || fallback;
  };
  return {
    registered: num("registered", num("total")),
    profileCompleted: num("profileCompleted"),
    approved: num("approved", num("active")),
    productsAdded: num("productsAdded"),
    shiprocketUploaded: num("shiprocketUploaded"),
    total: num("total", num("registered")),
    active: num("active", num("approved")),
    pending: num("pending"),
    pendingBank: num("pendingBank"),
    bankVerified: num("bankVerified"),
    shiprocketPending: num("shiprocketPending"),
    emailPending: num("emailPending"),
  };
}

export function normalizeSellerGraphChart(raw: unknown): SellerGraphChartData {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const asNums = (key: string) =>
      Array.isArray(o[key]) ? (o[key] as unknown[]).map((v) => Number(v) || 0) : [];
    return {
      labels: Array.isArray(o.labels) ? o.labels.map(String) : [],
      registered: asNums("registered"),
      profileCompleted: asNums("profileCompleted"),
      approved: asNums("approved"),
      productsAdded: asNums("productsAdded"),
      shiprocketUploaded: asNums("shiprocketUploaded"),
      maxY: Number(o.maxY) || 100,
    };
  }
  if (Array.isArray(raw)) {
    return {
      labels: raw.map((p) => String((p as { month?: string }).month ?? "")),
      registered: raw.map((p) => Number((p as { count?: number }).count) || 0),
      profileCompleted: [],
      approved: [],
      productsAdded: [],
      shiprocketUploaded: [],
      maxY: Math.max(100, ...raw.map((p) => Number((p as { count?: number }).count) || 0)),
    };
  }
  return {
    labels: [],
    registered: [],
    profileCompleted: [],
    approved: [],
    productsAdded: [],
    shiprocketUploaded: [],
    maxY: 100,
  };
}

export async function blockSeller(id: number, reason?: string): Promise<void> {
  await adminApiRequest(`/api/admin/sellers/${id}/block`, {
    method: "POST",
    body: JSON.stringify({ reason, note: reason }),
  });
}

export async function unblockSeller(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/sellers/${id}/unblock`, { method: "POST" });
}

export async function updateSellerStatus(
  id: number,
  payload: {
    status: string;
    kycVerificationStatus?: string;
    kycRemarks?: string;
  }
): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/sellers/${id}/status`, {
    method: "POST",
    body: JSON.stringify({
      status: payload.status,
      kycVerificationStatus: payload.kycVerificationStatus,
      kycRemarks: payload.kycRemarks,
    }),
  });
}

export async function fetchPendingBankSellers(page = 0, size = 20): Promise<PageResponse<SellerSummary>> {
  return adminApiRequest(`/api/admin/sellers/bank/pending?page=${page}&size=${size}`);
}

export async function fetchBankStats(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/sellers/bank/stats");
}

export async function fetchSellerBankDetails(id: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/sellers/${id}/bank`);
}

export async function approveSellerBank(id: number, note?: string): Promise<void> {
  await adminApiRequest(`/api/admin/sellers/${id}/bank/approve`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function rejectSellerBank(id: number, note?: string): Promise<void> {
  await adminApiRequest(`/api/admin/sellers/${id}/bank/reject`, {
    method: "POST",
    body: JSON.stringify({ note, reason: note }),
  });
}

export type PendingProfileSeller = {
  sellerId: number;
  fullName: string;
  email: string;
  mobile?: string;
  businessName?: string;
  status: string;
  profileUpdatedAt?: string;
};

export type ShiprocketSellerRow = {
  id: number;
  businessName?: string;
  contactPerson?: string;
  phone?: string;
  city?: string;
  state?: string;
  email?: string;
  warehouseAddress?: string;
  status?: string;
  uploadedAt?: string | null;
};

export type SellerDetail = SellerSummary & Record<string, unknown>;

export async function fetchSellerDetail(id: number): Promise<SellerDetail> {
  return adminApiRequest(`/api/admin/sellers/${id}`);
}

export async function fetchShiprocketSellers(
  status: "pending" | "uploaded" = "pending",
  page = 0,
  size = 100
): Promise<PageResponse<ShiprocketSellerRow>> {
  return adminApiRequest(`/api/admin/sellers/shiprocket?status=${status}&page=${page}&size=${size}`);
}

export async function fetchBankVerifications(
  status: "pending" | "verified" = "pending",
  page = 0,
  size = 200
): Promise<PageResponse<SellerSummary>> {
  return adminApiRequest(`/api/admin/sellers/bank/verifications?status=${status}&page=${page}&size=${size}`);
}

export async function fetchPendingProfileSellers(): Promise<PendingProfileSeller[]> {
  return adminApiRequest("/api/admin/seller-profiles/pending");
}

export async function fetchPendingProfileDetail(sellerId: number): Promise<Record<string, unknown>> {
  return adminApiRequest(`/api/admin/seller-profiles/${sellerId}`);
}

export async function approveSellerProfile(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/seller-profiles/${id}/approve`, { method: "POST" });
}

export async function rejectSellerProfile(id: number, reason: string): Promise<void> {
  await adminApiRequest(`/api/admin/seller-profiles/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function exportSellerProductsCsv(sellerId: number): Promise<string> {
  const q = new URLSearchParams();
  q.set("page", "0");
  q.set("size", "1000");
  q.set("sellerId", String(sellerId));

  const [seller, response] = await Promise.all([
    fetchSellerDetail(sellerId),
    adminApiRequest<{ items: unknown[] }>(`/api/admin/products?${q}`),
  ]);
  const products = response.items || [];
  const sellerRow = seller as Record<string, unknown>;

  const sellerUniqueId = pickSellerUniqueId(sellerId, readSellerUniqueIdRaw(sellerRow));
  const sellerHeaders = [
    "Seller Unique ID",
    "Seller Name",
    "Business Name",
    "Seller Status",
    "Email",
    "Phone",
    "Onboard Date",
    "Profile",
    "KYC",
    "Bank Verification",
    "City",
    "State",
    "Category",
    "Total Products",
  ];
  const sellerValues: unknown[] = [
    sellerUniqueId,
    String(sellerRow.fullName ?? ""),
    String(sellerRow.businessName ?? ""),
    String(sellerRow.status ?? ""),
    String(sellerRow.email ?? ""),
    sellerRow.mobile ?? sellerRow.phone ?? "",
    formatExportDate(sellerRow.createdAt),
    resolveProfileExportLabel(sellerRow),
    resolveKycExportLabel(sellerRow),
    sellerRow.bankVerified === true ? "Verified" : "Not Verified",
    String(sellerRow.city ?? ""),
    String(sellerRow.state ?? ""),
    String(sellerRow.sellerCategory ?? ""),
    String(sellerRow.productCount ?? products.length),
  ];

  const productHeaders = [
    "product id",
    "Product Name",
    "Product Status",
    "Price",
    "Stock",
    "Created At",
  ];

  const sellerDataRow = csvSellerDataRow(sellerValues);

  const productRows = products.map((product) => {
    const p = product as Record<string, unknown>;
    return csvRow([
      p.id ?? "",
      p.name ?? "",
      p.status ?? "",
      p.price ?? 0,
      p.stock ?? 0,
      p.createdAt ?? "",
    ]);
  });

  const sectionGap = Array.from({ length: 7 }, () => "");

  return [
    csvRow(sellerHeaders),
    sellerDataRow,
    ...sectionGap,
    csvRow(productHeaders),
    ...productRows,
  ].join("\n");
}

export async function exportSellerOrdersCsv(sellerId: number): Promise<string> {
  // Fetch orders for this seller using the order API
  const q = new URLSearchParams();
  q.set('page', '0');
  q.set('size', '1000');
  q.set('sellerId', String(sellerId));
  const response = await adminApiRequest<{ items: unknown[] }>(
    `/api/admin/orders?${q}`
  );
  const orders = response.items || [];

  // Generate CSV
  const headers = ['Order ID', 'Status', 'Total Amount', 'Created At'];
  const rows = orders.map((o: any) => [
    o.id || '',
    o.status || '',
    o.totalAmount || 0,
    o.createdAt || '',
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return csv;
}
