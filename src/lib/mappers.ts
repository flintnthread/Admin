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
import { formatDate, formatRupee, initialsFromName, maskAccount } from "@/lib/format";

export function mapSellerToApprovedRow(s: SellerSummary) {
  return {
    id: s.id,
    name: s.fullName ?? "Seller",
    email: s.email ?? "",
    avatar: s.profilePicUrl ?? "",
    businessName: s.businessName ?? "—",
    businessType: s.businessType ?? s.sellerCategory?.toUpperCase() ?? "—",
    products: Number(s.productCount ?? 0),
    walletBalance: Number(s.walletBalance ?? 0),
    joinDate: formatDate(s.createdAt),
    revenue: 0,
    state: s.state ?? "—",
    city: s.city ?? "—",
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
    categoryName?: string;
    imageUrl?: string;
    price?: number;
  },
) {
  return {
    id: String(p.id),
    name: p.name ?? "Product",
    sku: p.sku ?? "—",
    seller: p.sellerName ?? `Seller #${p.sellerId ?? "—"}`,
    status: mapProductStatus(p.status),
    submittedAt: formatDate(p.createdAt),
    image: p.imageUrl ?? "",
    category: p.categoryName ?? "—",
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
  const paid = p.status?.toLowerCase() === "paid";
  const days = paid ? 0 : daysSinceIso(p.requestedAt);
  const reminderBucket = paid
    ? ("green" as const)
    : days >= 7
      ? ("red" as const)
      : days >= 3
        ? ("orange" as const)
        : ("green" as const);
  return {
    id: p.id,
    orderId: p.orderId ? `FNT${p.orderId}` : `PAYOUT-${p.id}`,
    orderDate: formatDate(p.requestedAt),
    orderStatus: "Completed" as const,
    sellerName: p.sellerName ?? `Seller #${p.sellerId ?? ""}`,
    sellerEmail: "",
    sellerPhone: "",
    customerPaid: formatRupee(p.requestedAmount),
    deliveryDate: formatDate(p.paidAt ?? p.requestedAt),
    deliveryTime: "",
    reminderLabel: paid ? "Paid" : days > 0 ? `${days}d pending` : "Pending",
    reminderDays: days,
    reminderBucket,
    paymentStatus: paid ? ("Paid" as const) : ("Pending" as const),
    walletBalance: formatRupee(p.requestedAmount),
    transactionRef: p.transactionRef ?? "",
    adminNote: p.adminNote ?? "",
    sellerNote: p.sellerNote ?? "",
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
  const kyc: "Not Submitted" | "Submitted" | "Approved" | "Pending" =
    s.kycVerified ? "Approved" : s.kycCompleted ? "Pending" : "Not Submitted";
  const productCount = Number(s.productCount ?? 0);
  return {
    id: s.sellerUniqueId ?? `FNT-SELLER-${String(s.id).padStart(6, "0")}`,
    numericId: s.id,
    serialNo: index + 1,
    name: s.fullName ?? "Seller",
    email: s.email ?? "",
    mobile: s.mobile ?? "",
    business: s.businessName ?? "—",
    sain: s.referralCode ?? s.email ?? "—",
    status: (s.status === "suspended" ? "Inactive" : "Active") as "Active" | "Inactive",
    kyc,
    products: {
      status: (productCount > 0 ? "Done" : "Not Started") as "Done" | "Not Started" | "Pending",
      count: productCount,
    },
    wallet: formatRupee(s.walletBalance),
    registered: formatDate(s.createdAt),
    banner: s.profilePicUrl,
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
    image: String(p.imageUrl ?? ""),
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
    sortOrder: s.sortOrder ?? 0,
  };
}
