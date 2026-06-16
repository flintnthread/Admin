import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import AdminLayout from "../components/admin-layout";
import { useAuth } from "@/context/auth-context";
import { getApiErrorMessage } from "@/lib/api/client";
import type { OrderSummary } from "@/lib/api/types";
import { resolveMediaUrl } from "@/lib/api/media";
import { fetchOrders, updateOrderGstStatus } from "@/services/orderApi";

// ─── Color Palette ────────────────────────────────────────────────────────────

const C = {
  brand: "#D97706",
  brandDark: "#B45309",
  brandLight: "#FFFBF5",
  brandMid: "#FEF3C7",
  navy: "#1D324E",
  navyLight: "#EBF0F7",
  navyMid: "#2E4A6E",
  white: "#FFFFFF",
  bg: "#F4F6FA",
  card: "#FFFFFF",
  border: "#E8ECF2",
  borderLight: "#F0F2F7",
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  green: "#166534",
  greenBg: "#DCFCE7",
  greenLight: "#F0FDF4",
  greenBorder: "#BBF7D0",
  amber: "#92400E",
  amberBg: "#FEF3C7",
  amberLight: "#FFFBF5",
  red: "#DC2626",
  redBg: "#FEE2E2",
  cyan: "#0369A1",
  cyanBg: "#E0F2FE",
  purple: "#5B21B6",
  purpleBg: "#EDE9FE",
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Icon = {
  Calendar: ({ size = 11, color = C.textMuted }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"
        fill={color}
      />
    </Svg>
  ),
  Shop: ({ size = 12, color = C.brand }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M2.97 1.35A1 1 0 0 1 3.73 1h8.54a1 1 0 0 1 .76.35l2.609 3.044A1.5 1.5 0 0 1 16 5.37v.255a2.375 2.375 0 0 1-4.25 1.458A2.371 2.371 0 0 1 9.875 8 2.37 2.37 0 0 1 8 7.083 2.37 2.37 0 0 1 6.125 8a2.37 2.37 0 0 1-1.875-.917A2.375 2.375 0 0 1 0 5.625V5.37a1.5 1.5 0 0 1 .361-.976L2.97 1.35zm1.5 2.437-.396 1.107A1.375 1.375 0 0 0 5.375 6.5h.25a1.375 1.375 0 0 0 1.373-1.28L6.89 3.787 4.47 3.787zM7.11 3.787l-.112 1.433A1.375 1.375 0 0 0 8.375 6.5h-.75a1.375 1.375 0 0 0 1.377-1.28L8.89 3.787H7.11zm2.42 0-.112 1.433A1.375 1.375 0 0 0 10.875 6.5h.25a1.375 1.375 0 0 0 1.301-1.793L12.03 3.787H9.53zM3.53 3.787H1.03l.396 1.107A1.375 1.375 0 0 0 2.875 6.5h.25a1.375 1.375 0 0 0 1.301-1.793L3.53 3.787zM1 7.5V14a1 1 0 0 0 1 1h3v-4h2v4h7a1 1 0 0 0 1-1V7.5A2.375 2.375 0 0 1 13.625 8a2.37 2.37 0 0 1-1.875-.917A2.37 2.37 0 0 1 9.875 8 2.37 2.37 0 0 1 8 7.083 2.37 2.37 0 0 1 6.125 8a2.37 2.37 0 0 1-1.875-.917A2.375 2.375 0 0 1 1 7.5z"
        fill={color}
      />
    </Svg>
  ),
  FileText: ({ size = 13, color = C.textMuted }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z"
        fill={color}
      />
      <Path
        d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"
        fill={color}
      />
    </Svg>
  ),
  Download: ({ size = 13, color = C.green }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"
        fill={color}
      />
      <Path
        d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"
        fill={color}
      />
    </Svg>
  ),
  Eye: ({ size = 13, color = C.brand }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"
        fill={color}
      />
      <Path
        d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"
        fill={color}
      />
    </Svg>
  ),
  ChevronRight: ({ size = 13, color = C.brand }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
        fill={color}
      />
    </Svg>
  ),
  CheckCircle: ({ size = 12, color = C.green }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
        fill={color}
      />
      <Path
        d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"
        fill={color}
      />
    </Svg>
  ),
  Truck: ({ size = 12, color = C.textSecondary }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5v-7zm1.294 7.456A1.999 1.999 0 0 1 4.732 11h5.536a2.01 2.01 0 0 1 .732-.732V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456zM12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12v4zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
        fill={color}
      />
    </Svg>
  ),
};

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentType = "Cash on Delivery" | "Online Payment" | "UPI" | "Card";
type OrderStatus =
  | "Processing"
  | "Pending"
  | "Completed"
  | "Cancelled"
  | "Shipped";
type GSTStatus = "Filed" | "Not Filed";

interface Product {
  id: string;
  name: string;
  image: string;
  seller: string;
  sellerEmail: string;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  time: string;
  customer: { name: string; email: string };
  sellers: { name: string; email: string }[];
  products: Product[];
  amount: number;
  paymentType: PaymentType;
  status: OrderStatus;
  gstStatus: GSTStatus;
  hasInvoice: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCur = (n: number) => `₹${n.toLocaleString("en-IN")}.00`;


function toUiOrder(row: ReturnType<typeof mapOrderRow>, raw: OrderSummary): Order {
  const createdAt = raw.createdAt ? new Date(raw.createdAt) : null;
  const validDate = createdAt && !Number.isNaN(createdAt.getTime());

  const statusMap: Record<string, OrderStatus> = {
    processing: "Processing",
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
    shipped: "Shipped",
  };
  const normalizedStatus = (raw.orderStatus ?? "").toLowerCase();
  const status = statusMap[normalizedStatus] ?? "Pending";

  const paymentMap: Record<string, PaymentType> = {
    cod: "Cash on Delivery",
    cash_on_delivery: "Cash on Delivery",
    upi: "UPI",
    card: "Card",
    online: "Online Payment",
  };
  const payKey = (raw.paymentMethod ?? raw.paymentStatus ?? "").toLowerCase();
  const paymentType = paymentMap[payKey] ?? "Cash on Delivery";

  const products: Product[] = (raw.products ?? []).map((p, index) => ({
    id: String(p.id ?? `${raw.id}-${index}`),
    name: p.name ?? "Product",
    image: resolveMediaUrl(p.imageUrl),
    seller: p.sellerName ?? "—",
    sellerEmail: "",
  }));

  const sellers = (raw.sellers ?? []).map((s) => ({
    name: s.name ?? "Seller",
    email: s.email ?? "",
  }));

  return {
    id: String(row.id),
    orderNumber: row.orderId.startsWith("#") ? row.orderId : `#${row.orderId}`,
    date: validDate
      ? createdAt!.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : row.date,
    time: validDate
      ? createdAt!.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    customer: { name: row.customer, email: row.email },
    sellers,
    products,
    amount:
      typeof raw.totalAmount === "number"
        ? raw.totalAmount
        : Number(raw.totalAmount ?? 0),
    paymentType,
    status,
    gstStatus: row.gstStatus?.toLowerCase() === "filed" ? "Filed" : "Not Filed",
    hasInvoice: false,
  };
}

/** Returns up to 2 initials from a name */
const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  OrderStatus,
  { bg: string; text: string; dot: string }
> = {
  Processing: { bg: C.cyanBg, text: C.cyan, dot: C.cyan },
  Pending: { bg: C.amberBg, text: C.amber, dot: C.amber },
  Completed: { bg: C.greenBg, text: C.green, dot: C.green },
  Cancelled: { bg: C.redBg, text: C.red, dot: C.red },
  Shipped: { bg: C.purpleBg, text: C.purple, dot: C.purple },
};

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const c = STATUS_CFG[status];
  return (
    <View style={[ss.badge, { backgroundColor: c.bg }]}>
      <View style={[ss.badgeDot, { backgroundColor: c.dot }]} />
      <Text style={[ss.badgeTxt, { color: c.text }]}>{status}</Text>
    </View>
  );
};

// ─── GST Badge ────────────────────────────────────────────────────────────────

const GSTBadge = ({
  status,
  onMark,
}: {
  status: GSTStatus;
  onMark: () => void;
}) => {
  if (status === "Filed") {
    return (
      <View style={ss.gstFiled}>
        <Icon.CheckCircle size={12} color={C.green} />
        <Text style={[ss.gstTxt, { color: C.green }]}>Filed</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={onMark}
      activeOpacity={0.75}
      style={ss.gstUnfiled}
    >
      <Text style={[ss.gstTxt, { color: C.amber }]}>Mark Filed</Text>
    </TouchableOpacity>
  );
};

// ─── Order Card ───────────────────────────────────────────────────────────────

export const OrderCard = ({
  order,
  onView,
  onGST,
}: {
  order: Order;
  onView: (o: Order) => void;
  onGST: (id: string) => void;
}) => {
  return (
    <View style={ss.card}>
      {/* ── Header: order ID + status badge ── */}
      <View style={ss.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={ss.orderIdLabel}>ORDER ID</Text>
          <Text style={ss.orderNum}>{order.orderNumber}</Text>
          <View style={ss.dateRow}>
            <Icon.Calendar size={11} color={C.textMuted} />
            <Text style={ss.dateText}>
              {" "}
              {order.date} · {order.time}
            </Text>
          </View>
        </View>
        <StatusBadge status={order.status} />
      </View>

      <View style={ss.divider} />

      {/* ── Products ── */}
      <View style={ss.section}>
        <Text style={ss.sectionLabel}>PRODUCTS</Text>
        <View style={ss.productRow}>
          {order.products.length > 0 ? (
            order.products.map((p) => (
              <Image
                key={p.id}
                source={{ uri: p.image }}
                style={ss.productThumb}
              />
            ))
          ) : (
            <View style={[ss.productThumb, ss.productThumbEmpty]}>
              <Text style={ss.productThumbEmptyText}>—</Text>
            </View>
          )}
        </View>
      </View>

      <View style={ss.divider} />

      {/* ── Sellers ── */}
      <View style={ss.section}>
        <Text style={ss.sectionLabel}>
          {order.sellers.length > 1 ? "SELLERS" : "SELLER"}
        </Text>
        {order.sellers.map((s, i) => (
          <View key={i} style={[ss.sellerRow, i > 0 && { marginTop: 6 }]}>
            <View style={ss.sellerIconWrap}>
              <Icon.Shop size={12} color={C.brand} />
            </View>
            <Text style={ss.sellerName} numberOfLines={1}>
              {s.name}
            </Text>
          </View>
        ))}
      </View>

      <View style={ss.divider} />

      {/* ── Customer ── */}
      <View style={ss.section}>
        <Text style={ss.sectionLabel}>CUSTOMER</Text>
        <View style={ss.customerRow}>
          <View style={ss.avatar}>
            <Text style={ss.avatarTxt}>{getInitials(order.customer.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ss.customerName} numberOfLines={1}>
              {order.customer.name}
            </Text>
            <Text style={ss.customerEmail} numberOfLines={1}>
              {order.customer.email}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Amount strip ── */}
      <View style={ss.amountStrip}>
        <View>
          <Text style={ss.amountLabel}>Total Amount</Text>
          <Text style={ss.amountVal}>{fmtCur(order.amount)}</Text>
        </View>
        <View style={ss.paymentChip}>
          <Icon.Truck size={12} color={C.textSecondary} />
          <Text style={ss.paymentChipTxt}>{order.paymentType}</Text>
        </View>
      </View>

      {/* ── Footer: Payment | GST Filed | Invoice ── */}
      <View style={ss.footer}>
        <View style={ss.footerCell}>
          <Text style={ss.footerLabel}>PAYMENT</Text>
          <Text style={ss.footerValue}>{order.paymentType}</Text>
        </View>

        <View style={ss.footerDivider} />

        <View style={ss.footerCell}>
          <Text style={ss.footerLabel}>GST FILED</Text>
          <View style={{ marginTop: 5 }}>
            <GSTBadge status={order.gstStatus} onMark={() => onGST(order.id)} />
          </View>
        </View>

        <View style={ss.footerDivider} />

        <View style={ss.footerCell}>
          <Text style={ss.footerLabel}>INVOICE / LABEL</Text>
          {order.hasInvoice ? (
            <View style={[ss.iconRow, { marginTop: 5 }]}>
              <TouchableOpacity style={ss.iconBtn}>
                <Icon.FileText size={13} color={C.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[ss.iconBtn, ss.iconBtnGreen]}>
                <Icon.Download size={13} color={C.green} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={ss.noInvoice}>—</Text>
          )}
        </View>
      </View>

      {/* ── View Details ── */}
      <TouchableOpacity
        style={ss.viewBtn}
        onPress={() => onView(order)}
        activeOpacity={0.8}
      >
        <Icon.Eye size={13} color={C.brand} />
        <Text style={ss.viewBtnTxt}>View Order Details</Text>
        <Icon.ChevronRight size={13} color={C.brand} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  // Header
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 10,
  },
  orderIdLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  orderNum: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navy,
    letterSpacing: -0.2,
    marginBottom: 4,
    fontVariant: ["tabular-nums"],
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 11,
    color: C.textMuted,
  },

  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.8,
  },
  badgeTxt: {
    fontSize: 11,
    fontWeight: "700",
  },

  divider: {
    height: 0.5,
    backgroundColor: C.borderLight,
    marginHorizontal: 0,
  },

  // Section
  section: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  // Products
  productRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  productThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  productThumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  productThumbEmptyText: {
    fontSize: 12,
    color: C.textMuted,
  },

  // Seller
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sellerIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: C.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerName: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textPrimary,
    flex: 1,
  },

  // Customer
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.navyLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarTxt: {
    fontSize: 10,
    fontWeight: "700",
    color: C.navyMid,
  },
  customerName: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textPrimary,
  },
  customerEmail: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 1,
  },

  // Amount strip
  amountStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: (C as any).amountStripBg ?? "#FFFBF5",
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: C.borderLight,
  },
  amountLabel: {
    fontSize: 10,
    color: C.textMuted,
    marginBottom: 2,
  },
  amountVal: {
    fontSize: 20,
    fontWeight: "700",
    color: C.brand,
    letterSpacing: -0.5,
  },
  paymentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  paymentChipTxt: {
    fontSize: 11,
    fontWeight: "500",
    color: C.textSecondary,
  },

  // Footer
  footer: {
    flexDirection: "row",
  },
  footerCell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footerDivider: {
    width: 0.5,
    backgroundColor: C.borderLight,
    marginVertical: 8,
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 11,
    fontWeight: "500",
    color: C.textSecondary,
    marginTop: 3,
  },

  // GST
  gstFiled: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  gstUnfiled: {
    backgroundColor: C.amberBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  gstTxt: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Invoice icons
  iconRow: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: C.bg,
    borderWidth: 0.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnGreen: {
    backgroundColor: C.greenLight,
    borderColor: C.greenBorder,
  },
  noInvoice: {
    color: C.textMuted,
    fontSize: 13,
    marginTop: 5,
  },

  // View Details button
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    backgroundColor: C.brandLight,
    gap: 5,
  },
  viewBtnTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: C.brand,
  },

  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    marginHorizontal: 14,
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  stateText: {
    fontSize: 14,
    color: C.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: C.red,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.brand,
  },
  retryBtnText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 13,
  },

  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  paginationInfo: {
    fontSize: 13,
    color: C.textSecondary,
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageNum: {
    minWidth: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white,
    paddingHorizontal: 6,
  },
  pageNumActive: {
    backgroundColor: C.brand,
    borderColor: C.brand,
  },
  pageNumText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.navy,
  },
  pageNumTextActive: { color: C.white },
  pageEllipsis: {
    fontSize: 13,
    color: C.textMuted,
    paddingHorizontal: 4,
  },
});

