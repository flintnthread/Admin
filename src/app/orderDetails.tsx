/**
 * orderDetails.tsx
 * Full order detail screen — mobile / tablet / 1024 / 1440 / desktop
 * React Native + Expo + TypeScript
 * Bootstrap SVG icons only — no external icon libraries
 */

import { InvoiceModal } from "./orders";
import AdminLayout from "@/components/admin-layout";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { getApiErrorMessage } from "@/lib/api/client";
import { resolveMediaUrl } from "@/lib/api/media";
import { fetchOrderDetail, updateOrderStatus } from "@/services/orderApi";

import Svg, { Circle, Path } from "react-native-svg";

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE  (matches CustomerManagement / CustomerDetails)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  cardBg: "#F4F6F9",
  primary: "#F97316",
  primaryLight: "#FFF0EA",
  navy: "#1C2B4A",
  white: "#FFFFFF",
  text: "#1C2B4A",
  sub: "#6B7280",
  border: "#E8E2D9",
  active: "#10B981",
  activeLight: "#ECFDF5",
  inactive: "#EF4444",
  inactiveLight: "#FEF2F2",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT HOOK
// ─────────────────────────────────────────────────────────────────────────────
function useLayout(w: number) {
  return {
    isMobileS: w <= 320,
    isMobileM: w > 320 && w <= 375,
    isMobileL: w > 375 && w <= 425,
    isMobile: w < 768,
    isTablet: w >= 768 && w < 1024,
    isLaptop: w >= 1024 && w < 1440,
    isDesktop: w >= 1440,
    isWide: w >= 768,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type OrderStatus =
  | "Pending"
  | "Sent to Seller"
  | "Processing"
  | "Completed"
  | "Returned"
  | "Replacement"
  | "Cancelled";

type TrackingEvent = {
  date: string;
  time?: string;
  location?: string;
  description: string;
  status?: OrderStatus;
};

type ApiOrderItem = {
  id: number;
  productId?: number;
  productName?: string;
  sellerName?: string;
  sku?: string;
  color?: string;
  size?: string;
  quantity?: number;
  price?: number;
  total?: number;
  status?: string;
  imageUrl?: string;
};

type OrderItem = {
  id: number;
  productId?: number;
  product: string;
  sku: string;
  seller: string;
  variant: string;
  qty: number;
  price: number;
  total: number;
  slug: string;
  imageUrl?: string;
};

type StatusHistory = {
  status: OrderStatus;
  date: string;
  by: string;
  comment: string;
};

type Address = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

type Customer = {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

type ShiprocketInfo = {
  awb?: string;
  courier?: string;
  status?: string;
  synced?: string;
  url?: string;
};

type UIOrder = {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  customer: Customer;
  billing: Address;
  shipping: Address;
  shiprocket: ShiprocketInfo;
  tracking: TrackingEvent[];
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  walletDeduction: number;
  referralDiscount: number;
  total: number;
  history: StatusHistory[];
  gstStatus?: string;
  gstNumber?: string;
  rawData?: Record<string, unknown>;
};

type OrderDetail = Record<string, unknown> & {
  id: number;
  userId?: number;
  orderNumber?: string;
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  totalAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  walletDeduction?: number;
  referralDiscountAmount?: number;
  createdAt?: string;
  shippingName?: string;
  shippingEmail?: string;
  shippingPhone?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingCountry?: string;
  shippingPincode?: string;
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingPincode?: string;
  orderNotes?: string;
  gstNumber?: string;
  gstInfo?: string;
  gstStatus?: string;
  shiprocketStatus?: string;
  shiprocketTrackingUrl?: string;
  shiprocketAwbCode?: string;
  shiprocketCourierName?: string;
  shiprocketPushedAt?: string;
  shiprocketSyncedAt?: string;
  items?: ApiOrderItem[];
  statusHistory?: Array<{
    id?: number;
    status?: string;
    comment?: string;
    createdBy?: number;
    createdAt?: string;
  }>;
  customerId?: number;
};

function normalizeStatus(status?: string): OrderStatus {
  const value = (status ?? "").toLowerCase().replace(/_/g, " ");
  if (value.includes("sent") && value.includes("seller")) return "Sent to Seller";
  if (value.includes("process") || value.includes("ship") || value.includes("transit") || value.includes("packed")) {
    return "Processing";
  }
  if (value.includes("deliver") || value.includes("complete")) return "Completed";
  if (value.includes("return") || value.includes("refund") || value.includes("rto")) return "Returned";
  if (value.includes("replace")) return "Replacement";
  if (value.includes("cancel") || value.includes("reject")) return "Cancelled";
  if (value.includes("pending") || value.includes("confirm") || value.includes("placed") || value.includes("new")) {
    return "Pending";
  }
  return "Pending";
}

function formatPaymentStatus(status?: string) {
  if (!status) return "—";
  const normalized = status.trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function isPaymentPaid(status?: string) {
  const value = (status ?? "").toLowerCase();
  return value.includes("paid") || value.includes("success") || value.includes("captured");
}

function buildVariantLabel(item: ApiOrderItem) {
  const parts = [item.color, item.size].filter(Boolean);
  if (parts.length > 0) return parts.join(" / ");
  return item.status ?? "—";
}

function uiStatusToBackend(status: OrderStatus): string {
  return status;
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeWithTime(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function resolveItemImageUrl(item: ApiOrderItem): string {
  const raw = item as Record<string, unknown>;
  const path =
    item.imageUrl ??
    raw.image_url ??
    raw.productImagePath ??
    raw.product_image_path ??
    raw.productImage ??
    raw.product_image;
  return resolveMediaUrl(typeof path === "string" ? path : "");
}

function resolveItemProductName(item: ApiOrderItem): string {
  const raw = item as Record<string, unknown>;
  const nestedProduct = raw.product;
  const fromNested =
    nestedProduct &&
    typeof nestedProduct === "object" &&
    nestedProduct !== null &&
    "name" in nestedProduct
      ? String((nestedProduct as { name?: string }).name ?? "").trim()
      : "";

  return (
    item.productName?.trim() ||
    String(raw.product_name ?? "").trim() ||
    String(raw.name ?? "").trim() ||
    String(raw.title ?? "").trim() ||
    (typeof raw.product === "string" ? raw.product.trim() : "") ||
    fromNested ||
    (item.productId ? `Product #${item.productId}` : "Product")
  );
}

function mapApiItemToUi(item: ApiOrderItem): OrderItem {
  const qty = Number(item.quantity ?? 0);
  const price = Number(item.price ?? 0);
  const productName = resolveItemProductName(item);
  const imageUrl = resolveItemImageUrl(item);

  return {
    id: item.id,
    productId: item.productId,
    product: productName,
    sku: String(item.sku ?? item.productId ?? item.id ?? "—"),
    seller: item.sellerName ?? "Seller",
    variant: buildVariantLabel(item),
    qty,
    price,
    total: Number(item.total ?? qty * price),
    slug: productName
      ? productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      : String(item.productId ?? item.id ?? ""),
    imageUrl,
  };
}

function ProductThumb({ uri, size = 44 }: { uri?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(uri) && !failed;
  const thumbStyle = {
    width: size,
    height: size,
    borderRadius: 8,
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden" as const,
  };

  if (!showImage) {
    return (
      <View style={[thumbStyle, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: size * 0.28, fontWeight: "700", color: C.sub }}>P</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={thumbStyle}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

function formatOrderNumber(orderNumber?: string, id?: number): string {
  if (orderNumber?.trim()) {
    const raw = orderNumber.trim();
    return raw.startsWith("#") ? raw : `#${raw}`;
  }
  if (id != null && !Number.isNaN(id)) {
    return `#${id}`;
  }
  return "—";
}

function mapStatusHistoryEntry(entry: NonNullable<OrderDetail["statusHistory"]>[number]): StatusHistory {
  return {
    status: normalizeStatus(entry.status),
    date: formatDateTimeWithTime(entry.createdAt),
    by: entry.createdBy ? `Admin #${entry.createdBy}` : "System",
    comment: entry.comment?.trim() || entry.status || "",
  };
}

function resolveStringValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
}

function resolveShiprocketData(detail?: OrderDetail) {
  const shiprocketObject =
    detail && detail.shiprocket && typeof detail.shiprocket === "object" && !Array.isArray(detail.shiprocket)
      ? (detail.shiprocket as Record<string, unknown>)
      : undefined;
  const shipmentObject =
    detail && detail.shipment && typeof detail.shipment === "object" && !Array.isArray(detail.shipment)
      ? (detail.shipment as Record<string, unknown>)
      : undefined;
  const trackingObject =
    detail && detail.trackingData && typeof detail.trackingData === "object" && !Array.isArray(detail.trackingData)
      ? (detail.trackingData as Record<string, unknown>)
      : undefined;

  const trackingUrl = resolveStringValue(detail?.shiprocketTrackingUrl)
    ?? resolveStringValue(shiprocketObject?.trackingUrl)
    ?? resolveStringValue(shipmentObject?.trackingUrl)
    ?? resolveStringValue(trackingObject?.trackingUrl);

  const awb = resolveStringValue(detail?.shiprocketAwbCode)
    ?? resolveStringValue(shiprocketObject?.awb)
    ?? resolveStringValue(shipmentObject?.awb)
    ?? resolveStringValue(trackingObject?.awb)
    ?? (trackingUrl ? trackingUrl.split("/").pop() ?? "" : "");

  const courier = resolveStringValue(detail?.shiprocketCourierName)
    ?? resolveStringValue(shiprocketObject?.courier)
    ?? resolveStringValue(shiprocketObject?.courierName)
    ?? resolveStringValue(shipmentObject?.courier)
    ?? resolveStringValue(trackingObject?.courier)
    ?? (trackingUrl ? "ShipRocket" : undefined);

  const status = resolveStringValue(detail?.shiprocketStatus)
    ?? resolveStringValue(shiprocketObject?.status)
    ?? resolveStringValue(shipmentObject?.status)
    ?? resolveStringValue(trackingObject?.status);

  const syncedAt = resolveStringValue(detail?.shiprocketSyncedAt)
    ?? resolveStringValue(detail?.shiprocketPushedAt)
    ?? resolveStringValue(shiprocketObject?.syncedAt)
    ?? resolveStringValue(shiprocketObject?.updatedAt)
    ?? resolveStringValue(shipmentObject?.syncedAt)
    ?? resolveStringValue(trackingObject?.updatedAt);

  return {
    awb: awb || "—",
    courier: courier || "—",
    status: status || "—",
    synced: formatDateTimeWithTime(syncedAt),
    url: trackingUrl,
  };
}

function buildTrackingTimeline(history: StatusHistory[], detail?: OrderDetail): TrackingEvent[] {
  const events: TrackingEvent[] = [...history].reverse().map((entry) => {
    const [datePart, timePart] = entry.date.includes(",")
      ? entry.date.split(",").map((part) => part.trim())
      : [entry.date, ""];
    const note = entry.comment?.trim();
    const description =
      note && note.toLowerCase() !== entry.status.toLowerCase()
        ? `${entry.status} — ${note}`
        : entry.status;
    return {
      date: datePart,
      time: timePart,
      location: entry.by,
      description,
      status: entry.status,
    };
  });

  const shiprocket = resolveShiprocketData(detail);
  if (shiprocket.status && shiprocket.status !== "—") {
    const syncedLabel = shiprocket.synced;
    const [datePart, timePart] = syncedLabel.includes(",")
      ? syncedLabel.split(",").map((part) => part.trim())
      : [syncedLabel, ""];
    const shipEvent: TrackingEvent = {
      date: datePart,
      time: timePart,
      location: shiprocket.courier && shiprocket.courier !== "—" ? shiprocket.courier : "ShipRocket",
      description: `Shipment: ${shiprocket.status}`,
      status: "Processing",
    };
    const duplicate = events.some((event) =>
      event.description.toLowerCase().includes(shiprocket.status.toLowerCase())
    );
    if (!duplicate) {
      events.unshift(shipEvent);
    }
  }

  return events;
}

function mapApiOrderToUi(detail: OrderDetail, sellerNameFilter?: string, productIds?: string): UIOrder {
  let items = (detail.items ?? []).map(mapApiItemToUi);
  if (productIds) {
    const validIds = productIds.split(',');
    items = items.filter(i => validIds.includes(String(i.productId)) || validIds.includes(String(i.id)));
  } else if (sellerNameFilter) {
    items = items.filter(i => i.seller?.trim().toLowerCase() === sellerNameFilter.trim().toLowerCase());
  }
  if (items.length === 0 && (detail.items ?? []).length > 0) {
    console.log('Filter failed, falling back to all items.');
    items = (detail.items ?? []).map(mapApiItemToUi);
  }
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const shippingCost = Number(detail.shippingAmount ?? 0);
  const tax = Number(detail.taxAmount ?? 0);
  const discount = Number(detail.discountAmount ?? 0);
  const walletDeduction = Number(detail.walletDeduction ?? 0);
  const referralDiscount = Number(detail.referralDiscountAmount ?? 0);
  const total = Number(detail.totalAmount ?? subtotal + shippingCost + tax - discount - walletDeduction - referralDiscount);
  const shiprocket = resolveShiprocketData(detail);

  const history: StatusHistory[] =
    detail.statusHistory && detail.statusHistory.length > 0
      ? detail.statusHistory.map(mapStatusHistoryEntry)
      : [
          {
            status: normalizeStatus(detail.orderStatus),
            date: formatDateTimeWithTime(detail.createdAt),
            by: "System",
            comment: detail.orderStatus ?? "Order placed",
          },
        ];

  const paymentStatus = formatPaymentStatus(detail.paymentStatus);

  return {
    id: String(detail.id ?? ""),
    orderNumber: formatOrderNumber(detail.orderNumber, detail.id),
    date: formatDateTimeWithTime(detail.createdAt),
    status: normalizeStatus(detail.orderStatus),
    paymentMethod: detail.paymentMethod ?? "—",
    paymentStatus,
    customer: {
      id: detail.customerId ?? detail.userId,
      name: detail.shippingName ?? "—",
      email: detail.shippingEmail ?? "",
      phone: detail.shippingPhone ?? "",
      notes: detail.orderNotes?.trim() || "—",
    },
    billing: {
      line1: detail.billingAddress1 ?? detail.billingName ?? "",
      line2: detail.billingAddress2 ?? "",
      city: detail.billingCity ?? "",
      state: detail.billingState ?? "",
      pincode: detail.billingPincode ?? "",
      country: detail.billingCountry ?? "India",
    },
    shipping: {
      line1: detail.shippingAddress1 ?? detail.shippingName ?? "",
      line2: detail.shippingAddress2 ?? "",
      city: detail.shippingCity ?? "",
      state: detail.shippingState ?? "",
      pincode: detail.shippingPincode ?? "",
      country: detail.shippingCountry ?? "India",
    },
    shiprocket: {
      awb: shiprocket.awb,
      courier: shiprocket.courier,
      status: shiprocket.status,
      synced: shiprocket.synced,
      url: shiprocket.url,
    },
    tracking: buildTrackingTimeline(history, detail),
    items,
    subtotal,
    shippingCost,
    tax,
    discount,
    walletDeduction,
    referralDiscount,
    total,
    history,
    gstStatus: detail.gstStatus ?? "Not Filed",
    gstNumber: detail.gstNumber ?? "",
    rawData: detail,
  };
}

const INITIAL_ORDER: UIOrder = {
  id: "",
  orderNumber: "—",
  date: "—",
  status: "Pending",
  paymentMethod: "—",
  paymentStatus: "Pending",
  customer: { name: "—", email: "", phone: "", notes: "" },
  billing: { line1: "", line2: "", city: "", state: "", pincode: "", country: "India" },
  shipping: { line1: "", line2: "", city: "", state: "", pincode: "", country: "India" },
  shiprocket: { awb: "", courier: "—", status: "—", synced: "—", url: "" },
  tracking: [],
  items: [],
  subtotal: 0,
  shippingCost: 0,
  tax: 0,
  discount: 0,
  walletDeduction: 0,
  referralDiscount: 0,
  total: 0,
  history: [],
  rawData: undefined,
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<
  OrderStatus,
  { bg: string; color: string; dot: string }
> = {
  Pending: { bg: C.warningLight, color: C.warning, dot: C.warning },
  "Sent to Seller": { bg: C.blueLight, color: C.blue, dot: C.blue },
  Processing: { bg: C.blueLight, color: C.blue, dot: C.blue },
  Completed: { bg: C.activeLight, color: C.active, dot: C.active },
  Returned: { bg: "#FEF3C7", color: "#D97706", dot: "#D97706" },
  Replacement: { bg: C.purpleLight, color: C.purple, dot: C.purple },
  Cancelled: { bg: C.inactiveLight, color: C.inactive, dot: C.inactive },
};

// Dropdown options matching the uploaded screenshot
const STATUS_OPTIONS: {
  label: string;
  value: OrderStatus;
  icon: React.ReactNode;
}[] = [
    { value: "Pending", label: "Mark as Pending", icon: <PendingIcon /> },
    {
      value: "Processing",
      label: "Mark as Processing",
      icon: <ProcessingIcon />,
    },
    { value: "Completed", label: "Mark as Completed", icon: <CompletedIcon /> },
    { value: "Returned", label: "Mark as Returned", icon: <ReturnedIcon /> },
    {
      value: "Replacement",
      label: "Mark as Replacement",
      icon: <ReplacementIcon />,
    },
    { value: "Cancelled", label: "Mark as Cancelled", icon: <CancelledIcon /> },
  ];

// Extra non-status option


// ─────────────────────────────────────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────────────────────────────────────
type IP = { size?: number; color?: string };

// Dropdown status icons (matching screenshot)
function PendingIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Circle
        cx="8"
        cy="8"
        r="7"
        stroke={C.warning}
        strokeWidth="1.5"
        fill="none"
      />
      <Path
        fill={C.warning}
        d="M8 4.5a.5.5 0 0 1 .5.5v3.793l1.854 1.853a.5.5 0 0 1-.708.708l-2-2A.5.5 0 0 1 7.5 9V5a.5.5 0 0 1 .5-.5z"
      />
    </Svg>
  );
}
function SentToSellerIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill={C.blue}
        d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11z"
      />
    </Svg>
  );
}
function ProcessingIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill={C.blue}
        d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
      />
      <Path
        fill={C.blue}
        d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
      />
    </Svg>
  );
}
function CompletedIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill={C.active}
        d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"
      />
    </Svg>
  );
}
function ReturnedIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill="#D97706"
        d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1H2.964A6.5 6.5 0 1 1 2.5 8a.5.5 0 0 0-1 0 7.5 7.5 0 1 0 .5-2.772V1.5a.5.5 0 0 0-.5-.5z"
      />
    </Svg>
  );
}
function ReplacementIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill={C.purple}
        d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"
      />
    </Svg>
  );
}
function CancelledIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill={C.inactive}
        d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z"
      />
    </Svg>
  );
}

