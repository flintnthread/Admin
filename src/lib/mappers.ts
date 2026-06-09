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
import { formatDate, formatRupee, initialsFromName, maskAccount } from "@/lib/format";

export function mapSellerToApprovedRow(s: SellerSummary) {
  return {
    id: s.id,
    name: s.fullName ?? "Seller",
    email: s.email ?? "",
    avatar: s.profilePicUrl ?? "",
    businessName: s.businessName ?? "—",
    businessType: s.sellerCategory?.toUpperCase() ?? "—",
    products: 0,
    walletBalance: Number(s.walletBalance ?? 0),
    joinDate: formatDate(s.createdAt),
    revenue: 0,
    state: "—",
    city: "—",
    status: s.status === "suspended" ? ("Blocked" as const) : ("Active" as const),
  };
}

export function mapProductToApprovalRow(p: ProductSummary) {
  return {
    id: String(p.id),
    name: p.name ?? "Product",
    sku: p.sku ?? "—",
    seller: `Seller #${p.sellerId ?? "—"}`,
    status: (p.status === "approved"
      ? "approved"
      : p.status === "rejected"
        ? "rejected"
        : "pending") as "pending" | "approved" | "rejected" | "review",
    submittedAt: formatDate(p.createdAt),
    image: "",
    category: "—",
    price: "—",
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

export function mapPayoutToPaymentRow(p: PayoutSummary) {
  const paid = p.status?.toLowerCase() === "paid";
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
    reminderLabel: paid ? "Paid" : "Pending",
    reminderDays: 0,
    reminderBucket: paid ? ("green" as const) : ("orange" as const),
    paymentStatus: paid ? ("Paid" as const) : ("Pending" as const),
    walletBalance: formatRupee(p.requestedAmount),
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
    branch: "—",
    account: maskAccount(undefined),
    ifsc: "—",
    status: s.bankVerified ? "approved" : "pending",
    statusLabel: s.bankVerified ? "Approved" : "Pending",
    requested: formatDate(s.updatedAt ?? s.createdAt),
    sellerConfirm: "-",
    adminApprove: s.bankVerified ? formatDate(s.updatedAt) : "-",
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
    priority: (t.priority ?? "General") as "General" | "High" | "Low" | "Critical",
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

export function mapFaqCategoryRow(c: FaqCategory) {
  return {
    id: c.id,
    name: c.categoryName ?? "",
    icon: c.categoryIcon ?? "help-circle",
    sortOrder: c.sortOrder ?? 0,
    status: c.status !== false,
    faqCount: 0,
  };
}

export function mapFaqRow(f: FaqItem) {
  return {
    id: f.id,
    question: f.question ?? "",
    answer: f.answer ?? "",
    sortOrder: f.sortOrder ?? 0,
    status: f.status !== false,
    isSeller: Boolean(f.isSeller),
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