const ORDERS_PAGE_SIZE = 20;

function buildOrderPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p += 1) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("ellipsis");
  if (total > 1) pages.push(total);
  return pages;
}

export default function OrdersScreen({ navigation }: { navigation?: any }) {
  const { token, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchOrders({ page: currentPage - 1, size: ORDERS_PAGE_SIZE });
      setOrders(page.items.map((item) => toUiOrder(mapOrderRow(item), item)));
      setTotalElements(page.totalElements);
      setTotalPages(page.totalPages);
      if (currentPage > page.totalPages && page.totalPages > 0) {
        setCurrentPage(page.totalPages);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, token]);

  useEffect(() => {
    if (authLoading || !token) return;
    void loadOrders();
  }, [authLoading, token, loadOrders]);

  const pageNumbers = useMemo(
    () => buildOrderPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const rangeStart =
    totalElements === 0 ? 0 : (currentPage - 1) * ORDERS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * ORDERS_PAGE_SIZE, totalElements);

  const handleView = useCallback(
    (o: Order) => {
      if (navigation) navigation.navigate("OrderDetails", { order: o });
    },
    [navigation],
  );

  const handleGST = useCallback(async (id: string) => {
    try {
      await updateOrderGstStatus(Number(id), "Filed");
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, gstStatus: "Filed" } : o)),
      );
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to update GST status.");
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    }
  }, []);

  return (
    <AdminLayout>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={ss.stateBox}>
            <ActivityIndicator size="large" color={C.brand} />
            <Text style={ss.stateText}>Loading orders…</Text>
          </View>
        ) : error ? (
          <View style={ss.stateBox}>
            <Text style={ss.errorText}>{error}</Text>
            <TouchableOpacity style={ss.retryBtn} onPress={loadOrders} activeOpacity={0.8}>
              <Text style={ss.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : orders.length === 0 ? (
          <View style={ss.stateBox}>
            <Text style={ss.stateText}>No orders found</Text>
          </View>
        ) : (
          <>
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onView={handleView}
                onGST={handleGST}
              />
            ))}
            {totalPages > 0 && (
              <View style={ss.pagination}>
                <Text style={ss.paginationInfo}>
                  Showing {rangeStart} to {rangeEnd} of {totalElements} orders
                </Text>
                {totalPages > 1 && (
                  <View style={ss.paginationControls}>
                    <TouchableOpacity
                      style={[ss.pageBtn, currentPage <= 1 && ss.pageBtnDisabled]}
                      disabled={currentPage <= 1}
                      onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <Text style={ss.pageNumText}>‹</Text>
                    </TouchableOpacity>
                    {pageNumbers.map((num, index) =>
                      num === "ellipsis" ? (
                        <Text key={`e-${index}`} style={ss.pageEllipsis}>
                          ...
                        </Text>
                      ) : (
                        <TouchableOpacity
                          key={num}
                          style={[ss.pageNum, num === currentPage && ss.pageNumActive]}
                          onPress={() => setCurrentPage(num)}
                        >
                          <Text
                            style={[
                              ss.pageNumText,
                              num === currentPage && ss.pageNumTextActive,
                            ]}
                          >
                            {num}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                    <TouchableOpacity
                      style={[
                        ss.pageBtn,
                        currentPage >= totalPages && ss.pageBtnDisabled,
                      ]}
                      disabled={currentPage >= totalPages}
                      onPress={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      <Text style={ss.pageNumText}>›</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      </View>
    </AdminLayout>
  );
}