const BackIcon = ({ size = 18, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
    />
  </Svg>
);
const InvoiceIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"
    />
    <Path
      fill={color}
      d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"
    />
    <Path
      fill={color}
      d="M4.5 8a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0-5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1z"
    />
  </Svg>
);
const ShiprocketIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 13H4a.5.5 0 0 1-.491-.408L2.01 4.607 1.61 3H.5a.5.5 0 0 1-.5-.5M3.102 5l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"
    />
  </Svg>
);
const ChevronIcon = ({ size = 14, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"
    />
  </Svg>
);
const PersonIcon = ({ size = 13, color = C.primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"
    />
  </Svg>
);
const LinkIcon = ({ size = 13, color = C.primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"
    />
    <Path
      fill={color}
      d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"
    />
  </Svg>
);
const BoxArrowUpRightIcon = ({ size = 13, color = C.primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"
    />
    <Path
      fill={color}
      d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"
    />
  </Svg>
);
const MapPinIcon = ({ size = 13, color = C.primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"
    />
  </Svg>
);
const CloseIcon = ({ size = 16, color = C.text }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
    />
  </Svg>
);
const SyncIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"
    />
    <Path
      fill={color}
      d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"
    />
  </Svg>
);
const TrackIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 4.732 11h5.536a2 2 0 0 1 .732-.732V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
    />
  </Svg>
);
const AddIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"
    />
  </Svg>
);
const OrderIcon = ({ size = 20, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"
    />
    <Path
      fill={color}
      d="M4.5 8a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0-2.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1z"
    />
  </Svg>
);

const NoteIcon = ({ size = 13, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1zm2-1v3h4V.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5"
    />
  </Svg>
);
const WalletIcon = ({ size = 15, color = C.primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 3a2 2 0 0 1 2-2h13.5a.5.5 0 0 1 0 1H15v2a1 1 0 0 1 1 1v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 0 12.5zm1 1.732V12.5A1.5 1.5 0 0 0 2.5 14h12a.5.5 0 0 0 .5-.5V5H2a2 2 0 0 1-1-.268M1 3a1 1 0 0 0 1 1h12V2H2a1 1 0 0 0-1 1"
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CARD WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
function CardHeader({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.cardHeader}>
      <View style={s.cardHeaderLeft}>
        <View style={s.cardIconBox}>{icon}</View>
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.badgeTxt, { color: cfg.color }]}>{status}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS DROPDOWN (matching the uploaded screenshot)
// ─────────────────────────────────────────────────────────────────────────────
function StatusDropdown({
  current,
  onSelect,
  disabled = false,
  fullWidth = false,
}: {
  current: OrderStatus;
  onSelect: (v: OrderStatus) => void;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 210 });
  const btnRef = useRef<View>(null);

  const openMenu = () => {
    btnRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPos({ top: y + height + 6, left: x + width - 210, width: 210 });
      setOpen(true);
    });
  };

  return (
    <View ref={btnRef} collapsable={false} style={fullWidth && { width: "100%" }}>
      <TouchableOpacity
        style={[
          s.dropBtn,
          { backgroundColor: C.primary, borderColor: C.primary },
          fullWidth && { width: "100%", justifyContent: "center" },
          disabled && { opacity: 0.6 },
        ]}
        onPress={openMenu}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text style={[s.dropBtnTxt, { color: '#FFF' }]}>Update Status</Text>
        <ChevronIcon color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={{ flex: 1 }}>
            <View
              style={[
                s.dropMenu,
                {
                  position: "absolute",
                  top: menuPos.top,
                  left: menuPos.left,
                  width: menuPos.width,
                },
              ]}
            >
              {[
                { value: "Pending" as OrderStatus, label: "Mark as Pending", icon: <PendingIcon /> },
                { value: "Sent to Seller" as OrderStatus, label: "Sent to Seller", icon: <SentToSellerIcon /> },
                { value: "Processing" as OrderStatus, label: "Mark as Processing", icon: <ProcessingIcon /> },
                { value: "Completed" as OrderStatus, label: "Mark as Completed", icon: <CompletedIcon /> },
                { value: "Returned" as OrderStatus, label: "Mark as Returned", icon: <ReturnedIcon /> },
                { value: "Replacement" as OrderStatus, label: "Mark as Replacement", icon: <ReplacementIcon /> },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.dropItem, current === opt.value && s.dropItemActive]}
                  onPress={() => {
                    onSelect(opt.value);
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={s.dropItemIcon}>{opt.icon}</View>
                  <Text
                    style={[
                      s.dropItemTxt,
                      current === opt.value && { fontWeight: "700", color: C.navy },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDRESS BLOCK
// ─────────────────────────────────────────────────────────────────────────────
function AddressBlock({
  title,
  addr,
}: {
  title: string;
  addr: Address;
}) {
  return (
    <View style={s.addrBlock}>
      <Text style={s.addrTitle}>{title}</Text>
      <View style={s.addrBody}>
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 7 }}
        >
          <MapPinIcon />
          <View style={{ flex: 1 }}>
            <Text style={s.addrLine}>{addr.line1}</Text>
            {addr.line2 ? <Text style={s.addrLine}>{addr.line2}</Text> : null}
            <Text style={s.addrLine}>
              {addr.city}, {addr.state} — {addr.pincode}
            </Text>
            <Text style={s.addrLine}>{addr.country}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO ROW
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: React.ReactNode;
  valueStyle?: object;
}) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      {typeof value === "string" ? (
        <Text style={[s.infoValue, valueStyle]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RUPEE HELPER
// ─────────────────────────────────────────────────────────────────────────────
function rupee(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderDetailScreen() {
  const { width } = useWindowDimensions();
  const { isMobile, isTablet, isLaptop, isDesktop, isWide } = useLayout(width);
  const router = useRouter();
  const { orderId, sellerName, productIds } = useLocalSearchParams<{ orderId?: string; sellerName?: string; productIds?: string }>();

  const [order, setOrder] = useState<UIOrder>(INITIAL_ORDER);
  const [status, setStatus] = useState<OrderStatus>(INITIAL_ORDER.status);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>("Pending");
  const [statusComment, setStatusComment] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [trackingExpanded, setTrackingExpanded] = useState(false);
  const px = isMobile ? 14 : isTablet ? 20 : 28;

  const displayOrderId = order.id || orderId || "—";
  const displayOrderNumber = order.orderNumber || "—";

  const loadOrder = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    if (!orderId) {
      setError("Order ID missing.");
      if (showLoading) setLoading(false);
      return;
    }

    const id = Number(orderId);
    if (Number.isNaN(id)) {
      setError("Invalid order ID.");
      if (showLoading) setLoading(false);
      return;
    }

    try {
      const raw = await fetchOrderDetail(id);
      const uiOrder = mapApiOrderToUi(raw as OrderDetail, sellerName, productIds);
      setOrder(uiOrder);
      setStatus(uiOrder.status);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder(true);
  }, [loadOrder]);

  // Sync animation
  const syncSpinAnim = useRef(new Animated.Value(0)).current;
  const applyStatusUpdate = useCallback(
    async (nextStatus: OrderStatus, comment?: string, notify = false) => {
      if (!orderId) return;
      const id = Number(orderId);
      if (Number.isNaN(id)) return;

      setStatusSaving(true);
      try {
        const updated = await updateOrderStatus(
          id,
          uiStatusToBackend(nextStatus),
          comment,
          notify
        );
        const uiOrder = mapApiOrderToUi(updated as OrderDetail);
        setOrder(uiOrder);
        setStatus(uiOrder.status);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setStatusSaving(false);
      }
    },
    [orderId]
  );

  const handleStatusSelect = useCallback(
    async (nextStatus: OrderStatus) => {
      if (nextStatus === status || statusSaving) return;
      await applyStatusUpdate(nextStatus);
    },
    [applyStatusUpdate, status, statusSaving]
  );

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    Animated.loop(
      Animated.timing(syncSpinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    try {
      await loadOrder(false);
    } finally {
      syncSpinAnim.stopAnimation();
      syncSpinAnim.setValue(0);
      setSyncing(false);
    }
  }, [loadOrder, syncing, syncSpinAnim]);

  const spin = syncSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <AdminLayout>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ══ BODY ════════════════════════════════════════════════════════════ */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading order details…</Text>
        </View>
      ) : error ? (
        <View style={s.errorContainer}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.errorRetryBtn} onPress={() => loadOrder(true)} activeOpacity={0.8}>
            <Text style={s.errorRetryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingHorizontal: px }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              s.body,
              { maxWidth: 1600, alignSelf: "center", width: "100%" },
            ]}
          >
            {/* ── HEADER ─────────────────────────────────────────── */}
            {isMobile ? (
              // ── MOBILE HEADER ──
              <View style={{ backgroundColor: C.navy, padding: 16, borderRadius: 16, gap: 12, marginBottom: 8 }}>
                {/* Row 1: Back on left, Invoice on right */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <TouchableOpacity style={s.headerBackBtn} onPress={() => router.push("/orders")} activeOpacity={0.8}>
                    <BackIcon size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: "rgba(255,255,255,0.15)", paddingVertical: 8, paddingHorizontal: 12 }]}
                    activeOpacity={0.8}
                    onPress={() => setInvoiceVisible(true)}
                  >
                    <InvoiceIcon />
                    <Text style={s.actionBtnTxt}>Invoice</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 2: Title and Status Badge */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 4, gap: 8 }}>
                  <Text style={[s.pageTitle, { color: "#FFF", fontSize: 20, flex: 1 }]} numberOfLines={1}>Order {displayOrderNumber}</Text>
                  <StatusBadge status={status} />
                </View>

                {/* Row 3: Metadata (Date and Payment Method) */}
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, opacity: 0.85 }}>
                  <Text style={[s.pageSubtitle, { color: "rgba(255,255,255,0.7)", fontSize: 12 }]}>{order.date}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>•</Text>
                  <Text style={[s.pageSubtitle, { color: "rgba(255,255,255,0.7)", fontSize: 12 }]}>{order.paymentMethod}</Text>
                </View>

                {/* Row 4: Dropdown update status (Full width) */}
                <View style={{ width: "100%", marginTop: 4 }}>
                  <StatusDropdown current={status} onSelect={handleStatusSelect} disabled={statusSaving} fullWidth />
                </View>
              </View>
            ) : (
              // ── TABLET / DESKTOP HEADER ──
              <View style={[s.pageHeader, { backgroundColor: C.navy, padding: 20, borderRadius: 16 }]}>
                <View style={s.pageHeaderLeft}>
                  <TouchableOpacity style={s.headerBackBtn} onPress={() => router.push("/orders")} activeOpacity={0.8}>
                    <BackIcon size={18} color="#FFF" />
                  </TouchableOpacity>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.pageTitle, { color: "#FFF", fontSize: 22 }]} numberOfLines={1}>Order {displayOrderNumber}</Text>
                    <View style={s.pageSubtitleRow}>
                      <Text style={[s.pageSubtitle, { color: "rgba(255,255,255,0.7)", fontSize: 13 }]}>{order.date}</Text>
                      <Text style={[s.pageSubtitleDot, { color: "rgba(255,255,255,0.3)" }]}>•</Text>
                      <Text style={[s.pageSubtitle, { color: "rgba(255,255,255,0.7)", fontSize: 13 }]}>{order.paymentMethod}</Text>
                      <View style={s.headerStatusPill}>
                        <StatusBadge status={status} />
                      </View>
                    </View>
                  </View>
                </View>
                <View style={s.pageHeaderRight}>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]} activeOpacity={0.8} onPress={() => setInvoiceVisible(true)}>
                    <InvoiceIcon />
                    <Text style={s.actionBtnTxt}>Invoice</Text>
                  </TouchableOpacity>
                  <StatusDropdown current={status} onSelect={handleStatusSelect} disabled={statusSaving} />
                </View>
              </View>
            )}

            {/* ── MAIN SPLIT CONTENT (Left: Details, Right: Tracking) ────── */}
            <View style={[s.row, !isWide && s.colStack, { alignItems: "stretch", marginTop: 16 }]}>
              {/* Main Left Column */}
              <View
                style={[s.colStack, isWide ? { flex: 2.8 } : { width: "100%" }, { gap: 16 }]}
              >
                
                {/* ── ROW 2: Information Cards (2x2 Grid) ────────────────────── */}
                <View style={[s.row, { flexWrap: "wrap" }]}>
                  {/* Customer Information */}
                  <Card style={(!isMobile) ? s.col6 : s.col12}>
                <CardHeader icon={<PersonIcon size={16} color={C.primary} />} title="Customer Information" />
                <View style={s.cardBodyCompact}>
                  <InfoRow label="Customer Name" value={
                    <TouchableOpacity onPress={() => { if (order.customer.id) router.push({ pathname: "/customerDetails", params: { id: String(order.customer.id) } }); }}>
                      <Text style={[s.infoValue, { color: C.primary, fontWeight: "700" }]}>{order.customer.name}</Text>
                    </TouchableOpacity>
                  } />
                  <InfoRow label="Email Address" value={order.customer.email} />
                  <InfoRow label="Phone Number" value={order.customer.phone} />
                  <InfoRow label="Order Notes" value={order.customer.notes || "No notes provided"} valueStyle={{ fontStyle: "italic" }} />
                </View>
              </Card>

                  {/* Billing Address */}
                  <Card style={(!isMobile) ? s.col6 : s.col12}>
                <CardHeader icon={<MapPinIcon size={16} color={C.primary} />} title="Billing Address" />
                <View style={s.cardBodyCompact}>
                  <AddressBlock title="" addr={order.billing} />
                </View>
              </Card>

                  {/* Shipping Address */}
                  <Card style={(!isMobile) ? s.col6 : s.col12}>
                <CardHeader icon={<MapPinIcon size={16} color={C.blue} />} title="Shipping Address" />
                <View style={s.cardBodyCompact}>
                  <AddressBlock title="" addr={order.shipping} />
                </View>
              </Card>

                  {/* ShipRocket Information */}
                  <Card style={(!isMobile) ? s.col6 : s.col12}>
                <CardHeader icon={<ShiprocketIcon size={16} color={C.purple} />} title="ShipRocket Information" 
                  right={
                    <TouchableOpacity style={[s.smBtn, { backgroundColor: C.navy }]} onPress={handleSync}>
                      <Text style={s.smBtnTxt}>Sync Now</Text>
                    </TouchableOpacity>
                  }
                />
                <View style={s.cardBodyCompact}>
                  <InfoRow label="AWB / Tracking #" value={order.shiprocket.awb !== "—" ? order.shiprocket.awb : "Shiprocket pending"} />
                  <InfoRow label="Courier Partner" value={order.shiprocket.courier} />
                  <InfoRow label="Shipment Status" value={
                    <View style={[s.badge, { backgroundColor: C.blueLight }]}>
                      <Text style={[s.badgeTxt, { color: C.blue }]}>{order.shiprocket.status}</Text>
                    </View>
                  } />
                  <InfoRow label="Last Synced" value={order.shiprocket.synced} />
                  {order.shiprocket.url ? (
                    <TouchableOpacity style={[s.trackBtn, { marginTop: 8 }]} onPress={() => { if (order.shiprocket.url) Linking.openURL(order.shiprocket.url); }}>
                      <Text style={s.trackBtnTxt}>Track on ShipRocket</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Card>
            </View>
              </View>

              {/* Right Side: Tracking Timeline */}
              <View style={[isWide ? { flex: 1, alignSelf: "stretch" } : { width: "100%" }]}>
                <Card style={[{ overflow: "hidden" }, isWide ? { flex: 1 } : undefined]}>
                  <CardHeader icon={<TrackIcon size={16} color={C.primary} />} title="Tracking Timeline" />

                  {/* FIXED 320px height — never grows, content scrolls inside */}
                  <ScrollView
                    style={{ height: 320, paddingHorizontal: 18, paddingTop: 12 }}
                    nestedScrollEnabled
                    scrollEnabled={trackingExpanded || order.tracking.length <= 3}
                    showsVerticalScrollIndicator={trackingExpanded}
                  >
                    {order.tracking.length === 0 ? (
                      <Text style={s.emptyTrackingTxt}>No tracking updates yet. Status changes will appear here.</Text>
                    ) : (
                      order.tracking.map((ev, idx) => (
                        <View key={`${ev.date}-${ev.description}-${idx}`} style={s.tlItem}>
                          <View style={s.tlLeft}>
                            <View style={[s.tlDot, idx === 0 && s.tlDotActive]} />
                            {idx < order.tracking.length - 1 && <View style={s.tlLine} />}
                          </View>
                          <View style={s.tlContent}>
                            {ev.status && <View style={{ marginBottom: 6 }}><StatusBadge status={ev.status} /></View>}
                            <Text style={s.tlDesc}>{ev.description}</Text>
                            <Text style={s.tlLocation}>{ev.location}</Text>
                            <Text style={s.tlDateTime}>{ev.date} · {ev.time}</Text>
                          </View>
                        </View>
                      ))
                    )}
                    <View style={{ height: 12 }} />
                  </ScrollView>
                  {/* View More / View Less — card size NEVER changes */}
                  {order.tracking.length > 3 && (
                    <TouchableOpacity
                      style={{ alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border }}
                      onPress={() => setTrackingExpanded(!trackingExpanded)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: C.primary, fontWeight: "600", fontSize: 13 }}>
                        {trackingExpanded ? "View Less ▲" : `View More (${order.tracking.length - 3} more) ▼`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </Card>
              </View>
            </View>

            {/* ── MIDDLE CONTENT: Orders Table (Full Width) ──────────────── */}
            <View style={{ marginTop: 16 }}>
              <Card style={{ padding: 0 }}>              
                {isWide ? (
                  <View style={s.tblWrap}>
                    <View style={[s.tblRow, s.tblHead, { backgroundColor: C.navy, borderTopLeftRadius: 16, borderTopRightRadius: 16 }]}>
                      <Text style={[s.tblHdr, { flex: 2, color: C.white }]}>Product</Text>
                      <Text style={[s.tblHdr, { flex: 1, color: C.white }]}>SKU</Text>
                      <Text style={[s.tblHdr, { flex: 1.5, color: C.white }]}>Seller</Text>
                      <Text style={[s.tblHdr, { flex: 1, color: C.white }]}>Variants</Text>
                      <Text style={[s.tblHdr, { flex: 1, color: C.white }]}>Qty</Text>
                      <Text style={[s.tblHdr, { flex: 1, color: C.white }]}>Price</Text>
                      <Text style={[s.tblHdr, { flex: 1, color: C.white }]}>Total</Text>
                    </View>
                    {order.items.map((item) => (
                      <View key={item.id} style={s.tblRow}>
                        <View style={[s.tblCell, { flex: 2, flexDirection: "row", alignItems: "center", gap: 10 }]}>
                          <ProductThumb uri={item.imageUrl} size={44} />
                          <View style={{ flex: 1, gap: 4, alignItems: "flex-start" }}>
                            <Text style={s.tblCellTxt} numberOfLines={2}>{item.product}</Text>
                            <TouchableOpacity onPress={() => { if(item.productId) router.push({ pathname: "/productDetails", params: { id: String(item.productId), name: item.product } }); }} activeOpacity={0.7} disabled={!item.productId}>
                              <View style={[s.viewProductBtn, !item.productId && s.viewProductBtnDisabled]}>
                                <BoxArrowUpRightIcon size={11} color={C.primary} />
                                <Text style={s.viewProductTxt}>View</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={s.tblCell}><Text style={s.tblCellSub}>{item.sku}</Text></View>
                        <View style={[s.tblCell, { flex: 1.5 }]}>
                          <Text style={s.tblCellTxt}>{item.seller}</Text>
                        </View>
                        <View style={s.tblCell}><Text style={s.tblCellSub}>{item.variant}</Text></View>
                        <View style={s.tblCell}><Text style={s.tblCellTxt}>{item.qty}</Text></View>
                        <View style={s.tblCell}><Text style={s.tblCellTxt}>{rupee(item.price)}</Text></View>
                        <View style={s.tblCell}><Text style={[s.tblCellTxt, { fontWeight: "700", color: C.primary }]}>{rupee(item.price * item.qty)}</Text></View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{ padding: 14, gap: 12 }}>
                    <Text style={[s.cardTitle, { color: C.navy, marginBottom: 8 }]}>Order Items ({order.items.length} Item)</Text>
                    {order.items.map((item) => (
                      <View key={item.id} style={s.itemCard}>
                        <View style={s.itemCardTop}>
                          <ProductThumb uri={item.imageUrl} size={48} />
                          <Text style={s.itemCardName}>{item.product}</Text>
                          <TouchableOpacity style={[s.viewProductBtn, !item.productId && s.viewProductBtnDisabled]} onPress={() => { if (item.productId) router.push({ pathname: "/productDetails", params: { id: String(item.productId), name: item.product } }); }} activeOpacity={0.7} disabled={!item.productId}>
                            <BoxArrowUpRightIcon size={11} color={C.primary} />
                            <Text style={s.viewProductTxt}>View</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={s.itemCardGrid}>
                          {[
                            ["SKU", item.sku],
                            ["Seller", item.seller],
                            ["Variant", item.variant],
                            ["Qty", String(item.qty)],
                            ["Price", rupee(item.price)],
                            ["Total", rupee(item.price * item.qty)],
                          ].map(([lbl, val]) => (
                            <View key={lbl} style={s.itemCardCell}>
                              <Text style={s.itemCardLbl}>{lbl}</Text>
                              <Text style={[s.itemCardVal, lbl === "Total" && { color: C.primary, fontWeight: "700" }]}>{val}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </View>

            {/* ── LOWER CONTENT: Payment Info, Order Summary, Order Status History (Below Table) ── */}
            <View style={[s.row, !isWide && s.colStack, { alignItems: "stretch", marginTop: 16 }]}>
              {/* Left Column: Payment Info and Order Summary */}
              <View style={[s.colStack, isWide ? { flex: 1 } : { width: "100%" }, { gap: 16 }]}>
                {/* Payment Information */}
                <Card>
                  <CardHeader icon={<WalletIcon size={16} color={C.active} />} title="Payment Information" />
                  <View style={s.cardBodyCompact}>
                    <InfoRow label="Payment Method" value={order.paymentMethod} />
                    <InfoRow label="Payment Status" value={
                      <View style={[s.badge, { backgroundColor: isPaymentPaid(order.paymentStatus) ? C.activeLight : C.warningLight }]}>
                        <Text style={[s.badgeTxt, { color: isPaymentPaid(order.paymentStatus) ? C.active : C.warning }]}>{order.paymentStatus}</Text>
                      </View>
                    } />
                  </View>
                </Card>

                {/* Order Summary */}
                <Card>
                  <CardHeader icon={<NoteIcon size={16} color={C.blue} />} title="Order Summary" />
                  <View style={s.cardBodyCompact}>
                    {[
                      ["Subtotal", rupee(order.subtotal)],
                      ["Shipping", order.shippingCost === 0 ? "Free" : rupee(order.shippingCost)],
                      ["Tax", order.tax === 0 ? "₹0.00" : rupee(order.tax)],
                      ...(order.discount > 0 ? [["Discount", `- ${rupee(order.discount)}`] as const] : []),
                      ...(order.walletDeduction > 0 ? [["Wallet", `- ${rupee(order.walletDeduction)}`] as const] : []),
                      ...(order.referralDiscount > 0 ? [["Referral", `- ${rupee(order.referralDiscount)}`] as const] : []),
                    ].map(([lbl, val]) => (
                      <View key={String(lbl)} style={s.summaryLineRow}>
                        <Text style={s.summaryLineLbl}>{String(lbl)}</Text>
                        <Text style={s.summaryLineVal}>{String(val)}</Text>
                      </View>
                    ))}
                    <View style={s.summaryTotalRow}>
                      <Text style={s.summaryTotalLbl}>Total</Text>
                      <Text style={s.summaryTotalVal}>{rupee(order.total)}</Text>
                    </View>
                  </View>
                </Card>
              </View>

              {/* Right Column: Order Status History */}
              <View style={[isWide ? { flex: 1, alignSelf: "stretch" } : { width: "100%" }]}>
                <Card style={[{ overflow: "hidden" }, isWide ? { flex: 1 } : undefined]}>
                  <CardHeader icon={<SyncIcon size={16} color={C.primary} />} title="Order Status History" 
                    right={
                      <TouchableOpacity style={[s.smBtn, { backgroundColor: C.primary }]} activeOpacity={0.8} onPress={() => { setNewStatus(status); setUpdateModalVisible(true); }}>
                        <AddIcon size={13} color="#FFF" />
                        <Text style={s.smBtnTxt}>Add Status Update</Text>
                      </TouchableOpacity>
                    }
                  />
                  {/* FIXED 320px height — never grows, content scrolls inside */}
                  <ScrollView
                    style={{ height: 320, paddingHorizontal: 18, paddingTop: 12 }}
                    nestedScrollEnabled
                    scrollEnabled={historyExpanded || order.history.length <= 3}
                    showsVerticalScrollIndicator={historyExpanded}
                  >
                    {order.history.map((h, idx) => {
                      const cfg = STATUS_CFG[h.status];
                      return (
                        <View key={idx} style={s.histItem}>
                          <View style={s.histLeft}>
                            <View style={[s.histDot, { backgroundColor: cfg.dot }]} />
                            {idx < order.history.length - 1 && <View style={s.histLine} />}
                          </View>
                          <View style={s.histContent}>
                            <StatusBadge status={h.status} />
                            <Text style={s.histDate}>{h.date}</Text>
                            <Text style={s.histBy}>{h.by}</Text>
                            <Text style={s.histComment}>{h.comment}</Text>
                          </View>
                        </View>
                      );
                    })}
                    <View style={{ height: 12 }} />
                  </ScrollView>
                  {/* View More / View Less — card size NEVER changes */}
                  {order.history.length > 3 && (
                    <TouchableOpacity
                      style={{ alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border }}
                      onPress={() => setHistoryExpanded(!historyExpanded)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: C.primary, fontWeight: "600", fontSize: 13 }}>
                        {historyExpanded ? "View Less ▲" : `View More (${order.history.length - 3} more) ▼`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </Card>
              </View>
            </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Invoice Modal */}
      <InvoiceModal
        orderId={orderId ? Number(orderId) : null}
        visible={invoiceVisible}
        onClose={() => setInvoiceVisible(false)}
      />

      {/* Add Status Update Modal */}
      <Modal
        visible={updateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { width: Math.min(480, width - 32) }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Status Update</Text>
              <TouchableOpacity onPress={() => setUpdateModalVisible(false)}>
                <CloseIcon color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={s.modalLabel}>Select Status</Text>
              <View style={s.statusGrid}>
                {STATUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      s.statusBtn,
                      newStatus === opt.value && s.statusBtnActive
                    ]}
                    onPress={() => setNewStatus(opt.value)}
                    activeOpacity={0.7}
                  >
                    <View style={s.statusBtnIcon}>{opt.icon}</View>
                    <Text style={[
                      s.statusBtnTxt,
                      newStatus === opt.value && s.statusBtnTxtActive
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.modalLabel, { marginTop: 24 }]}>Comment</Text>
              <TextInput
                style={s.modalInput}
                placeholder="Add a comment (Optional)..."
                placeholderTextColor={C.sub}
                value={statusComment}
                onChangeText={setStatusComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={s.notifyRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.notifyLabel}>Notify Customer</Text>
                  <Text style={s.notifySub}>
                    An email will be sent to the customer about this status update
                  </Text>
                </View>
                <Switch
                  value={notifyCustomer}
                  onValueChange={setNotifyCustomer}
                  trackColor={{ false: "#D1D5DB", true: C.primary }}
                  thumbColor="#FFF"
                />
              </View>
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setUpdateModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={s.modalCancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSaveBtn, statusSaving && { opacity: 0.7 }]}
                onPress={async () => {
                  if (statusSaving) return;
                  await applyStatusUpdate(
                    newStatus,
                    statusComment.trim() || undefined,
                    notifyCustomer
                  );
                  setUpdateModalVisible(false);
                  setStatusComment("");
                  setNotifyCustomer(false);
                }}
                activeOpacity={0.7}
                disabled={statusSaving}
              >
                <Text style={s.modalSaveBtnTxt}>
                  {statusSaving ? "Saving…" : "Update Status"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
        </>
    )}
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingTop: 20 },
  body: { gap: 16 },
  row: { flexDirection: "row", gap: 16 },
  colStack: { flexDirection: "column" },

  // ── Top Header ────────────────────────────────────────────────────────────
  header: { marginHorizontal: 2, marginTop: 12, backgroundColor: C.navy, paddingBottom: 44, borderRadius: 24 },
  headerInner:   { flexDirection: "row", alignItems: "center" },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  headerBackBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  hTitle:        { color: "#fff", fontWeight: "700", letterSpacing: -0.3 },
  hSub:          { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 },

  // ── Layout helpers ──────────────────────────────────────────────────────────
  col4: { flexBasis: "23.5%", flexShrink: 0, flexGrow: 1 },
  col6: { flexBasis: "48%", flexShrink: 0, flexGrow: 1 },
  col12: { width: "100%" },

  // ── Page Header ────────────────────────────────────────────────────────────
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 16 },
  pageHeaderMobile: { flexDirection: "column", alignItems: "stretch" },
  pageHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 260 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 4, paddingRight: 10, marginBottom: 4 },
  backBtnTxt: { color: C.sub, fontSize: 13, fontWeight: "500" },
  pageTitle: { fontSize: 24, fontWeight: "700", color: C.navy, letterSpacing: -0.5 },
  pageSubtitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 2 },
  pageSubtitle: { fontSize: 13, color: C.sub },
  pageSubtitleDot: { fontSize: 13, color: C.border },
  headerStatusPill: { marginLeft: 4 },
  pageHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  pageHeaderRightMobile: { width: "100%", justifyContent: "flex-start", marginTop: 4 },

  // ── Stats Row ──────────────────────────────────────────────────────────────
  statsRow: { flexDirection: "row", alignItems: "stretch", paddingVertical: 16, paddingHorizontal: 20 },
  statsRowMobile: { flexDirection: "row", flexWrap: "wrap", gap: 16, paddingVertical: 16, paddingHorizontal: 16 },
  statBlock: { minWidth: 140, flex: 1, paddingVertical: 4, paddingHorizontal: 4 },
  statHeader: { marginBottom: 6 },
  statLabel: { fontSize: 12, color: C.sub, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 14, fontWeight: "700", color: C.text },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 4, marginHorizontal: 8 },

  // ── Actions ────────────────────────────────────────────────────────────────
  actionBtns: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 },
  actionBtnTxt: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
    overflow: "visible",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexWrap: "wrap",
    gap: 10,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFF5EC",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  cardBody: { padding: 18, gap: 12 },
  cardBodyCompact: { padding: 16, gap: 8 },

  // ── Status dropdown ────────────────────────────────────────────────────────
  dropBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: C.surface,
  },
  dropDot: { width: 7, height: 7, borderRadius: 3.5 },
  dropBtnTxt: { fontSize: 13, fontWeight: "700" },
  dropOverlay: {
    position: "absolute",
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 90,
  },
  dropMenu: {
    position: "absolute",
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 12,
    zIndex: 999,
    minWidth: 210,
    paddingVertical: 6,
  },
  dropItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropItemActive: { backgroundColor: C.cardBg },
  dropItemIcon: { width: 22, alignItems: "center" },
  dropItemTxt: { fontSize: 13, color: C.text },
  dropDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 4,
    marginHorizontal: 14,
  },

  // ── Status badge ───────────────────────────────────────────────────────────
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 12, fontWeight: "700" },

  // ── Info row ───────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F0EA",
  },
  infoLabel: { fontSize: 12, color: C.sub, flex: 1 },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    flex: 1.5,
    textAlign: "right",
  },
  infoValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1.5,
    justifyContent: "flex-end",
  },
  custNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1.5,
    justifyContent: "flex-end",
  },

  // ── Address ────────────────────────────────────────────────────────────────
  addrRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  addrBlock: { flex: 1, gap: 8 },
  addrTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  addrBody: {},
  addrLine: { fontSize: 13, color: C.sub, lineHeight: 20 },
  addrVertDivider: {
    width: 1,
    backgroundColor: C.border,
    alignSelf: "stretch",
  },
  addrHorizDivider: { height: 1, backgroundColor: C.border },

  // ── Small button ───────────────────────────────────────────────────────────
  smBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  smBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // ── Track button ───────────────────────────────────────────────────────────
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
  },
  trackBtnDisabled: {
    opacity: 0.5,
  },
  trackBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // ── Loading / error states ─────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: C.text,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color: C.inactive,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 14,
  },
  errorRetryBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  errorRetryTxt: {
    color: C.white,
    fontWeight: "700",
  },

  // ── Tracking timeline ──────────────────────────────────────────────────────
  tlItem: { flexDirection: "row", gap: 12, minHeight: 56 },
  tlLeft: { alignItems: "center", width: 16 },
  tlDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.border,
    borderWidth: 2,
    borderColor: C.border,
  },
  tlDotActive: { backgroundColor: C.primary, borderColor: C.primary },
  tlLine: { flex: 1, width: 2, backgroundColor: C.border, marginTop: 3 },
  tlContent: { flex: 1, paddingBottom: 16 },
  tlDesc: { fontSize: 13, fontWeight: "700", color: C.text },
  tlLocation: { fontSize: 12, color: C.sub, marginTop: 2 },
  tlDateTime: { fontSize: 11, color: C.sub, marginTop: 2 },
  emptyTrackingTxt: { fontSize: 13, color: C.sub, fontStyle: "italic" },

  // ── Order items table (desktop) ────────────────────────────────────────────
  tblWrap: { borderTopWidth: 1, borderTopColor: C.border },
  tblHead: { backgroundColor: C.cardBg },
  tblRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tblHdr: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tblCell: { flex: 1, paddingRight: 8 },
  tblCellTxt: { fontSize: 13, color: C.text },
  tblCellSub: { fontSize: 12, color: C.sub },

  // View product link
  viewProductBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  viewProductBtnDisabled: {
    opacity: 0.5,
  },
  viewProductTxt: { fontSize: 11, color: C.primary, fontWeight: "600" },

  // ── Order item cards (mobile/tablet) ──────────────────────────────────────
  itemCard: { backgroundColor: C.cardBg, borderRadius: 12, padding: 13 },
  itemCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  itemCardName: { flex: 1, fontSize: 13, fontWeight: "700", color: C.text },
  itemCardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  itemCardCell: { width: "48%", gap: 2 },
  itemCardLbl: {
    fontSize: 10,
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  itemCardVal: { fontSize: 13, fontWeight: "600", color: C.text },

  // ── Summary boxes ─────────────────────────────────────────────────────────
  summaryBox: { gap: 10 },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.cardBg,
    borderRadius: 10,
    padding: 12,
  },
  summaryLbl: { fontSize: 11, color: C.sub },
  summaryVal: { fontSize: 13, fontWeight: "600", color: C.text },
  summaryLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F0EA",
  },
  summaryLineLbl: { fontSize: 13, color: C.sub },
  summaryLineVal: { fontSize: 13, color: C.text },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 2,
  },
  summaryTotalLbl: { fontSize: 15, fontWeight: "800", color: C.text },
  summaryTotalVal: { fontSize: 16, fontWeight: "800", color: C.primary },

  // ── Status history ─────────────────────────────────────────────────────────
  histItem: { flexDirection: "row", gap: 12, minHeight: 72 },
  histLeft: { alignItems: "center", width: 16 },
  histDot: { width: 12, height: 12, borderRadius: 6 },
  histLine: { flex: 1, width: 2, backgroundColor: C.border, marginTop: 4 },
  histContent: { flex: 1, paddingBottom: 18 },
  histTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  histBy: { fontSize: 11, color: C.sub },
  histDate: { fontSize: 11, color: C.sub, marginTop: 4 },
  histComment: {
    fontSize: 13,
    color: C.text,
    marginTop: 4,
    fontStyle: "italic",
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: C.bg,
    borderRadius: 12,
    maxHeight: "90%",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#F9FAFB",
    minWidth: "48%",
    gap: 8,
  },
  statusBtnActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  statusBtnIcon: {
    opacity: 0.8,
  },
  statusBtnTxt: {
    fontSize: 13,
    color: C.sub,
    fontWeight: "500",
  },
  statusBtnTxtActive: {
    color: C.primary,
    fontWeight: "600",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: C.text,
    backgroundColor: "#F9FAFB",
    minHeight: 80,
  },
  notifyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  notifyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    marginBottom: 4,
  },
  notifySub: {
    fontSize: 12,
    color: C.sub,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderColor: C.border,
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalCancelBtnTxt: {
    fontSize: 14,
    fontWeight: "600",
    color: C.sub,
  },
  modalSaveBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveBtnTxt: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
});