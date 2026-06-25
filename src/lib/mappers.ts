import type {
  ContactMessage,
  CustomerSummary,
  DeliverySlab,
  FaqCategory,
  FaqItem,
  OrderSummary,
  PayoutSummary,
  ProductSummary,
  SellerSummary,
  SupportTicketSummary,
} from "@/lib/api/types";
import type { PendingProfileSeller } from "@/services/sellerApi";
import { resolveMediaUrl, resolveSellerProfileImage } from "@/lib/api/media";
import { formatDate, formatRupee, initialsFromName, maskAccount } from "@/lib/format";

function normalizeLocation(value?: string | null): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return "Not provided";
  return trimmed;
}

export function mapSellerToApprovedRow(s: SellerSummary) {
  return {
    id: s.id,
    name: s.fullName ?? "Seller",
    email: s.email ?? "",
    avatar: resolveSellerProfileImage(s),
    businessName: s.businessName?.trim() || "—",
    businessType: s.businessType ?? s.sellerCategory?.toUpperCase() ?? "—",
    products: Number(s.productCount ?? 0),
    walletBalance: Number(s.walletBalance ?? 0),
    joinDate: formatDate(s.createdAt),
    revenue: Number(s.totalRevenue ?? 0),
    state: normalizeLocation(s.state),
    city: normalizeLocation(s.city),
    status: s.status === "suspended" ? ("Blocked" as const) : ("Active" as const),
  };
}

export function mapPendingProfileToApprovalRow(
  s: PendingProfileSeller,
  detail?: Record<string, unknown> | null
) {
  return {
    id: s.sellerId,
    name: s.fullName,
    email: s.email,
    mobile: s.mobile ?? "",
    businessName: s.businessName ?? "—",
    businessType: String(detail?.businessType ?? "—"),
    submittedOn: formatDate(s.profileUpdatedAt),
    state: String(detail?.state ?? "—"),
    city: String(detail?.city ?? "—"),
    bankName: String(detail?.bankName ?? "—"),
    accountNumber: String(detail?.accountNumber ?? "—"),
    ifscCode: String(detail?.ifscCode ?? "—"),
    holderName: String(detail?.accountHolder ?? "—"),
  };
}

function mapProductStatus(status?: string): "pending" | "approved" | "rejected" | "review" {
  const raw = (status ?? "pending").toLowerCase();
  if (raw === "active" || raw === "approved") return "approved";
  if (raw === "rejected") return "rejected";
  if (raw === "under_review" || raw === "review") return "review";
  return "pending";
}

export function mapProductToApprovalRow(p: ProductSummary) {
  return {
    id: String(p.id),
    name: p.name ?? "Product",
    sku: p.sku ?? "—",
    seller: `Seller #${p.sellerId ?? "—"}`,
    status: mapProductStatus(p.status),
    submittedAt: formatDate(p.createdAt),
    image: "",
    category: "—",
    price: "—",
  };
}

export function mapProductListToApprovalRow(
  p: ProductSummary & {
    sellerName?: string;
    sellerEmail?: string;
    categoryName?: string;
    mainCategoryName?: string;
    subcategoryName?: string;
    imageUrl?: string;
    price?: number;
  },
) {
  const categoryLabel = [p.mainCategoryName, p.categoryName, p.subcategoryName]
    .filter(Boolean)
    .join(" › ") || p.categoryName || "—";

  return {
    id: String(p.id),
    name: p.name ?? "Product",
    sku: p.sku ?? "—",
    seller: p.sellerName ?? `Seller #${p.sellerId ?? "—"}`,
    sellerEmail: p.sellerEmail ?? "",
    status: mapProductStatus(p.status),
    submittedAt: formatDate(p.createdAt),
    image: resolveMediaUrl(p.imageUrl),
    category: categoryLabel,
    price: p.price != null ? formatRupee(p.price) : "—",
  };
}

