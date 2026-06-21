import { getApiErrorMessage } from "@/lib/api/client";
import type { OrderSummary } from "@/lib/api/types";
import { mapOrderRow } from "@/lib/mappers";
import { fetchOrders, updateOrderGstStatus } from "@/services/orderApi";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import AdminLayout from "../components/admin-layout";

// ─── Color Palette ────────────────────────────────────────────────────────────

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  navy: "#1E2B6B",
  navyDeep: "#151D4F",
  navyMid: "#1A2B5E",
  navyLight: "#2D3E8A",
  green: "#22C55E",
  greenLight: "#86EFAC",
  greenPale: "#F0FDF4",
  red: "#EF4444",
  redLight: "#FCA5A5",
  redPale: "#FEF2F2",
  yellow: "#F59E0B",
  yellowPale: "#FFFBEB",
  blue: "#3B82F6",
  bluePale: "#EFF6FF",
  orange: "#F97316",
  orangePale: "#FFF7ED",
  orangeBorder: "#FED7AA",
  teal: "#14B8A6",
  cyan: "#06B6D4",
  white: "#FFFFFF",
  bg: "#F7F8FC",
  card: "#FFFFFF",
  border: "#E5E7EB",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#9CA3AF",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentType = "Cash on Delivery" | "Online Payment" | "UPI" | "Card";
type OrderStatus =
  | "Processing"
  | "Pending"
  | "Completed"
  | "Cancelled"
  | "Shipped"
  | "Returned"
  | "Replacement";
type GSTStatus = "Filed" | "Not Filed";
type ViewMode = "grid" | "list";
type SortOption = "newest" | "oldest" | "amount_high" | "amount_low";
type DocModalType = "invoice" | "label" | null;

interface Product {
  id: string;
  name: string;
  image: string;
  seller: string;
  sellerEmail: string;
  price?: number;
}

interface SellerGroup {
  seller: { name: string; email: string };
  products: Product[];
  subOrderId?: string;
  trackingId?: string;
  hasInvoice: boolean;
  hasShippingLabel: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  time: string;
  customer: { name: string; email: string };
  sellerGroups: SellerGroup[];
  amount: number;
  paymentType: PaymentType;
  status: OrderStatus;
  gstStatus: GSTStatus;
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<
  OrderStatus,
  { bg: string; text: string; dot: string }
> = {
  Processing: { bg: C.bluePale, text: C.blue, dot: C.blue },
  Pending: { bg: C.yellowPale, text: C.yellow, dot: C.yellow },
  Completed: { bg: C.greenPale, text: C.green, dot: C.green },
  Cancelled: { bg: C.redPale, text: C.red, dot: C.red },
  Shipped: { bg: "#F5F3FF", text: "#7C3AED", dot: "#7C3AED" },
  Returned: { bg: C.redPale, text: C.red, dot: C.red },
  Replacement: { bg: C.bluePale, text: C.blue, dot: C.blue },
};

const STATUS_FILTERS = [
  "All",
  "Processing",
  "Pending",
  "Completed",
  "Shipped",
  "Cancelled",
  "Returned",
  "Replacement",
];
const PAYMENT_FILTERS = [
  "All Payments",
  "Cash on Delivery",
  "Online Payment",
  "UPI",
  "Card",
];
const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "amount_high", label: "Amount (High to Low)" },
  { key: "amount_low", label: "Amount (Low to High)" },
];

const ORDERS_PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCur = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// ─── Mapper ───────────────────────────────────────────────────────────────────
function buildSellerGroups(raw: OrderSummary): SellerGroup[] {
  const rawItems: any[] =
    (raw as any).items ??
    (raw as any).orderItems ??
    (raw as any).products ??
    (raw as any).lineItems ??
    [];

  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  const bySeller = new Map<string, SellerGroup>();

  for (const item of rawItems) {
    const sellerName: string =
      item.sellerName ??
      item.seller?.businessName ??
      item.seller?.name ??
      item.shopName ??
      "Unknown Seller";
    const key = sellerName;

    if (!bySeller.has(key)) {
      bySeller.set(key, {
        seller: { name: sellerName, email: "" },
        products: [],
        subOrderId: item.subOrderId ?? item.suborderId ?? undefined,
        trackingId: item.trackingId ?? item.trackingNumber ?? undefined,
        hasInvoice: Boolean(item.invoiceUrl ?? item.hasInvoice),
        hasShippingLabel: Boolean(
          item.shippingLabelUrl ?? item.hasShippingLabel,
        ),
      });
    }

    bySeller.get(key)!.products.push({
      id: String(
        item.id ??
          item.productId ??
          `${key}-${bySeller.get(key)!.products.length}`,
      ),
      name: item.productName ?? item.name ?? "",
      image: item.productImage ?? item.image ?? item.thumbnail ?? "",
      seller: sellerName,
      sellerEmail: "",
      price:
        typeof item.price === "number"
          ? item.price
          : Number(item.price ?? NaN) || undefined,
    });
  }

  return Array.from(bySeller.values());
}

const PLACEHOLDER_PRODUCTS = [
  {
    name: "Women's Cotton Pants Regular Fit",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop",
    price: 1499,
    seller: "Wugo Store",
  },
  {
    name: "Classic Crew Neck Tee",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
    price: 799,
    seller: "Ishna Fashions",
  },
  {
    name: "Denim Slim Fit Jacket",
    image:
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=200&h=200&fit=crop",
    price: 2199,
    seller: "Wugo Store",
  },
  {
    name: "Leather Strap Watch",
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&h=200&fit=crop",
    price: 3499,
    seller: "Ishna Fashions",
  },
  {
    name: "Running Sneakers",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
    price: 2799,
    seller: "Wugo Store",
  },
  {
    name: "Wireless Earbuds",
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&h=200&fit=crop",
    price: 1999,
    seller: "Tech Bazaar",
  },
  {
    name: "Ceramic Coffee Mug Set",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop",
    price: 599,
    seller: "Home Essentials",
  },
  {
    name: "Yoga Mat Premium",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
    price: 899,
    seller: "Tech Bazaar",
  },
];

function buildPlaceholderSellerGroups(orderId: string): SellerGroup[] {
  const digits = orderId.replace(/\D/g, "");
  const seed = Number(digits.slice(-2)) || 0;

  const isMultiSeller = seed % 100 < 35;

  const makeGroup = (
    sellerName: string,
    items: typeof PLACEHOLDER_PRODUCTS,
    count: number,
    startIdx: number,
  ): SellerGroup => {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      const item = items[(startIdx + i) % items.length];
      products.push({
        id: `${orderId}-${sellerName}-p${i}`,
        name: item.name,
        image: item.image,
        seller: sellerName,
        sellerEmail: "",
        price: item.price,
      });
    }
    return {
      seller: { name: sellerName, email: "" },
      products,
      hasInvoice: true,
      hasShippingLabel: true,
    };
  };

  if (!isMultiSeller) {
    const sellers = Array.from(
      new Set(PLACEHOLDER_PRODUCTS.map((p) => p.seller)),
    );
    const sellerName = sellers[seed % sellers.length];
    const itemsForSeller = PLACEHOLDER_PRODUCTS.filter(
      (p) => p.seller === sellerName,
    );
    const itemCount = (seed % 3) + 1;
    return [makeGroup(sellerName, itemsForSeller, itemCount, seed)];
  }

  const sellers = Array.from(
    new Set(PLACEHOLDER_PRODUCTS.map((p) => p.seller)),
  );
  const sellerCount = (seed % 2) + 2;
  const groups: SellerGroup[] = [];
  for (let s = 0; s < sellerCount; s++) {
    const sellerName = sellers[(seed + s) % sellers.length];
    const itemsForSeller = PLACEHOLDER_PRODUCTS.filter(
      (p) => p.seller === sellerName,
    );
    const itemCount = ((seed + s) % 2) + 1;
    groups.push(makeGroup(sellerName, itemsForSeller, itemCount, seed + s));
  }
  return groups;
}

function toUiOrder(
  row: ReturnType<typeof mapOrderRow>,
  raw: OrderSummary,
): Order {
  const createdAt = raw.createdAt ? new Date(raw.createdAt) : null;
  const validDate = createdAt && !Number.isNaN(createdAt.getTime());
  const statusMap: Record<string, OrderStatus> = {
    processing: "Processing",
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
    shipped: "Shipped",
    returned: "Returned",
    refunded: "Returned",
    replacement: "Replacement",
  };
  const paymentMap: Record<string, PaymentType> = {
    cod: "Cash on Delivery",
    cash_on_delivery: "Cash on Delivery",
    upi: "UPI",
    card: "Card",
    online: "Online Payment",
  };
  const orderNumber = row.orderId.startsWith("#")
    ? row.orderId
    : `#${row.orderId}`;
  const sellerGroups = buildPlaceholderSellerGroups(orderNumber);

  return {
    id: String(row.id),
    orderNumber,
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
    sellerGroups,
    amount:
      typeof raw.totalAmount === "number"
        ? raw.totalAmount
        : Number(raw.totalAmount ?? 0),
    paymentType:
      paymentMap[
        (raw.paymentMethod ?? raw.paymentStatus ?? "").toLowerCase()
      ] ?? "Cash on Delivery",
    status: statusMap[(raw.orderStatus ?? "").toLowerCase()] ?? "Pending",
    gstStatus: row.gstStatus?.toLowerCase() === "filed" ? "Filed" : "Not Filed",
  };
}