export function mapOrderRow(o: OrderSummary) {
  return {
    id: o.id,
    orderId: o.orderNumber ?? `ORD-${o.id}`,
    customer: o.shippingName ?? "—",
    email: o.shippingEmail ?? "",
    phone: o.shippingPhone ?? "",
    amount: formatRupee(o.totalAmount),
    status: o.orderStatus ?? "—",
    payment: o.paymentStatus ?? "—",
    date: formatDate(o.createdAt),
    city: o.shippingCity ?? "—",
    gstStatus: o.gstStatus ?? "Not Filed",
  };
}

export function mapCustomerRow(c: CustomerSummary) {
  return {
    id: c.id,
    name: c.name ?? "Customer",
    email: c.email ?? "",
    phone: c.phone ?? "",
    orders: Number(c.orderCount ?? 0),
    totalSpent: Number(c.totalSpent ?? 0),
    lastOrder: c.lastOrderAt ? formatDate(c.lastOrderAt) : null,
    status: "Active" as const,
    city: c.city ?? "—",
    state: c.state ?? "—",
  };
}

function daysSinceIso(date?: string): number {
  if (!date) return 0;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

export function mapPayoutToPaymentRow(p: PayoutSummary) {
  const status = (p.status ?? "pending").toLowerCase();
  const paid = status === "paid";
  const cancelled = status === "cancelled";
  const referenceDate = p.deliveryDate ?? p.requestedAt;
  const days = paid || cancelled ? 0 : daysSinceIso(referenceDate);
  const reminderBucket = paid || cancelled
    ? ("green" as const)
    : days >= 5
      ? ("red" as const)
      : days >= 3
        ? ("orange" as const)
        : ("green" as const);

  const orderStatusRaw = (p.orderStatus ?? "").toLowerCase();
  const orderStatus =
    orderStatusRaw === "delivered" ? ("Completed" as const) :
    orderStatusRaw === "processing" || orderStatusRaw === "confirmed" ? ("Processing" as const) :
    ("Processing" as const);

  const paymentStatus =
    paid ? ("Paid" as const) :
    cancelled ? ("Cancelled" as const) :
    ("Pending" as const);

  const deliveryAt = p.deliveryDate ?? p.paidAt;
  const deliveryTime = deliveryAt && deliveryAt.includes("T")
    ? deliveryAt.split("T")[1]?.slice(0, 5) ?? ""
    : "";

  const breakdown = p.amountBreakdown;
  const finalPayable = breakdown?.finalPayableAmount ?? p.requestedAmount;

  return {
    id: p.id,
    orderId: p.orderNumber ?? (p.orderId ? `FNT${p.orderId}` : `ORDER-${p.id}`),
    orderDate: formatDate(p.requestedAt),
    orderStatus,
    sellerName: p.sellerName ?? `Seller #${p.sellerId ?? ""}`,
    sellerEmail: p.sellerEmail ?? "",
    sellerPhone: p.sellerPhone ?? "",
    customerName: p.customerName ?? "",
    customerEmail: p.customerEmail ?? "",
    customerPaid: formatRupee(p.customerPaidAmount ?? p.requestedAmount),
    deliveryDate: formatDate(deliveryAt ?? p.requestedAt),
    deliveryTime,
    reminderLabel: paid ? "Paid" : cancelled ? "Cancelled" : days > 0 ? `${days}d pending` : "Pending",
    reminderDays: days,
    reminderBucket,
    paymentStatus,
    walletBalance: formatRupee(p.walletBalance ?? 0),
    transactionRef: p.transactionRef ?? "",
    adminNote: p.adminNote ?? "",
    sellerRequestNote: p.sellerNote ?? "",
    bankName: p.bankName,
    branchName: p.branchName,
    accountNumber: p.accountNumber,
    ifscCode: p.ifscCode,
    accountHolderName: p.accountHolderName,
    orderAmount: breakdown?.orderAmount != null ? formatRupee(breakdown.orderAmount) : formatRupee(p.customerPaidAmount),
    gstAmount: breakdown?.gstAmount != null ? `-${formatRupee(breakdown.gstAmount)}` : "-₹0.00",
    deliveryCharge: breakdown?.deliveryCharge != null ? `-${formatRupee(breakdown.deliveryCharge)}` : "-₹0.00",
    deliveryType: breakdown?.deliveryType ?? "Intra-City",
    commissionRate: breakdown?.commissionRate != null ? String(breakdown.commissionRate) : "15.00",
    commissionAmount: breakdown?.commissionAmount != null ? `-${formatRupee(breakdown.commissionAmount)}` : "-₹0.00",
    finalPayableAmount: formatRupee(finalPayable),
  };
}

function toNum(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Full payout detail for Spd (view) screen — includes shipping, items, numeric breakdown. */
export function mapPayoutDetailToSpdOrder(raw: Record<string, unknown>) {
  const base = mapPayoutToPaymentRow(raw as PayoutSummary);
  const breakdown = (raw.amountBreakdown ?? {}) as PayoutSummary["amountBreakdown"];
  const items = Array.isArray(raw.items) ? (raw.items as PayoutSummary["items"]) : [];
  const first = items?.[0];

  const customerPaidNum = toNum(raw.customerPaidAmount ?? breakdown?.orderAmount);
  const orderAmountNum = toNum(breakdown?.orderAmount ?? customerPaidNum);
  const gstAmountNum = toNum(breakdown?.gstAmount);
  const deliveryChargeNum = toNum(breakdown?.deliveryCharge);
  const commissionRateNum = toNum(breakdown?.commissionRate ?? 15);
  const commissionAmountNum = toNum(breakdown?.commissionAmount);
  const finalPayableNum = toNum(breakdown?.finalPayableAmount ?? raw.requestedAmount);

  const deliveryType = breakdown?.deliveryType ?? "Intra-City";
  const cityType = deliveryType.toLowerCase().includes("metro") ? "Metro-Metro" : "Intra-City";

  const sellingWithGst = customerPaidNum;
  const gstPct = sellingWithGst > 0 ? +((gstAmountNum / sellingWithGst) * 100).toFixed(2) : 0;
  const sellingExclGst = +(sellingWithGst - gstAmountNum).toFixed(2);

  return {
    ...base,
    customerPhone: String(raw.shippingPhone ?? ""),
    shippingAddressLine1: String(raw.shippingAddress1 ?? ""),
    shippingAddressLine2: String(raw.shippingAddress2 ?? ""),
    shippingCity: String(raw.shippingCity ?? ""),
    shippingState: String(raw.shippingState ?? ""),
    shippingPincode: String(raw.shippingPincode ?? ""),
    cityType,
    sellerGstin: String(raw.sellerGstin ?? ""),
    sellerAddressLine1: String(raw.sellerAddress ?? ""),
    sellerAddressLine2: "",
    sellerCity: String(raw.sellerCity ?? ""),
    sellerState: String(raw.sellerState ?? ""),
    sellerPincode: String(raw.sellerPincode ?? ""),
    bankAccountHolder: base.accountHolderName ?? String(raw.accountHolderName ?? ""),
    bankAccountNumber: base.accountNumber ?? String(raw.accountNumber ?? ""),
    bankIfsc: base.ifscCode ?? String(raw.ifscCode ?? ""),
    itemDescription: first?.productName ?? "",
    hsn: first?.hsnCode ?? "",
    sku: first?.sku ?? "",
    qty: first?.quantity ?? 1,
    basePrice: toNum(first?.price),
    totalAmount: toNum(first?.total) || orderAmountNum,
    items: (items ?? []).map((item) => ({
      productName: item.productName ?? "",
      hsn: item.hsnCode ?? "",
      sku: item.sku ?? "",
      qty: item.quantity ?? 1,
      basePrice: toNum(item.price),
      total: toNum(item.total),
    })),
    orderRef: base.orderId,
    customerPaidNum,
    orderAmountNum,
    gstAmountNum,
    deliveryChargeNum,
    commissionAmountNum,
    commissionRateNum,
    finalPayableNum,
    sellingPriceWithGst: sellingWithGst,
    sellingPriceExclGst: sellingExclGst,
    gstAmount: gstAmountNum,
    gstPercent: gstPct,
    commissionPercent: commissionRateNum,
    commissionAmount: commissionAmountNum,
    sellingPlusCommission: +(sellingWithGst + commissionAmountNum).toFixed(2),
    invoiceNumber: String(raw.invoiceNumber ?? ""),
  };
}

export function mapBankPendingRow(s: SellerSummary) {
  return {
    id: `#S${s.id}`,
    sellerId: s.id,
    initials: initialsFromName(s.fullName),
    color: "#FF6B35",
    name: s.fullName ?? "Seller",
    email: s.email ?? "",
    phone: s.mobile ?? "",
    business: s.businessName ?? "—",
    bank: s.bankName ?? "—",
    branch: s.branchName ?? "—",
    account: maskAccount(s.accountNumber),
    ifsc: s.ifscCode ?? "—",
    status: s.bankVerified ? "approved" : "pending",
    statusLabel: s.bankVerified ? "Approved" : "Pending",
    requested: formatDate(s.updatedAt ?? s.createdAt),
    sellerConfirm: formatDate(s.updatedAt ?? s.createdAt),
    adminApprove: s.bankVerified ? formatDate(s.updatedAt) : "-",
  };
}

export function mapSellerListRow(s: SellerSummary, index: number) {
  const kyc: "Not Submitted" | "Submitted" | "Approved" | "Pending" = s.kycVerified
    ? "Approved"
    : s.kycCompleted
      ? "Submitted"
      : s.profileCompleted
        ? "Pending"
        : "Not Submitted";
  const productCount = Number(s.productCount ?? 0);
  const imageUrl = resolveSellerProfileImage(s);
  return {
    id: s.sellerUniqueId ?? `FNT-SELLER-${String(s.id).padStart(6, "0")}`,
    numericId: s.id,
    serialNo: index + 1,
    name: s.fullName ?? "Seller",
    email: s.email ?? "",
    mobile: s.mobile ?? "",
    business: s.businessName ?? "—",
    sain: s.referralCode ?? s.sellerUniqueId ?? "—",
    status: (s.status === "suspended" || s.status === "inactive" ? "Inactive" : "Active") as "Active" | "Inactive",
    kyc,
    products: {
      status: (productCount > 0 ? "Done" : "Not Started") as "Done" | "Not Started" | "Pending",
      count: productCount,
    },
    wallet: formatRupee(s.walletBalance),
    registered: formatDate(s.createdAt),
    banner: imageUrl || undefined,
    avatar: imageUrl || undefined,
    profilePicPath: s.profilePicPath,
    liveSelfiePath: s.liveSelfiePath,
    profilePicUrl: s.profilePicUrl,
    city: s.city ?? "—",
    state: s.state ?? "—",
    businessType: s.businessType ?? "—",
    revenue: Number(s.totalRevenue ?? 0),
    totalOrders: Number(s.totalOrders ?? 0),
    country: s.country ?? "—",
    bankVerified: Boolean(s.bankVerified),
  };
}

export function mapPendingProfileRow(s: PendingProfileSeller) {
  return {
    id: s.sellerId,
    name: s.fullName,
    businessName: s.businessName ?? "—",
    email: s.email,
    mobile: s.mobile ?? "",
    submittedOn: formatDate(s.profileUpdatedAt),
  };
}

export function mapSellerSupportTicket(t: SupportTicketSummary) {
  const statusMap: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    waiting: "Waiting Admin",
    closed: "Closed",
    resolved: "Resolved",
  };
  const priorityMap: Record<string, string> = {
    general: "Medium",
    high: "High",
    low: "Low",
    critical: "Urgent",
    urgent: "Urgent",
    medium: "Medium",
  };
  return {
    id: String(t.id),
    ticketCode: t.ticketNumber ?? `TKT-${t.id}`,
    description: t.subject ?? "—",
    sellerName: t.sellerName ?? `Seller #${t.sellerId}`,
    email: "",
    phone: "",
    department: t.category ?? "General",
    status: statusMap[t.status?.toLowerCase() ?? ""] ?? "Open",
    priority: priorityMap[t.priority?.toLowerCase() ?? ""] ?? "Medium",
    createdAt: formatDate(t.createdAt),
    messages: (t.messages ?? []).map((m, i) => ({
      id: String(m.id ?? i),
      sender: m.senderType === "admin" ? ("admin" as const) : ("user" as const),
      senderName: m.senderType === "admin" ? "You (Admin)" : (t.sellerName ?? "Seller"),
      text: m.message ?? "",
      timestamp: formatDate(m.createdAt),
    })),
  };
}

export function mapSupportTicket(t: SupportTicketSummary) {
  const statusMap: Record<string, string> = {
    open: "Open",
    closed: "Resolved",
    in_progress: "In Progress",
    waiting: "Waiting",
  };
  return {
    id: String(t.id),
    subject: t.subject ?? "—",
    user: t.sellerName ?? `Seller #${t.sellerId}`,
    priority: (() => {
      const raw = (t.priority ?? "general").toLowerCase();
      if (raw === "high") return "High";
      if (raw === "low") return "Low";
      if (raw === "critical") return "Critical";
      return "General";
    })() as "General" | "High" | "Low" | "Critical",
    status: (statusMap[t.status?.toLowerCase() ?? ""] ?? "Open") as
      | "Open"
      | "In Progress"
      | "Waiting"
      | "Resolved"
      | "Urgent",
    ticketNo: t.ticketNumber ?? `TKT-${t.id}`,
    date: formatDate(t.createdAt),
    messages: (t.messages ?? []).map((m) => ({
      from: m.senderType === "admin" ? "Admin" : "Seller",
      content: m.message ?? "",
      time: formatDate(m.createdAt),
      isAdmin: m.senderType === "admin",
    })),
  };
}

export function mapContactRow(c: ContactMessage) {
  return {
    id: c.id,
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    subject: c.subject ?? "",
    message: c.message ?? "",
    status: c.status ? "read" : "unread",
    date: formatDate(c.createdAt),
    adminNotes: c.adminNotes ?? "",
  };
}

const FAQ_CATEGORY_COLORS = ["#00b894", "#6c5ce7", "#0984e3", "#e17055", "#e84393", "#d63031", "#00b359", "#8e44ad"];

export function mapFaqCategoryRow(c: FaqCategory, index = 0) {
  const active = c.status !== false;
  return {
    id: c.id,
    name: c.categoryName ?? "Category",
    description: c.categoryName ?? "",
    icon: c.categoryIcon ?? "help-circle",
    color: FAQ_CATEGORY_COLORS[index % FAQ_CATEGORY_COLORS.length],
    faqCount: Number((c as FaqCategory & { faqCount?: number }).faqCount ?? 0),
    status: (active ? "Active" : "Inactive") as "Active" | "Inactive",
    createdAt: formatDate(c.createdAt),
    slug: (c.categoryName ?? "category").toLowerCase().replace(/\s+/g, "-"),
  };
}

export function mapFaqQuestionRow(f: FaqItem) {
  return {
    id: f.id,
    categoryId: f.categoryId ?? 0,
    question: f.question ?? "",
    answer: f.answer ?? "",
    status: (f.status !== false ? "Active" : "Inactive") as "Active" | "Inactive",
    createdAt: formatDate(f.createdAt),
    order: f.sortOrder ?? 0,
    isForSeller: Boolean(f.isSeller),
  };
}

export function mapCategoryRequestRow(r: {
  id: number;
  categoryName?: string;
  sellerName?: string;
  sellerEmail?: string;
  description?: string;
  reason?: string;
  status?: string;
  adminNotes?: string;
  createdAt?: string;
}) {
  const statusRaw = (r.status ?? "pending").toLowerCase();
  const status =
    statusRaw === "approved" ? "Approved" : statusRaw === "rejected" ? "Rejected" : "Pending";
  return {
    id: `CR-${String(r.id).padStart(3, "0")}`,
    numericId: r.id,
    categoryName: r.categoryName ?? "—",
    sellerName: r.sellerName ?? "—",
    sellerEmail: r.sellerEmail ?? "—",
    description: r.description ?? "—",
    reason: r.reason ?? "—",
    status: status as "Pending" | "Approved" | "Rejected",
    submitted: formatDate(r.createdAt),
    adminReason: r.adminNotes,
  };
}

export function mapContactToCustomerTicket(c: ContactMessage) {
  const isOpen = !c.status;
  return {
    id: `#${c.id}`,
    numericId: c.id,
    subject: c.subject ?? c.message?.slice(0, 80) ?? "Contact inquiry",
    customer: c.name ?? "Customer",
    email: c.email ?? "",
    phone: c.phone ?? "",
    type: inferContactType(c.subject ?? c.message ?? ""),
    order: extractOrderRef(c.subject ?? c.message ?? ""),
    status: isOpen ? "Open" : "Closed",
    created: formatDate(c.createdAt),
    message: c.message ?? "",
    adminNotes: c.adminNotes ?? "",
  };
}

export function mapCustomerSupportTicket(t: {
  id: number;
  ticketNumber?: string;
  customerId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  subject?: string;
  typeLabel?: string;
  message?: string;
  orderId?: number;
  orderNumber?: string;
  statusLabel?: string;
  createdAt?: string;
  messages?: { id: number | string; senderType?: string; senderName?: string; message?: string; createdAt?: string }[];
}) {
  return {
    id: t.ticketNumber ?? `TKT-${String(t.id).padStart(5, "0")}`,
    numericId: t.id,
    customerId: t.customerId,
    subject: t.subject ?? "—",
    customer: t.customerName ?? "Customer",
    email: t.customerEmail ?? "",
    phone: t.customerPhone ?? "",
    type: t.typeLabel ?? "Other",
    order: t.orderNumber ?? (t.orderId ? `#${t.orderId}` : "—"),
    orderId: t.orderId,
    status: (t.statusLabel ?? "Open") as "Open" | "In Progress" | "Closed",
    created: formatDate(t.createdAt),
    message: t.message ?? "",
    messages: (t.messages ?? []).map((m, index) => ({
      id: String(m.id ?? index),
      sender: m.senderType === "admin" ? ("admin" as const) : ("customer" as const),
      senderName: m.senderName ?? (m.senderType === "admin" ? "Admin" : "Customer"),
      text: m.message ?? "",
      timestamp: formatDate(m.createdAt),
    })),
  };
}

function inferContactType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("deliver") || lower.includes("shipping")) return "Delivery Issue";
  if (lower.includes("payment") || lower.includes("refund")) return "Payment Issue";
  if (lower.includes("product") || lower.includes("damage")) return "Product Issue";
  return "Other";
}

function extractOrderRef(text: string): string {
  const match = text.match(/FNT\d+/i) || text.match(/#\w+/);
  return match ? match[0] : "—";
}

export function mapProductListRow(p: Record<string, unknown>) {
  const stock = Number(p.stock ?? 0);
  const displayStatus = String(p.displayStatus ?? "Inactive");
  return {
    id: String(p.id ?? ""),
    name: String(p.name ?? "Product"),
    sku: String(p.sku ?? "—"),
    category: String(p.categoryName ?? "—"),
    subcategory: String(p.subcategoryName ?? "—"),
    subSubcategory: "—",
    color: String(p.color ?? "—"),
    size: String(p.size ?? "—"),
    price: Number(p.price ?? 0),
    stock,
    status: displayStatus as "Active" | "Inactive" | "Out of Stock",
    image: resolveMediaUrl(String(p.imageUrl ?? "")),
    updated: String(p.updatedLabel ?? formatDate(p.updatedAt as string)),
  };
}

export function mapDeliverySlabRow(s: DeliverySlab) {
  return {
    id: s.id,
    label: s.label ?? "",
    minKg: Number(s.minWeightKg ?? 0),
    maxKg: Number(s.maxWeightKg ?? 0),
    intraCity: Number(s.intraCityCharge ?? 0),
    metroMetro: Number(s.metroMetroCharge ?? 0),
    active: s.active !== false,
    custom: s.custom === true,
    sortOrder: s.sortOrder ?? 0,
  };
}