// ─── Mock actions ─────────────────────────────────────────────────────────────
const copyToClipboard = async (text: string) => {
  try {
    if (Platform.OS === "web" && navigator?.clipboard) {
      await navigator.clipboard.writeText(text);
    }
    Alert.alert("Copied", `${text} copied to clipboard`);
  } catch {
    Alert.alert("Copied", `${text} copied to clipboard`);
  }
};

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 19A8 8 0 1 0 11 3a8 8 0 0 0 0 16ZM21 21l-4.35-4.35"
      stroke={C.textLight}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
const GridIcon = ({ active }: { active: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="3"
      width="7"
      height="7"
      rx="1"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
    />
    <Rect
      x="14"
      y="3"
      width="7"
      height="7"
      rx="1"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
    />
    <Rect
      x="3"
      y="14"
      width="7"
      height="7"
      rx="1"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
    />
    <Rect
      x="14"
      y="14"
      width="7"
      height="7"
      rx="1"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
    />
  </Svg>
);
const ListIcon = ({ active }: { active: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Line
      x1="8"
      y1="6"
      x2="21"
      y2="6"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="8"
      y1="12"
      x2="21"
      y2="12"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="8"
      y1="18"
      x2="21"
      y2="18"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="6"
      x2="3.01"
      y2="6"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="12"
      x2="3.01"
      y2="12"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="18"
      x2="3.01"
      y2="18"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
const SortIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M7 12h10M11 18h2"
      stroke={C.navy}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
const ExportIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      stroke={C.white}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="7 10 12 15 17 10"
      stroke={C.white}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M12 15V3" stroke={C.white} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const ChevronDownIcon = ({
  color = C.textLight,
  size = 14,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9l6 6 6-6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const ChevronLeftIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const ChevronRightIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const EyeIcon = ({ color = C.white }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
  </Svg>
);
const CopyIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Rect
      x="9"
      y="9"
      width="13"
      height="13"
      rx="2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const PrintIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Polyline
      points="6 9 6 2 18 2 18 9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect
      x="6"
      y="14"
      width="12"
      height="8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const InvoiceIcon = ({ color = C.navy }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="14 2 14 8 20 8"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 13h8M8 17h5"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
    />
  </Svg>
);
const FileIcon = ({ color = C.navy }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="14 2 14 8 20 8"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const TruckIcon = ({ color = C.orange }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Rect
      x="1"
      y="3"
      width="15"
      height="13"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 8h4l3 3v5h-7V8z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth={1.8} />
    <Circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth={1.8} />
  </Svg>
);
const CheckIcon = ({ color = C.green }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="22 4 12 14.01 9 11.01"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const ShopIcon = ({ color = C.orange }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 6h18M16 10a4 4 0 0 1-8 0"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const UserIcon = ({ color = C.textLight }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.8} />
  </Svg>
);
const CalendarIcon = ({
  color = C.textLight,
  size = 16,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      stroke={color}
      strokeWidth={1.6}
    />
    <Path
      d="M16 2v4M8 2v4M3 10h18"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);
const MoreIcon = ({
  color = C.textMid,
  bold = false,
}: {
  color?: string;
  bold?: boolean;
}) => (
  <Svg
    width={bold ? 18 : 16}
    height={bold ? 18 : 16}
    viewBox="0 0 24 24"
    fill="none"
  >
    <Circle cx="12" cy="5" r={bold ? 2.2 : 1} fill={color} />
    <Circle cx="12" cy="12" r={bold ? 2.2 : 1} fill={color} />
    <Circle cx="12" cy="19" r={bold ? 2.2 : 1} fill={color} />
  </Svg>
);
const CloseIcon = ({
  color = C.textMid,
  size = 18,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
const DownloadIcon = ({
  color = C.green,
  size = 16,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="7 10 12 15 17 10"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M12 15V3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const OrderBoxIcon = ({
  color = C.white,
  size = 16,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="3.27 6.96 12 12.01 20.73 6.96"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 22.08V12"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);
const QrPlaceholderIcon = ({ size = 70 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="2"
      width="7"
      height="7"
      stroke={C.textDark}
      strokeWidth={1.4}
    />
    <Rect
      x="15"
      y="2"
      width="7"
      height="7"
      stroke={C.textDark}
      strokeWidth={1.4}
    />
    <Rect
      x="2"
      y="15"
      width="7"
      height="7"
      stroke={C.textDark}
      strokeWidth={1.4}
    />
    <Rect x="4.3" y="4.3" width="2.4" height="2.4" fill={C.textDark} />
    <Rect x="17.3" y="4.3" width="2.4" height="2.4" fill={C.textDark} />
    <Rect x="4.3" y="17.3" width="2.4" height="2.4" fill={C.textDark} />
    <Rect x="12" y="2" width="2" height="2" fill={C.textDark} />
    <Rect x="12" y="6" width="2" height="2" fill={C.textDark} />
    <Rect x="12" y="12" width="2" height="2" fill={C.textDark} />
    <Rect x="16" y="12" width="2" height="2" fill={C.textDark} />
    <Rect x="20" y="12" width="2" height="2" fill={C.textDark} />
    <Rect x="12" y="16" width="2" height="2" fill={C.textDark} />
    <Rect x="12" y="20" width="2" height="2" fill={C.textDark} />
    <Rect x="16" y="20" width="2" height="2" fill={C.textDark} />
    <Rect x="20" y="16" width="2" height="2" fill={C.textDark} />
  </Svg>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const c = STATUS_CFG[status];
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: c.dot }]} />
      <Text style={[s.badgeText, { color: c.text }]}>{status}</Text>
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
  const filed = status === "Filed";
  const pill = (
    <View style={[s.gstBadge, filed ? s.gstBadgeFiled : s.gstBadgePending]}>
      <View
        style={[s.gstDot, { backgroundColor: filed ? C.green : C.yellow }]}
      />
      <Text
        style={[s.gstBadgeText, { color: filed ? "#15803D" : "#B45309" }]}
        numberOfLines={1}
      >
        {filed ? "GST Filed" : "GST Pending"}
      </Text>
    </View>
  );
  if (filed) return pill;
  return (
    <TouchableOpacity onPress={onMark} activeOpacity={0.75}>
      {pill}
    </TouchableOpacity>
  );
};

// ─── Sort Modal ───────────────────────────────────────────────────────────────
const SortModal = ({
  visible,
  isWeb,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  isWeb: boolean;
  current: SortOption;
  onSelect: (s: SortOption) => void;
  onClose: () => void;
}) => {
  if (!visible) return null;

  const content = (
    <View style={[s.sortMenu, isWeb && s.sortMenuWeb]}>
      <View style={s.sortHeader}>
        <Text style={s.sortTitle}>Sort Orders</Text>
        {isWeb && (
          <TouchableOpacity
            onPress={onClose}
            style={s.sortDismiss}
            activeOpacity={0.7}
          >
            <CloseIcon />
          </TouchableOpacity>
        )}
      </View>
      {SORT_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[s.sortItem, current === opt.key && s.sortItemActive]}
          onPress={() => {
            onSelect(opt.key);
            onClose();
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              s.sortItemText,
              current === opt.key && s.sortItemTextActive,
            ]}
          >
            {opt.label}
          </Text>
          {current === opt.key && (
            <View style={s.sortCheck}>
              <CheckIcon color={C.white} />
            </View>
          )}
        </TouchableOpacity>
      ))}
      {!isWeb && (
        <TouchableOpacity
          style={s.sortCancelBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={s.sortCancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isWeb) {
    return (
      <View style={s.sortOverlayWeb}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {content}
      </View>
    );
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.sortOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {content}
      </View>
    </Modal>
  );
};

// ─── Payment Filter Modal (mirrors SortModal exactly) ────────────────────────
const PaymentModal = ({
  visible,
  isWeb,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  isWeb: boolean;
  current: string;
  onSelect: (p: string) => void;
  onClose: () => void;
}) => {
  if (!visible) return null;

  const content = (
    <View style={[s.sortMenu, isWeb && s.sortMenuWeb]}>
      <View style={s.sortHeader}>
        <Text style={s.sortTitle}>Filter by Payment</Text>
        {isWeb && (
          <TouchableOpacity
            onPress={onClose}
            style={s.sortDismiss}
            activeOpacity={0.7}
          >
            <CloseIcon />
          </TouchableOpacity>
        )}
      </View>
      {PAYMENT_FILTERS.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[s.sortItem, current === opt && s.sortItemActive]}
          onPress={() => {
            onSelect(opt);
            onClose();
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[s.sortItemText, current === opt && s.sortItemTextActive]}
          >
            {opt}
          </Text>
          {current === opt && (
            <View style={s.sortCheck}>
              <CheckIcon color={C.white} />
            </View>
          )}
        </TouchableOpacity>
      ))}
      {!isWeb && (
        <TouchableOpacity
          style={s.sortCancelBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={s.sortCancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isWeb) {
    return (
      <View style={s.sortOverlayWeb}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {content}
      </View>
    );
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.sortOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {content}
      </View>
    </Modal>
  );
};

// ─── Action Menu (RE-THEMED: navy header + orange accents + close button) ────
// Merged "Print Order" / "Export PDF" into the two Generate actions below,
// since each document modal carries its own Print control.
const ActionMenu = ({
  order,
  visible,
  onClose,
  onView,
  onGST,
  onOpenDoc,
  isWeb,
}: {
  order: Order;
  visible: boolean;
  onClose: () => void;
  onView: (o: Order) => void;
  onGST: (id: string) => void;
  onOpenDoc: (o: Order, type: "invoice" | "label") => void;
  isWeb: boolean;
}) => {
  if (!visible) return null;

  const actions = [
    {
      label: "View Details",
      icon: <EyeIcon color={C.navy} />,
      onPress: () => {
        onClose();
        onView(order);
      },
    },
    {
      label: "Copy Order ID",
      icon: <CopyIcon />,
      onPress: () => {
        copyToClipboard(order.orderNumber);
        onClose();
      },
    },
    {
      label: "Generate Invoice",
      sub: "Preview & print invoice",
      icon: <InvoiceIcon />,
      onPress: () => {
        onOpenDoc(order, "invoice");
        onClose();
      },
    },
    {
      label: "Generate Shipping Label",
      sub: "Preview & print label",
      icon: <TruckIcon />,
      onPress: () => {
        onOpenDoc(order, "label");
        onClose();
      },
    },
    ...(order.gstStatus !== "Filed"
      ? [
          {
            label: "Mark GST Filed",
            icon: <CheckIcon color={C.orange} />,
            onPress: () => {
              onGST(order.id);
              onClose();
            },
          },
        ]
      : []),
  ];

  const menu = (
    <View style={[s.actionMenu, isWeb && s.actionMenuWeb]}>
      <View style={s.menuHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.menuTitle}>ORDER ACTIONS</Text>
          <Text style={s.menuSubtitle}>{order.orderNumber}</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={s.menuCloseBtn}
          activeOpacity={0.75}
        >
          <CloseIcon color={C.white} size={16} />
        </TouchableOpacity>
      </View>

      {actions.map((a, i) => (
        <TouchableOpacity
          key={i}
          style={s.actionItem}
          onPress={a.onPress}
          activeOpacity={0.7}
        >
          <View style={s.actionItemIcon}>{a.icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={s.actionItemText}>{a.label}</Text>
            {a.sub ? <Text style={s.actionItemSub}>{a.sub}</Text> : null}
          </View>
        </TouchableOpacity>
      ))}

      {!isWeb && (
        <TouchableOpacity
          style={s.actionDismissBtn}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text style={s.actionDismissText}>Dismiss</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isWeb) {
    return (
      <View style={s.actionOverlayWeb}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {menu}
      </View>
    );
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.actionOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {menu}
      </View>
    </Modal>
  );
};

// ─── Shipping Label Modal (native RN, replicates uploaded label PDF) ─────────
// Footer: exactly 2 buttons — Print, Close.
const ShippingLabelModal = ({
  order,
  visible,
  onClose,
}: {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
}) => {
  const { width } = useWindowDimensions();
  const sheetWidth = Math.min(width - 32, 460);

  if (!order) return null;
  const firstGroup = order.sellerGroups[0];
  const trackingId = firstGroup?.trackingId ?? "1405571400";
  const invoiceNum = `INV-${order.orderNumber.replace(/\D/g, "")}`;

  const handlePrint = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
    } else {
      Alert.alert("Print", `Sending ${order.orderNumber} label to printer`);
    }
  };

  // Deterministic bar pattern from order number — visual only, not scannable
  const bars = useMemo(() => {
    let seed = 0;
    for (const ch of order.orderNumber)
      seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
    return Array.from({ length: 26 }, () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return 30 + (seed % 70);
    });
  }, [order.orderNumber]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={s.docScreen}>
        <View style={s.docTopBar}>
          <Text style={s.docTopBarTitle}>Shipping Label</Text>
          <TouchableOpacity
            onPress={onClose}
            style={s.docTopClose}
            activeOpacity={0.75}
          >
            <CloseIcon color={C.navy} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.docScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.labelSheet, { width: sheetWidth }]}>
            {/* Brand header */}
            <View style={s.labelBrandHeader}>
              <View style={s.labelBrandRow}>
                <View style={s.labelBrandMark}>
                  <Text style={s.labelBrandMarkText}>F&T</Text>
                </View>
                <View>
                  <Text style={s.labelBrandName}>
                    <Text style={{ color: C.navy }}>FLINT</Text>
                    <Text style={{ color: C.textDark }}> & </Text>
                    <Text style={{ color: C.orange }}>THREAD</Text>
                  </Text>
                  <Text style={s.labelBrandTag}>The Infinity and Vanguard</Text>
                </View>
              </View>
              <Text style={s.labelTitleText}>SHIPPING LABEL</Text>
            </View>

            {/* Courier / AWB block */}
            <View style={s.labelCourierBlock}>
              <View style={s.labelCourierTop}>
                <Text style={s.labelCourierLabel}>Courier</Text>
                <View style={s.labelGstChip}>
                  <Text style={s.labelGstChipText}>GST: 36BASPA3241G1ZW</Text>
                </View>
              </View>
              <View style={s.labelAwbArea}>
                <View style={s.labelAwbLeft}>
                  <Text style={s.labelAwbCaption}>AWB NUMBER</Text>
                  <View style={s.barcodeRow}>
                    {bars.map((h, i) => (
                      <View
                        key={i}
                        style={[s.barcodeBar, { height: `${h}%` }]}
                      />
                    ))}
                  </View>
                  <Text style={s.labelAwbNumber}>{trackingId}</Text>
                </View>
                <View style={s.labelQrBox}>
                  <QrPlaceholderIcon size={56} />
                </View>
              </View>
            </View>

            {/* Ship to */}
            <View style={s.labelSection}>
              <Text style={s.labelSectionLabel}>SHIP TO</Text>
              <Text style={s.labelShipName}>{order.customer.name}</Text>
              <Text style={s.labelShipAddress}>
                Address on file · {order.customer.email}
              </Text>
            </View>

            {/* Meta grid */}
            <View style={s.labelMetaGrid}>
              <View style={s.labelMetaItem}>
                <Text style={s.labelMetaK}>Order #</Text>
                <Text style={s.labelMetaV}>{order.orderNumber}</Text>
              </View>
              <View style={s.labelMetaItem}>
                <Text style={s.labelMetaK}>Invoice</Text>
                <Text style={s.labelMetaV}>{invoiceNum}</Text>
              </View>
              <View style={s.labelMetaItem}>
                <Text style={s.labelMetaK}>Date</Text>
                <Text style={s.labelMetaV}>{order.date}</Text>
              </View>
              <View style={s.labelMetaItem}>
                <Text style={s.labelMetaK}>Payment</Text>
                <Text style={s.labelMetaV}>{order.paymentType}</Text>
              </View>
            </View>

            {/* Product table */}
            <View>
              <View style={s.labelProductHead}>
                <Text style={[s.labelProductHeadText, { flex: 2.2 }]}>
                  Item
                </Text>
                <Text
                  style={[
                    s.labelProductHeadText,
                    { flex: 0.6, textAlign: "right" },
                  ]}
                >
                  Qty
                </Text>
                <Text
                  style={[
                    s.labelProductHeadText,
                    { flex: 1, textAlign: "right" },
                  ]}
                >
                  Total
                </Text>
              </View>
              {firstGroup?.products.map((p, i) => (
                <View
                  key={p.id}
                  style={[
                    s.labelProductRow,
                    i === firstGroup.products.length - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <Text
                    style={[s.labelProductName, { flex: 2.2 }]}
                    numberOfLines={2}
                  >
                    {p.name}
                  </Text>
                  <Text style={[s.labelProductNum, { flex: 0.6 }]}>1</Text>
                  <Text style={[s.labelProductNum, { flex: 1 }]}>
                    {fmtCur(p.price ?? 0)}
                  </Text>
                </View>
              ))}
              <View style={s.labelTotalsRow}>
                <Text style={s.labelTotalsLabel}>TOTAL:</Text>
                <Text style={s.labelTotalsValue}>{fmtCur(order.amount)}</Text>
              </View>
            </View>

            {/* Return address */}
            <View style={s.labelSection}>
              <Text style={s.labelSectionLabel}>RETURN ADDRESS</Text>
              <View style={s.labelReturnRow}>
                <Text style={s.labelReturnName}>
                  {firstGroup?.seller.name ?? "Seller"}
                </Text>
                <View style={s.labelReturnGstChip}>
                  <Text style={s.labelReturnGstText}>GST: 36BASPA3241G1ZW</Text>
                </View>
              </View>
              <Text style={s.labelReturnAddr}>
                Registered seller address on file
              </Text>
            </View>

            {/* Footer note */}
            <View style={s.labelFooterNote}>
              <Text style={s.labelFooterGst}>
                GST: CGST ₹1,274.71 + SGST ₹1,274.71 = ₹2,549.43
              </Text>
              <Text style={s.labelFooterAuto}>
                AUTO-GENERATED LABEL · NO SIGNATURE REQUIRED
              </Text>
              <Text style={s.labelFooterPowered}>
                Powered by{" "}
                <Text style={{ color: C.navy, fontWeight: "800" }}>
                  Flint & Thread
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Exactly 2 buttons: Print, Close */}
        <View style={s.docActionBar}>
          <TouchableOpacity
            style={s.docBtnPrint}
            onPress={handlePrint}
            activeOpacity={0.85}
          >
            <PrintIcon color={C.white} />
            <Text style={s.docBtnPrintText}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.docBtnClose}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <CloseIcon color={C.navy} size={15} />
            <Text style={s.docBtnCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Invoice Modal (native RN, replicates uploaded invoice PDF) ─────────────
// Per spec: invoice has no Print/Close footer buttons — pure document view,
// dismissible via the top-bar close icon only.
const InvoiceModal = ({
  order,
  visible,
  onClose,
}: {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
}) => {
  const { width } = useWindowDimensions();
  const sheetWidth = Math.min(width - 32, 760);

  if (!order) return null;
  const firstGroup = order.sellerGroups[0];
  const invoiceNum = `INV-${order.orderNumber.replace(/\D/g, "")}`;
  const subtotal = order.amount;
  const isPaid = order.status === "Completed";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={s.docScreen}>
        <View style={s.docTopBar}>
          <Text style={s.docTopBarTitle}>Invoice</Text>
          <TouchableOpacity
            onPress={onClose}
            style={s.docTopClose}
            activeOpacity={0.75}
          >
            <CloseIcon color={C.navy} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.docScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.invoiceSheet, { width: sheetWidth }]}>
            {/* Top header */}
            <View style={s.invTopHeader}>
              <View style={s.invBrandRow}>
                <View style={s.invBrandMark}>
                  <Text style={s.invBrandMarkText}>F&T</Text>
                </View>
                <View>
                  <Text style={s.invBrandName}>
                    <Text style={{ color: C.navy }}>FLINT</Text>
                    <Text style={{ color: C.textDark }}> & </Text>
                    <Text style={{ color: C.orange }}>THREAD</Text>
                  </Text>
                  <Text style={s.invBrandTag}>The Infinity and Vanguard</Text>
                </View>
              </View>
              <View style={s.invMetaCol}>
                <Text style={s.invTitle}>INVOICE</Text>
                <Text style={s.invMetaLine}>{invoiceNum}</Text>
                <Text style={s.invMetaLineMuted}>
                  Order: {order.orderNumber}
                </Text>
                <Text style={s.invMetaLineMuted}>Date: {order.date}</Text>
              </View>
            </View>

            {/* Sender */}
            <View style={s.invSenderBlock}>
              <Text style={s.invSenderName}>
                Flint & Thread (India) Pvt. Ltd.
              </Text>
              <Text style={s.invSenderLine}>
                support@flintnthread.in · GSTIN 36AAGCF5402J1ZP
              </Text>
            </View>

            {/* Sold by */}
            <View style={s.invSection}>
              <Text style={s.invSectionLabelNavy}>SOLD BY</Text>
              <Text style={s.invBoldName}>
                {firstGroup?.seller.name ?? "Unknown Seller"}
              </Text>
              <Text style={s.invMutedLine}>Seller details on file</Text>
            </View>

            {/* Bill / Ship */}
            <View style={s.invBsGrid}>
              <View style={s.invBsCol}>
                <Text style={s.invSectionLabelOrange}>BILL TO</Text>
                <Text style={s.invBoldName}>{order.customer.name}</Text>
                <Text style={s.invMutedLine}>{order.customer.email}</Text>
              </View>
              <View style={s.invBsCol}>
                <Text style={s.invSectionLabelOrange}>SHIP TO</Text>
                <Text style={s.invBoldName}>{order.customer.name}</Text>
                <Text style={s.invMutedLine}>{order.customer.email}</Text>
              </View>
            </View>

            {/* Items table */}
            <View style={s.invTable}>
              <View style={s.invTableHead}>
                <Text style={[s.invTh, { flex: 2.4 }]}>Item</Text>
                <Text style={[s.invTh, { flex: 0.6, textAlign: "right" }]}>
                  Qty
                </Text>
                <Text style={[s.invTh, { flex: 1, textAlign: "right" }]}>
                  Price
                </Text>
                <Text style={[s.invTh, { flex: 1, textAlign: "right" }]}>
                  Total
                </Text>
              </View>
              {firstGroup?.products.map((p, i) => (
                <View
                  key={p.id}
                  style={[s.invTr, i % 2 === 1 && { backgroundColor: C.bg }]}
                >
                  <Text style={[s.invTdName, { flex: 2.4 }]} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <Text style={[s.invTdNum, { flex: 0.6 }]}>1</Text>
                  <Text style={[s.invTdNum, { flex: 1 }]}>
                    {fmtCur(p.price ?? 0)}
                  </Text>
                  <Text style={[s.invTdNum, { flex: 1, fontWeight: "800" }]}>
                    {fmtCur(p.price ?? 0)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={s.invTotalsWrap}>
              <View style={s.invTotalsBox}>
                <View style={s.invTotalsLine}>
                  <Text style={s.invTotalsLabel}>Subtotal</Text>
                  <Text style={s.invTotalsValue}>{fmtCur(subtotal)}</Text>
                </View>
                <View style={s.invTotalsLine}>
                  <Text style={s.invTotalsLabel}>Shipping</Text>
                  <Text
                    style={[
                      s.invTotalsValue,
                      { color: C.green, fontWeight: "800" },
                    ]}
                  >
                    FREE
                  </Text>
                </View>
                <View style={s.invGrandLine}>
                  <Text style={s.invGrandLabel}>Grand Total</Text>
                  <Text style={s.invGrandValue}>{fmtCur(subtotal)}</Text>
                </View>
              </View>
            </View>

            {/* GST breakdown */}
            <View style={s.invGstBlock}>
              <Text style={s.invGstTitle}>GST Breakdown Summary</Text>
              <View style={s.invGstLine}>
                <Text style={s.invGstK}>Total GST</Text>
                <Text style={s.invGstV}>Included in price</Text>
              </View>
              <Text style={s.invGstNote}>
                *GST details available on the seller invoice
              </Text>
            </View>

            {/* Payment info */}
            <View style={s.invPaymentBlock}>
              <Text style={s.invPaymentTitle}>Payment Information</Text>
              <Text style={s.invPaymentLine}>
                Payment Method: {order.paymentType}
              </Text>
              <View style={s.invPaymentStatusRow}>
                <Text style={s.invPaymentLine}>Payment Status: </Text>
                <View
                  style={[
                    s.invPayChip,
                    isPaid ? s.invPayChipPaid : s.invPayChipPending,
                  ]}
                >
                  <Text
                    style={[
                      s.invPayChipText,
                      { color: isPaid ? C.green : C.orange },
                    ]}
                  >
                    {isPaid ? "PAID" : "PENDING"}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={s.invDocFooter}>
              This is a system-generated invoice and does not require a
              signature.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─── Product Summary (grid card) ──────────────────────────────────────────────
const ProductSummary = ({
  order,
  onView,
}: {
  order: Order;
  onView: (o: Order) => void;
}) => {
  const groups = order.sellerGroups;
  const isMultiSeller = groups.length > 1;
  const firstGroup = groups[0];
  const primary = firstGroup?.products[0];
  const itemCount = firstGroup?.products.length ?? 0;

  const metaString = firstGroup
    ? [
        firstGroup.seller.name,
        `${itemCount} item${itemCount !== 1 ? "s" : ""}`,
        isMultiSeller
          ? `+${groups.length - 1} seller${groups.length > 2 ? "s" : ""}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Seller details unavailable";

  return (
    <View style={s.prodSection}>
      {primary?.image ? (
        <Image
          source={{ uri: primary.image }}
          style={s.prodThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={s.prodThumbEmpty}>
          <ShopIcon color={C.textLight} />
        </View>
      )}
      <View style={s.prodInfo}>
        <Text style={s.prodName} numberOfLines={1}>
          {primary?.name || "Untitled product"}
        </Text>
        <Text style={s.prodMeta} numberOfLines={1}>
          {metaString}
        </Text>
      </View>
    </View>
  );
};

// ─── Grid Order Card ──────────────────────────────────────────────────────────
const GridOrderCard = ({
  order,
  onView,
  onGST,
  onMore,
  isWeb,
}: {
  order: Order;
  onView: (o: Order) => void;
  onGST: (id: string) => void;
  onMore: (o: Order) => void;
  isWeb: boolean;
}) => {
  const cfg = STATUS_CFG[order.status];

  return (
    <View style={[s.gridCard, isWeb && s.gridCardWeb]}>
      <View style={[s.cardAccent, { backgroundColor: cfg.dot }]} />

      <View style={s.gridCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={s.orderIdRow}>
            <Text style={s.gridOrderNum} numberOfLines={1}>
              {order.orderNumber}
            </Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(order.orderNumber)}
              style={s.copyBtn}
              activeOpacity={0.7}
            >
              <CopyIcon color={C.textLight} />
            </TouchableOpacity>
          </View>
          <View style={s.metaRow}>
            <CalendarIcon />
            <Text style={s.metaText}> {order.date}</Text>
            {order.time ? (
              <Text style={s.metaText}> · {order.time}</Text>
            ) : null}
          </View>
        </View>
        <View style={s.headerRight}>
          <StatusBadge status={order.status} />
          <TouchableOpacity
            onPress={() => onMore(order)}
            style={s.moreBtn}
            activeOpacity={0.7}
          >
            <MoreIcon bold />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.divider} />

      <ProductSummary order={order} onView={onView} />

      <View style={s.divider} />

      <View style={s.customerRow}>
        <View style={s.customerRowLeft}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{getInitials(order.customer.name)}</Text>
          </View>
          <Text style={s.customerName} numberOfLines={1}>
            {order.customer.name}
          </Text>
        </View>
        <Text style={s.amountVal} numberOfLines={1}>
          {fmtCur(order.amount)}
        </Text>
      </View>

      <View style={s.cardFooter}>
        <GSTBadge status={order.gstStatus} onMark={() => onGST(order.id)} />
        <TouchableOpacity
          style={s.ctaRow}
          onPress={() => onView(order)}
          activeOpacity={0.7}
        >
          <Text style={s.ctaText}>View Details</Text>
          <ChevronRightIcon color={C.blue} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── List Table Row ───────────────────────────────────────────────────────────
const ListTableRow = ({
  order,
  idx,
  onView,
  onGST,
}: {
  order: Order;
  idx: number;
  onView: (o: Order) => void;
  onGST: (id: string) => void;
}) => (
  <View style={[s.tRow, idx % 2 === 1 && s.tRowAlt]}>
    <View style={[s.tcell, s.colOrder]}>
      <View style={s.orderIdRow}>
        <Text style={s.tdOrderNum} numberOfLines={1}>
          {order.orderNumber}
        </Text>
        <TouchableOpacity
          onPress={() => copyToClipboard(order.orderNumber)}
          activeOpacity={0.7}
        >
          <CopyIcon color={C.textLight} />
        </TouchableOpacity>
      </View>
      <View style={s.metaRow}>
        <CalendarIcon />
        <Text style={s.metaText}> {order.date}</Text>
      </View>
    </View>

    <View style={[s.tcell, s.colCustomer]}>
      <View style={s.customerRowInner}>
        <View style={s.avatarSm}>
          <Text style={s.avatarSmText}>{getInitials(order.customer.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.tdName} numberOfLines={1}>
            {order.customer.name}
          </Text>
          <Text style={s.tdEmail} numberOfLines={1}>
            {order.customer.email}
          </Text>
        </View>
      </View>
    </View>

    <View style={[s.tcell, s.colSeller]}>
      {order.sellerGroups.length === 0 ? (
        <Text style={s.tdMuted}>—</Text>
      ) : (
        order.sellerGroups.map((g, i) => (
          <View
            key={i}
            style={[
              i > 0 && {
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: C.border,
              },
            ]}
          >
            <Text style={s.tdSellerName} numberOfLines={1}>
              {g.seller.name}
            </Text>
            {g.subOrderId && (
              <Text style={s.tdMuted} numberOfLines={1}>
                #{g.subOrderId}
              </Text>
            )}
          </View>
        ))
      )}
    </View>

    <View style={[s.tcell, s.colProducts]}>
      {order.sellerGroups.length === 0 ? (
        <Text style={s.tdMuted}>—</Text>
      ) : (
        order.sellerGroups.map((g, gi) => {
          const primary = g.products[0];
          return (
            <View
              key={gi}
              style={[s.tableProductRow, gi > 0 && { marginTop: 8 }]}
            >
              {primary?.image ? (
                <Image
                  source={{ uri: primary.image }}
                  style={s.tableThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={s.tableThumbEmpty} />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.tdProductName} numberOfLines={1}>
                  {primary?.name || "—"}
                </Text>
                {g.products.length > 1 && (
                  <Text style={s.tdMuted}>{g.products.length} Items</Text>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>

    <View style={[s.tcell, s.colAmount]}>
      <Text style={s.tdAmount}>{fmtCur(order.amount)}</Text>
      <Text style={s.tdPayment} numberOfLines={1}>
        {order.paymentType}
      </Text>
    </View>

    <View style={[s.tcell, s.colStatus]}>
      <StatusBadge status={order.status} />
    </View>

    <View style={[s.tcell, s.colGst]}>
      <GSTBadge status={order.gstStatus} onMark={() => onGST(order.id)} />
    </View>

    <View style={[s.tcell, s.colDocs]}>
      {order.sellerGroups.map((g, i) => (
        <View key={i} style={[s.tableDocRow, i > 0 && { marginTop: 4 }]}>
          <TouchableOpacity style={s.tableDocBtn} activeOpacity={0.75}>
            <FileIcon color={C.navy} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tableDocBtn, { borderColor: "#FED7AA" }]}
            activeOpacity={0.75}
          >
            <TruckIcon color={C.orange} />
          </TouchableOpacity>
        </View>
      ))}
    </View>

    <View style={[s.tcell, s.colAction]}>
      <View style={s.tableActions}>
        <TouchableOpacity
          style={s.viewBtnSm}
          onPress={() => onView(order)}
          activeOpacity={0.85}
        >
          <EyeIcon color={C.white} />
          <Text style={s.viewBtnSmText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  )
    pages.push(p);
  if (current < total - 2) pages.push("…");
  if (total > 1) pages.push(total);
  return pages;
}

const PaginationBar = ({
  page,
  total,
  rangeStart,
  rangeEnd,
  totalElements,
  onPrev,
  onNext,
  onPage,
}: {
  page: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  totalElements: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}) => (
  <View style={s.pagination}>
    <Text style={s.paginationInfo}>
      Showing {rangeStart}–{rangeEnd} of {totalElements} orders
    </Text>
    {total > 1 && (
      <View style={s.paginationControls}>
        <TouchableOpacity
          style={[s.pageBtn, page <= 1 && s.pageBtnOff]}
          onPress={onPrev}
          disabled={page <= 1}
        >
          <ChevronLeftIcon color={page <= 1 ? C.textLight : C.textMid} />
        </TouchableOpacity>
        {buildPages(page, total).map((num, i) =>
          num === "…" ? (
            <Text key={`e-${i}`} style={s.pageEllipsis}>
              …
            </Text>
          ) : (
            <TouchableOpacity
              key={num}
              style={[s.pageBtn, num === page && s.pageBtnActive]}
              onPress={() => onPage(num as number)}
            >
              <Text
                style={[s.pageBtnText, num === page && s.pageBtnTextActive]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ),
        )}
        <TouchableOpacity
          style={[s.pageBtn, page >= total && s.pageBtnOff]}
          onPress={onNext}
          disabled={page >= total}
        >
          <ChevronRightIcon color={page >= total ? C.textLight : C.textMid} />
        </TouchableOpacity>
      </View>
    )}
  </View>
);

// ─── Responsive grid helpers ──────────────────────────────────────────────────
const GRID_GUTTER = 16;

function getColumnCount(width: number): number {
  if (width >= 1440) return 4;
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;
  const isMobile = width < 480;
  const columnCount = getColumnCount(width);
  const px = isMobile ? 14 : isWeb ? 28 : 20;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState("");
  const params = useLocalSearchParams<{ status?: string }>();
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    if (params.status) {
      setStatusFilter(params.status);
    }
  }, [params.status]);
  const [paymentFilter, setPaymentFilter] = useState("All Payments");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortVisible, setSortVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<Order | null>(null);

  // Invoice / Shipping Label modal state
  const [docModal, setDocModal] = useState<DocModalType>(null);
  const [docOrder, setDocOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchOrders({
        page: currentPage - 1,
        size: ORDERS_PAGE_SIZE,
      });
      setOrders(page.items.map((item) => toUiOrder(mapOrderRow(item), item)));
      setTotalElements(page.totalElements);
      setTotalPages(page.totalPages);
      if (currentPage > page.totalPages && page.totalPages > 0)
        setCurrentPage(page.totalPages);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const router = useRouter();

  const handleView = useCallback(
    (o: Order) => {
      router.push({ pathname: "/orderDetails", params: { orderId: o.id } });
    },
    [router],
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

  const handleOpenDoc = useCallback(
    (order: Order, type: "invoice" | "label") => {
      setDocOrder(order);
      setDocModal(type);
    },
    [],
  );

  const handleCloseDoc = useCallback(() => {
    setDocModal(null);
    setDocOrder(null);
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = [
      "Order #",
      "Date",
      "Customer",
      "Email",
      "Amount",
      "Payment",
      "Status",
      "GST",
    ];
    const rows = filtered.map((o) => [
      o.orderNumber,
      o.date,
      o.customer.name,
      o.customer.email,
      o.amount,
      o.paymentType,
      o.status,
      o.gstStatus,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orders.csv";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert("Export", "CSV exported successfully");
    }
  }, []);

  const filtered = useMemo(() => {
    let result = orders.filter((o) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || o.status === statusFilter;
      const matchPayment =
        paymentFilter === "All Payments" || o.paymentType === paymentFilter;
      return matchSearch && matchStatus && matchPayment;
    });

    result = [...result].sort((a, b) => {
      if (sortOption === "amount_high") return b.amount - a.amount;
      if (sortOption === "amount_low") return a.amount - b.amount;
      if (sortOption === "oldest") return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date);
    });

    return result;
  }, [orders, search, statusFilter, paymentFilter, sortOption]);

  const rangeStart =
    totalElements === 0 ? 0 : (currentPage - 1) * ORDERS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * ORDERS_PAGE_SIZE, totalElements);

  const thisMonth = orders.filter((o) => {
    const d = new Date(o.date);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;
  const monthRevenue = orders
    .filter((o) => {
      const d = new Date(o.date);
      const now = new Date();
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, o) => sum + o.amount, 0);
  const pendingPayment = orders.filter((o) => o.status === "Pending").length;

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.key === sortOption)?.label ?? "Newest First";

  const cardWidthPercent = useMemo(() => {
    if (columnCount <= 1) return undefined;
    const totalGutter = GRID_GUTTER * (columnCount - 1);
    return `calc((100% - ${totalGutter}px) / ${columnCount})` as unknown as number;
  }, [columnCount]);

  // ── Stat card data — now rendered as overlapping cards under the header ────
  const statCards = [
    {
      label: "Total Orders",
      value: String(totalElements),
      icon: <OrderBoxIcon color={C.navy} />,
      iconBg: "rgba(30,43,107,0.08)",
      valueColor: C.navy,
    },
    {
      label: "This Month",
      value: String(thisMonth),
      icon: <CalendarIcon color={C.teal} />,
      iconBg: "#ECFEFF",
      valueColor: C.teal,
    },
    {
      label: "Monthly Revenue",
      value: fmtCur(monthRevenue),
      icon: <DownloadIcon color={C.green} />,
      iconBg: C.greenPale,
      valueColor: C.green,
    },
    {
      label: "Pending Payment",
      value: String(pendingPayment),
      icon: <ChevronRightIcon color={C.orange} />,
      iconBg: C.orangePale,
      valueColor: C.orange,
    },
  ];

  return (
    <AdminLayout>
      <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header — floats with side margins, rounded on all 4 corners ── */}
          <View
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: 1600,
              paddingHorizontal: px,
            }}
          >
            <View
              style={[
                s.headerBlock,
                {
                  paddingTop: Platform.OS === "ios" ? 50 : 20,
                  marginTop: isMobile ? 12 : 18,
                },
              ]}
            >
              <View
                style={[s.headerTop, { paddingHorizontal: isMobile ? 16 : 22 }]}
              >
                <View style={s.headerLeft}>
                  <View style={s.headerIcon}>
                    <OrderBoxIcon color={C.white} />
                  </View>
                  <View>
                    <Text
                      style={[s.headerTitle, { fontSize: isMobile ? 16 : 20 }]}
                    >
                      Orders Management
                    </Text>
                    <Text style={s.headerSub}>
                      Manage and track all customer orders
                    </Text>
                  </View>
                </View>
                <View style={s.headerActions}>
                  <TouchableOpacity
                    style={s.exportBtn}
                    onPress={handleExportCSV}
                    activeOpacity={0.85}
                  >
                    <ExportIcon />
                    {!isMobile && (
                      <Text style={s.exportBtnText}>Export CSV</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── Overlapping stat cards ── */}
            <View
              style={[
                s.statCardsWrap,
                { paddingHorizontal: 10 },
                isMobile && s.statCardsWrapMobile,
              ]}
            >
              {statCards.map((stat, i) => (
                <View key={i} style={s.statCard}>
                  <View
                    style={[s.statIconBox, { backgroundColor: stat.iconBg }]}
                  >
                    {stat.icon}
                  </View>
                  <Text
                    style={[s.statValue, { color: stat.valueColor }]}
                    numberOfLines={1}
                  >
                    {stat.value}
                  </Text>
                  <Text style={s.statLabel} numberOfLines={1}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Filter pills (moved out of the header, into the toolbar area) ── */}
          <View style={s.filterPillsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                s.filterPillsRow,
                { paddingHorizontal: px },
              ]}
            >
              {STATUS_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    s.filterPill,
                    statusFilter === f && s.filterPillActive,
                  ]}
                  onPress={() => {
                    setStatusFilter(f);
                    setCurrentPage(1);
                  }}
                  activeOpacity={0.75}
                >
                  {statusFilter === f && (
                    <View
                      style={[
                        s.filterPillDot,
                        {
                          backgroundColor:
                            f === "All"
                              ? C.white
                              : (STATUS_CFG[f as OrderStatus]?.dot ?? C.white),
                        },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      s.filterPillText,
                      statusFilter === f && s.filterPillTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Toolbar ── */}
          <View style={[s.toolbar, { paddingHorizontal: px }]}>
            <View style={s.searchBox}>
              <SearchIcon />
              <TextInput
                style={s.searchInput}
                placeholder="Search orders, customers…"
                placeholderTextColor={C.textLight}
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setCurrentPage(1);
                }}
              />
            </View>

            <View style={s.toolbarRight}>
              <TouchableOpacity
                style={s.paymentDrop}
                onPress={() => setPaymentVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={s.paymentDropText} numberOfLines={1}>
                  {paymentFilter === "All Payments" ? "Payment" : paymentFilter}
                </Text>
                <ChevronDownIcon />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.sortBtn}
                onPress={() => setSortVisible(true)}
                activeOpacity={0.8}
              >
                <SortIcon />
                <Text style={s.sortBtnText} numberOfLines={1}>
                  {isWeb ? currentSortLabel : "Sort"}
                </Text>
                <ChevronDownIcon color={C.navy} />
              </TouchableOpacity>

              <View style={s.viewToggle}>
                <TouchableOpacity
                  style={[
                    s.viewToggleBtn,
                    viewMode === "grid" && s.viewToggleBtnActive,
                  ]}
                  onPress={() => setViewMode("grid")}
                  activeOpacity={0.8}
                >
                  <GridIcon active={viewMode === "grid"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.viewToggleBtn,
                    viewMode === "list" && s.viewToggleBtnActive,
                  ]}
                  onPress={() => setViewMode("list")}
                  activeOpacity={0.8}
                >
                  <ListIcon active={viewMode === "list"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Content ── */}
          {loading ? (
            <View style={[s.stateBox, { marginHorizontal: px }]}>
              <ActivityIndicator size="large" color={C.navy} />
              <Text style={s.stateText}>Loading orders…</Text>
            </View>
          ) : error ? (
            <View style={[s.stateBox, { marginHorizontal: px }]}>
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity
                style={s.retryBtn}
                onPress={loadOrders}
                activeOpacity={0.8}
              >
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={[s.stateBox, { marginHorizontal: px }]}>
              <OrderBoxIcon color={C.textLight} />
              <Text style={s.stateText}>No orders found</Text>
              <Text style={s.stateSub}>
                Try adjusting your filters or search
              </Text>
            </View>
          ) : viewMode === "grid" ? (
            <View style={[s.gridWrap, { paddingHorizontal: px }]}>
              {filtered.map((o) => (
                <View
                  key={o.id}
                  style={
                    columnCount > 1
                      ? [s.gridItem, { width: cardWidthPercent as any }]
                      : s.gridItemFull
                  }
                >
                  <GridOrderCard
                    order={o}
                    onView={handleView}
                    onGST={handleGST}
                    onMore={(ord) => setActiveAction(ord)}
                    isWeb={isWeb}
                  />
                </View>
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={[s.tableScroll, { paddingHorizontal: px }]}
            >
              <View style={s.tableWrap}>
                <View style={s.tHead}>
                  {[
                    { label: "Order #", style: s.colOrder },
                    { label: "Customer", style: s.colCustomer },
                    { label: "Seller", style: s.colSeller },
                    { label: "Products", style: s.colProducts },
                    { label: "Amount", style: s.colAmount },
                    { label: "Status", style: s.colStatus },
                    { label: "GST Filed", style: s.colGst },
                    { label: "Invoice/Label", style: s.colDocs },
                    { label: "Action", style: s.colAction },
                  ].map((col) => (
                    <Text key={col.label} style={[s.th, col.style]}>
                      {col.label}
                    </Text>
                  ))}
                </View>

                {filtered.map((o, idx) => (
                  <ListTableRow
                    key={o.id}
                    order={o}
                    idx={idx}
                    onView={handleView}
                    onGST={handleGST}
                  />
                ))}
              </View>
            </ScrollView>
          )}

          {/* ── Pagination ── */}
          {!loading && !error && totalPages > 0 && (
            <View style={{ paddingHorizontal: px }}>
              <PaginationBar
                page={currentPage}
                total={totalPages}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                totalElements={totalElements}
                onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                onPage={setCurrentPage}
              />
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>

      <SortModal
        visible={sortVisible}
        isWeb={isWeb}
        current={sortOption}
        onSelect={setSortOption}
        onClose={() => setSortVisible(false)}
      />

      <PaymentModal
        visible={paymentVisible}
        isWeb={isWeb}
        current={paymentFilter}
        onSelect={(p) => {
          setPaymentFilter(p);
          setCurrentPage(1);
        }}
        onClose={() => setPaymentVisible(false)}
      />

      {activeAction && (
        <ActionMenu
          order={activeAction}
          visible={!!activeAction}
          onClose={() => setActiveAction(null)}
          onView={handleView}
          onGST={handleGST}
          onOpenDoc={handleOpenDoc}
          isWeb={isWeb}
        />
      )}

      <ShippingLabelModal
        order={docModal === "label" ? docOrder : null}
        visible={docModal === "label"}
        onClose={handleCloseDoc}
      />

      <InvoiceModal
        order={docModal === "invoice" ? docOrder : null}
        visible={docModal === "invoice"}
        onClose={handleCloseDoc}
      />
    </AdminLayout>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scrollContent: { paddingBottom: 60 },

  // ── Header — floating rounded card (all 4 corners) ──────────────────────────
  headerBlock: {
    backgroundColor: C.navyDeep,
    paddingTop: 20,
    paddingBottom: 44,
    borderRadius: 24,
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.3,
  },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.orange,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  exportBtnText: { fontSize: 13, fontWeight: "700", color: C.white },

  // ── Overlapping stat cards (sit on top of the header's bottom edge) ────────
  statCardsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginTop: -32,
    marginBottom: 4,
  },
  statCardsWrapMobile: { flexWrap: "nowrap", gap: 6, marginTop: -26 },
  statCard: {
    flex: 1,
    minWidth: 130,
    maxWidth: 230,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 4,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11.5,
    color: C.textLight,
    fontWeight: "600",
  },

  filterPillsWrap: { marginTop: 4, marginBottom: 6 },
  filterPillsRow: { gap: 8, flexDirection: "row" },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterPillActive: { backgroundColor: C.navy, borderColor: C.navy },
  filterPillDot: { width: 6, height: 6, borderRadius: 3 },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMid,
  },
  filterPillTextActive: { color: C.white },

  // ── Toolbar ──────────────────────────────────────────────────────────────────
  toolbar: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 14,
    flexWrap: "wrap",
  },
  searchBox: {
    flex: 1,
    minWidth: 180,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.textDark,
    outlineStyle: "none",
  } as any,
  toolbarRight: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexShrink: 0,
    flexWrap: "wrap",
  },
  paymentDrop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },
  paymentDropText: { fontSize: 13, color: C.textMid, maxWidth: 110 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },
  sortBtnText: {
    fontSize: 13,
    color: C.navy,
    fontWeight: "600",
    maxWidth: 140,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: C.border,
    borderRadius: 10,
    padding: 3,
  },
  viewToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleBtnActive: { backgroundColor: C.navy },

  // ── Sort Modal ───────────────────────────────────────────────────────────────
  sortOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(21,29,79,0.45)",
  },
  sortOverlayWeb: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(21,29,79,0.35)",
  },
  sortMenu: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sortMenuWeb: {
    borderRadius: 20,
    minWidth: 300,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sortHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sortTitle: { fontSize: 16, fontWeight: "700", color: C.textDark },
  sortDismiss: { padding: 6 },
  sortItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sortItemActive: { backgroundColor: "#F0F3FF" },
  sortItemText: { fontSize: 15, color: C.textMid },
  sortItemTextActive: { color: C.navy, fontWeight: "700" },
  sortCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  sortCancelBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  sortCancelText: { fontSize: 15, fontWeight: "600", color: C.textMid },

  // ── Action Menu (re-themed: navy + orange) ──────────────────────────────────
  actionOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(21,29,79,0.5)",
  },
  actionOverlayWeb: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(21,29,79,0.4)",
  },
  actionMenu: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    overflow: "hidden",
  },
  actionMenuWeb: {
    borderRadius: 20,
    minWidth: 320,
    maxWidth: 360,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  menuHeader: {
    backgroundColor: C.navy,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: C.orange,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.white,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  menuSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    fontWeight: "700",
  },
  menuCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  actionItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.orangePale,
    borderWidth: 1,
    borderColor: C.orangeBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  actionItemText: { fontSize: 15, color: C.textDark, fontWeight: "600" },
  actionItemSub: { fontSize: 11.5, color: C.textLight, marginTop: 2 },
  actionDismissBtn: {
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.orange,
    alignItems: "center",
  },
  actionDismissText: { fontSize: 15, fontWeight: "700", color: C.white },

  // ── Document screen shell (Invoice / Shipping Label modals) ────────────────
  docScreen: { flex: 1, backgroundColor: C.bg },
  docTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : 16,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  docTopBarTitle: { fontSize: 16, fontWeight: "800", color: C.navyDeep },
  docTopClose: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  docScroll: { padding: 16, paddingBottom: 100, alignItems: "center" },
  docActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  docBtnPrint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.orange,
    borderRadius: 10,
    paddingHorizontal: 26,
    paddingVertical: 13,
    minWidth: 140,
    justifyContent: "center",
  },
  docBtnPrintText: { fontSize: 14, fontWeight: "700", color: C.white },
  docBtnClose: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.navy,
    paddingHorizontal: 26,
    paddingVertical: 13,
    minWidth: 140,
    justifyContent: "center",
  },
  docBtnCloseText: { fontSize: 14, fontWeight: "700", color: C.navy },

  // ── Shipping label sheet ─────────────────────────────────────────────────────
  labelSheet: {
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  labelBrandHeader: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  labelBrandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelBrandMark: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  labelBrandMarkText: { color: C.white, fontWeight: "800", fontSize: 12 },
  labelBrandName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
  labelBrandTag: { fontSize: 10, color: C.textLight, marginTop: 2 },
  labelTitleText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "800",
    color: C.textLight,
    letterSpacing: 2,
  },

  labelCourierBlock: {
    borderTopWidth: 2,
    borderTopColor: C.navy,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    padding: 14,
  },
  labelCourierTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  labelCourierLabel: { fontSize: 12, fontWeight: "700", color: C.textMid },
  labelGstChip: {
    backgroundColor: C.orange,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  labelGstChipText: { color: C.white, fontSize: 10, fontWeight: "700" },
  labelAwbArea: { flexDirection: "row", alignItems: "center", gap: 14 },
  labelAwbLeft: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  labelAwbCaption: {
    fontSize: 9,
    fontWeight: "700",
    color: C.textLight,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  barcodeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 44,
    gap: 2,
  },
  barcodeBar: { width: 2, backgroundColor: C.textDark },
  labelAwbNumber: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  labelQrBox: {
    width: 72,
    height: 72,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  labelSection: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  labelSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.orange,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  labelShipName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.navyDeep,
    textTransform: "capitalize",
    marginBottom: 3,
  },
  labelShipAddress: { fontSize: 12.5, color: C.textMid, lineHeight: 19 },

  labelMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  labelMetaItem: { width: "45%" },
  labelMetaK: { fontSize: 11, color: C.textLight, fontWeight: "600" },
  labelMetaV: {
    fontSize: 12.5,
    color: C.textDark,
    fontWeight: "700",
    marginTop: 2,
  },

  labelProductHead: {
    flexDirection: "row",
    backgroundColor: C.navyDeep,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  labelProductHeadText: {
    color: C.white,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelProductRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "center",
  },
  labelProductName: { fontSize: 11.5, fontWeight: "700", color: C.textDark },
  labelProductNum: {
    fontSize: 11.5,
    fontWeight: "700",
    color: C.textDark,
    textAlign: "right",
  },
  labelTotalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  labelTotalsLabel: { fontSize: 12, fontWeight: "700", color: C.textMid },
  labelTotalsValue: { fontSize: 14, fontWeight: "800", color: C.orange },

  labelReturnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  labelReturnName: { fontWeight: "800", fontSize: 12.5, color: C.textDark },
  labelReturnGstChip: {
    backgroundColor: C.bluePale,
    borderWidth: 1,
    borderColor: C.navy,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  labelReturnGstText: { fontSize: 9.5, fontWeight: "700", color: C.navy },
  labelReturnAddr: { fontSize: 11.5, color: C.textMid },

  labelFooterNote: { alignItems: "center", padding: 16 },
  labelFooterGst: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textMid,
    marginBottom: 4,
  },
  labelFooterAuto: { fontSize: 9.5, color: C.textLight, letterSpacing: 0.4 },
  labelFooterPowered: { fontSize: 10, color: C.textLight, marginTop: 3 },

  // ── Invoice sheet ─────────────────────────────────────────────────────────────
  invoiceSheet: {
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
  },
  invTopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
    flexWrap: "wrap",
  },
  invBrandRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  invBrandMark: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  invBrandMarkText: { color: C.white, fontWeight: "800", fontSize: 13 },
  invBrandName: { fontSize: 19, fontWeight: "800", letterSpacing: -0.2 },
  invBrandTag: { fontSize: 10.5, color: C.textLight, marginTop: 2 },
  invMetaCol: { alignItems: "flex-end" },
  invTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.orange,
    letterSpacing: 1,
  },
  invMetaLine: {
    fontSize: 12.5,
    color: C.textDark,
    fontWeight: "700",
    marginTop: 4,
  },
  invMetaLineMuted: { fontSize: 11.5, color: C.textMid, marginTop: 2 },

  invSenderBlock: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  invSenderName: {
    fontSize: 14,
    fontWeight: "800",
    color: C.navyDeep,
    marginBottom: 4,
  },
  invSenderLine: { fontSize: 12, color: C.textMid },

  invSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  invSectionLabelNavy: {
    fontSize: 11,
    fontWeight: "700",
    color: C.navy,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  invSectionLabelOrange: {
    fontSize: 11,
    fontWeight: "700",
    color: C.orange,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  invBoldName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 4,
  },
  invMutedLine: { fontSize: 12, color: C.textMid },

  invBsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  invBsCol: { flex: 1, minWidth: 160 },

  invTable: {
    marginTop: 18,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  invTableHead: {
    flexDirection: "row",
    backgroundColor: C.navyDeep,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  invTh: {
    color: C.white,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  invTr: {
    flexDirection: "row",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: "center",
  },
  invTdName: { fontSize: 12.5, fontWeight: "700", color: C.textDark },
  invTdNum: { fontSize: 12.5, color: C.textMid, textAlign: "right" },

  invTotalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 18,
  },
  invTotalsBox: { width: "100%", maxWidth: 280 },
  invTotalsLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  invTotalsLabel: { fontSize: 13, color: C.textMid },
  invTotalsValue: { fontSize: 13, color: C.textMid, fontWeight: "600" },
  invGrandLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: C.navyDeep,
    marginTop: 6,
    paddingTop: 12,
  },
  invGrandLabel: { fontSize: 15, fontWeight: "800", color: C.navyDeep },
  invGrandValue: { fontSize: 17, fontWeight: "800", color: C.orange },

  invGstBlock: {
    marginTop: 22,
    borderLeftWidth: 4,
    borderLeftColor: C.orange,
    backgroundColor: C.orangePale,
    padding: 16,
    borderRadius: 6,
  },
  invGstTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.orange,
    marginBottom: 10,
  },
  invGstLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  invGstK: { fontSize: 12.5, color: C.textMid },
  invGstV: { fontSize: 12.5, fontWeight: "700", color: C.navyDeep },
  invGstNote: {
    fontSize: 10.5,
    color: C.textLight,
    fontStyle: "italic",
    marginTop: 8,
  },

  invPaymentBlock: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  invPaymentTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: C.navyDeep,
    marginBottom: 8,
  },
  invPaymentLine: { fontSize: 12.5, color: C.textMid },
  invPaymentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  invPayChip: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 2 },
  invPayChipPaid: { backgroundColor: C.greenPale },
  invPayChipPending: { backgroundColor: C.yellowPale },
  invPayChipText: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  invDocFooter: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 10.5,
    color: C.textLight,
  },

  // ── Grid ─────────────────────────────────────────────────────────────────────
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GUTTER,
    alignItems: "flex-start",
  },
  gridItem: {},
  gridItemFull: { width: "100%" },

  gridCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  gridCardWeb: {},
  cardAccent: { height: 3 },

  gridCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  gridOrderNum: {
    fontSize: 15,
    fontWeight: "600",
    color: C.navyDeep,
    letterSpacing: -0.3,
  },
  copyBtn: { padding: 3 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 10, color: C.textLight },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  moreBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: 12,
  },

  prodSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  prodThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  prodThumbEmpty: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  prodInfo: { flex: 1, minWidth: 0 },
  prodName: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textDark,
    lineHeight: 16,
  },
  prodMeta: { fontSize: 11, color: C.textLight, marginTop: 3, lineHeight: 14 },

  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  customerRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 10, fontWeight: "800", color: C.navy },
  customerName: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textDark,
    flexShrink: 1,
  },
  amountVal: {
    fontSize: 15,
    fontWeight: "700",
    color: C.orange,
    letterSpacing: -0.3,
    flexShrink: 0,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },

  gstBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  gstBadgeFiled: { backgroundColor: C.greenPale },
  gstBadgePending: { backgroundColor: C.yellowPale },
  gstDot: { width: 5, height: 5, borderRadius: 3 },
  gstBadgeText: { fontSize: 11, fontWeight: "600" },

  ctaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ctaText: { fontSize: 12, fontWeight: "600", color: C.blue },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  // ── List / Table ─────────────────────────────────────────────────────────────
  tableScroll: {},
  tableWrap: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    minWidth: 1200,
  },
  tHead: {
    flexDirection: "row",
    backgroundColor: C.navyDeep,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  th: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "flex-start",
    backgroundColor: C.white,
    minHeight: 72,
  },
  tRowAlt: { backgroundColor: "#FAFBFF" },
  tcell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
  },

  colOrder: { width: 160 },
  colCustomer: { width: 180 },
  colSeller: { width: 160 },
  colProducts: { width: 200 },
  colAmount: { width: 130 },
  colStatus: { width: 120 },
  colGst: { width: 110 },
  colDocs: { width: 90 },
  colAction: { width: 110 },

  tdOrderNum: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navyDeep,
    marginBottom: 2,
  },
  tdName: { fontSize: 13, fontWeight: "600", color: C.textDark },
  tdEmail: { fontSize: 11, color: C.textLight, marginTop: 1 },
  tdSellerName: { fontSize: 12, fontWeight: "700", color: C.textDark },
  tdProductName: { fontSize: 11, fontWeight: "600", color: C.textDark },
  tdAmount: { fontSize: 14, fontWeight: "800", color: C.orange },
  tdPayment: { fontSize: 10, color: C.textLight, marginTop: 3 },
  tdMuted: { fontSize: 11, color: C.textLight },

  customerRowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarSm: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarSmText: { fontSize: 10, fontWeight: "800", color: C.navy },

  tableProductRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tableThumb: {
    width: 32,
    height: 32,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.border,
  },
  tableThumbEmpty: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: "#F3F4F6",
  },
  tableDocRow: { flexDirection: "row", gap: 4 },
  tableDocBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  tableActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  viewBtnSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.navy,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  viewBtnSmText: { fontSize: 11, fontWeight: "700", color: C.white },

  // ── Pagination ───────────────────────────────────────────────────────────────
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  paginationInfo: { fontSize: 13, color: C.textMid },
  paginationControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card,
  },
  pageBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  pageBtnOff: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, fontWeight: "600", color: C.textMid },
  pageBtnTextActive: { color: C.white },
  pageEllipsis: { fontSize: 13, color: C.textLight, paddingHorizontal: 2 },

  // ── State boxes ──────────────────────────────────────────────────────────────
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  stateText: { fontSize: 16, fontWeight: "700", color: C.textMid },
  stateSub: { fontSize: 13, color: C.textLight },
  errorText: {
    fontSize: 14,
    color: C.red,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.navy,
  },
  retryText: { color: C.white, fontWeight: "700", fontSize: 13 },
});
