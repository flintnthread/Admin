import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
} from "react-native-svg";
import AdminLayout from "../components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import type { OrderSummary } from "@/lib/api/types";
import { mapOrderRow } from "@/lib/mappers";
import { fetchOrders, updateOrderGstStatus } from "@/services/orderApi";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  navy:        "#1E2B6B",
  navyDeep:    "#151D4F",
  navyMid:     "#1A2B5E",
  navyLight:   "#2D3E8A",
  green:       "#22C55E",
  greenLight:  "#86EFAC",
  greenPale:   "#F0FDF4",
  red:         "#EF4444",
  redLight:    "#FCA5A5",
  redPale:     "#FEF2F2",
  yellow:      "#F59E0B",
  yellowPale:  "#FFFBEB",
  blue:        "#3B82F6",
  bluePale:    "#EFF6FF",
  orange:      "#F97316",
  orangePale:  "#FFF7ED",
  teal:        "#14B8A6",
  cyan:        "#06B6D4",
  white:       "#FFFFFF",
  bg:          "#F7F8FC",
  card:        "#FFFFFF",
  border:      "#E5E7EB",
  textDark:    "#111827",
  textMid:     "#374151",
  textLight:   "#9CA3AF",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentType = "Cash on Delivery" | "Online Payment" | "UPI" | "Card";
type OrderStatus = "Processing" | "Pending" | "Completed" | "Cancelled" | "Shipped";
type GSTStatus   = "Filed" | "Not Filed";
type ViewMode    = "grid" | "list";
type SortOption  = "newest" | "oldest" | "amount_high" | "amount_low";

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
const STATUS_CFG: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  Processing: { bg: C.bluePale,   text: C.blue,   dot: C.blue   },
  Pending:    { bg: C.yellowPale, text: C.yellow,  dot: C.yellow  },
  Completed:  { bg: C.greenPale,  text: C.green,   dot: C.green   },
  Cancelled:  { bg: C.redPale,    text: C.red,     dot: C.red     },
  Shipped:    { bg: "#F5F3FF",    text: "#7C3AED", dot: "#7C3AED" },
};

const STATUS_FILTERS = ["All", "Processing", "Pending", "Completed", "Shipped", "Cancelled"];
const PAYMENT_FILTERS = ["All Payments", "Cash on Delivery", "Online Payment", "UPI", "Card"];
const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest",      label: "Newest First"         },
  { key: "oldest",      label: "Oldest First"         },
  { key: "amount_high", label: "Amount (High to Low)" },
  { key: "amount_low",  label: "Amount (Low to High)" },
];

const ORDERS_PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCur = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// ─── Mapper ───────────────────────────────────────────────────────────────────
function toUiOrder(row: ReturnType<typeof mapOrderRow>, raw: OrderSummary): Order {
  const createdAt = raw.createdAt ? new Date(raw.createdAt) : null;
  const validDate = createdAt && !Number.isNaN(createdAt.getTime());
  const statusMap: Record<string, OrderStatus> = {
    processing: "Processing", pending: "Pending", completed: "Completed",
    cancelled: "Cancelled", shipped: "Shipped",
  };
  const paymentMap: Record<string, PaymentType> = {
    cod: "Cash on Delivery", cash_on_delivery: "Cash on Delivery",
    upi: "UPI", card: "Card", online: "Online Payment",
  };
  return {
    id: String(row.id),
    orderNumber: row.orderId.startsWith("#") ? row.orderId : `#${row.orderId}`,
    date: validDate
      ? createdAt!.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : row.date,
    time: validDate
      ? createdAt!.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "",
    customer: { name: row.customer, email: row.email },
    sellerGroups: [],
    amount: typeof raw.totalAmount === "number" ? raw.totalAmount : Number(raw.totalAmount ?? 0),
    paymentType: paymentMap[(raw.paymentMethod ?? raw.paymentStatus ?? "").toLowerCase()] ?? "Cash on Delivery",
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
    <Path d="M11 19A8 8 0 1 0 11 3a8 8 0 0 0 0 16ZM21 21l-4.35-4.35" stroke={C.textLight} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const GridIcon = ({ active }: { active: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke={active ? C.white : C.textMid} strokeWidth={2} />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke={active ? C.white : C.textMid} strokeWidth={2} />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke={active ? C.white : C.textMid} strokeWidth={2} />
    <Rect x="14" y="14" width="7" height="7" rx="1" stroke={active ? C.white : C.textMid} strokeWidth={2} />
  </Svg>
);
const ListIcon = ({ active }: { active: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Line x1="8" y1="6" x2="21" y2="6" stroke={active ? C.white : C.textMid} strokeWidth={2} strokeLinecap="round" />
    <Line x1="8" y1="12" x2="21" y2="12" stroke={active ? C.white : C.textMid} strokeWidth={2} strokeLinecap="round" />
    <Line x1="8" y1="18" x2="21" y2="18" stroke={active ? C.white : C.textMid} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="6" x2="3.01" y2="6" stroke={active ? C.white : C.textMid} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="12" x2="3.01" y2="12" stroke={active ? C.white : C.textMid} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="18" x2="3.01" y2="18" stroke={active ? C.white : C.textMid} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const SortIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M7 12h10M11 18h2" stroke={C.navy} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const ExportIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={C.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="7 10 12 15 17 10" stroke={C.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15V3" stroke={C.white} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const ChevronDownIcon = ({ color = C.textLight, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ChevronLeftIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ChevronRightIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const EyeIcon = ({ color = C.white }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
  </Svg>
);
const CopyIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PrintIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Polyline points="6 9 6 2 18 2 18 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="6" y="14" width="12" height="8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PdfIcon = ({ color = C.red }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const FileIcon = ({ color = C.navy }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const TruckIcon = ({ color = C.orange }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Rect x="1" y="3" width="15" height="13" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 8h4l3 3v5h-7V8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth={1.8} />
    <Circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth={1.8} />
  </Svg>
);
const CheckIcon = ({ color = C.green }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="22 4 12 14.01 9 11.01" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ShopIcon = ({ color = C.orange }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 6h18M16 10a4 4 0 0 1-8 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const UserIcon = ({ color = C.textLight }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.8} />
  </Svg>
);
const CalendarIcon = ({ color = C.textLight }: { color?: string }) => (
  <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={1.6} />
    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);
const MoreIcon = ({ color = C.textLight }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="5" r="1" fill={color} />
    <Circle cx="12" cy="12" r="1" fill={color} />
    <Circle cx="12" cy="19" r="1" fill={color} />
  </Svg>
);
const CloseIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const DownloadIcon = ({ color = C.green }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="7 10 12 15 17 10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15V3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const OrderBoxIcon = ({ color = C.white }: { color?: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 22.08V12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
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
const GSTBadge = ({ status, onMark }: { status: GSTStatus; onMark: () => void }) => {
  if (status === "Filed") {
    return (
      <View style={s.gstFiled}>
        <CheckIcon color={C.green} />
        <Text style={[s.gstText, { color: "#15803D" }]}>Filed</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity onPress={onMark} style={s.gstUnfiled} activeOpacity={0.75}>
      <Text style={[s.gstText, { color: "#B45309" }]}>Mark Filed</Text>
    </TouchableOpacity>
  );
};

// ─── Sort Modal ───────────────────────────────────────────────────────────────
const SortModal = ({
  visible, isWeb, current, onSelect, onClose,
}: {
  visible: boolean; isWeb: boolean; current: SortOption;
  onSelect: (s: SortOption) => void; onClose: () => void;
}) => {
  if (!visible) return null;

  const content = (
    <View style={[s.sortMenu, isWeb && s.sortMenuWeb]}>
      <View style={s.sortHeader}>
        <Text style={s.sortTitle}>Sort Orders</Text>
        {isWeb && (
          <TouchableOpacity onPress={onClose} style={s.sortDismiss} activeOpacity={0.7}>
            <CloseIcon />
          </TouchableOpacity>
        )}
      </View>
      {SORT_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[s.sortItem, current === opt.key && s.sortItemActive]}
          onPress={() => { onSelect(opt.key); onClose(); }}
          activeOpacity={0.7}
        >
          <Text style={[s.sortItemText, current === opt.key && s.sortItemTextActive]}>
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
        <TouchableOpacity style={s.sortCancelBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={s.sortCancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isWeb) {
    return (
      <View style={s.sortOverlayWeb}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        {content}
      </View>
    );
  }

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={s.sortOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        {content}
      </View>
    </Modal>
  );
};

// ─── Action Menu ──────────────────────────────────────────────────────────────
const ActionMenu = ({
  order, visible, onClose, onView, onGST, isWeb,
}: {
  order: Order; visible: boolean; onClose: () => void;
  onView: (o: Order) => void; onGST: (id: string) => void; isWeb: boolean;
}) => {
  if (!visible) return null;

  const actions = [
    { label: "View Details",      icon: <EyeIcon color={C.navy} />,   onPress: () => { onView(order); onClose(); } },
    { label: "Copy Order ID",     icon: <CopyIcon />,                  onPress: () => { copyToClipboard(order.orderNumber); onClose(); } },
    { label: "Print Order",       icon: <PrintIcon />,                 onPress: () => { Alert.alert("Print", `Printing ${order.orderNumber}`); onClose(); } },
    { label: "Export PDF",        icon: <PdfIcon />,                   onPress: () => { Alert.alert("PDF", `Exporting ${order.orderNumber}`); onClose(); } },
    { label: "Download Invoice",  icon: <DownloadIcon color={C.navy}/>, onPress: () => { Alert.alert("Invoice", `Downloading invoice`); onClose(); } },
    { label: "Download Label",    icon: <DownloadIcon color={C.orange}/>, onPress: () => { Alert.alert("Label", `Downloading label`); onClose(); } },
    ...(order.gstStatus !== "Filed"
      ? [{ label: "Mark GST Filed", icon: <CheckIcon />, onPress: () => { onGST(order.id); onClose(); } }]
      : []),
  ];

  const menu = (
    <View style={[s.actionMenu, isWeb && s.actionMenuWeb]}>
      <Text style={s.actionMenuTitle}>Order Actions</Text>
      {actions.map((a, i) => (
        <TouchableOpacity key={i} style={s.actionItem} onPress={a.onPress} activeOpacity={0.7}>
          <View style={s.actionItemIcon}>{a.icon}</View>
          <Text style={s.actionItemText}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isWeb) {
    return (
      <View style={s.actionOverlayWeb}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        {menu}
      </View>
    );
  }

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={s.actionOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        {menu}
      </View>
    </Modal>
  );
};

// ─── Seller Sub-Order Block ───────────────────────────────────────────────────
const SellerSubOrder = ({
  group, isLast,
}: {
  group: SellerGroup; isLast: boolean;
}) => (
  <View style={[s.subOrderBlock, !isLast && s.subOrderBorder]}>
    <View style={s.subOrderHeader}>
      <View style={s.sellerAvatarWrap}>
        <ShopIcon color={C.orange} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.sellerName} numberOfLines={1}>{group.seller.name}</Text>
        <Text style={s.sellerEmail} numberOfLines={1}>{group.seller.email}</Text>
        {group.subOrderId && (
          <Text style={s.subOrderId}>Sub-order: {group.subOrderId}</Text>
        )}
      </View>
    </View>

    {/* Products horizontal scroll */}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.productScroll}>
      <View style={s.productRow}>
        {group.products.map((p) => (
          <View key={p.id} style={s.productItem}>
            {p.image ? (
              <Image source={{ uri: p.image }} style={s.productThumb} resizeMode="cover" />
            ) : (
              <View style={s.productThumbEmpty}>
                <ShopIcon color={C.textLight} />
              </View>
            )}
            {p.name ? <Text style={s.productName} numberOfLines={2}>{p.name}</Text> : null}
            {p.price !== undefined ? <Text style={s.productPrice}>{fmtCur(p.price)}</Text> : null}
          </View>
        ))}
      </View>
    </ScrollView>

    {/* Per-seller docs */}
    <View style={s.sellerDocRow}>
      <TouchableOpacity style={s.sellerDocBtn} activeOpacity={0.75}>
        <FileIcon color={C.navy} />
        <Text style={s.sellerDocBtnText}>Invoice</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.sellerDocBtn, s.sellerDocBtnShip]} activeOpacity={0.75}>
        <TruckIcon color={C.orange} />
        <Text style={[s.sellerDocBtnText, { color: C.orange }]}>Label</Text>
      </TouchableOpacity>
      {group.trackingId && (
        <View style={s.trackingChip}>
          <Text style={s.trackingText}>#{group.trackingId}</Text>
        </View>
      )}
    </View>
  </View>
);

// ─── Grid Order Card ──────────────────────────────────────────────────────────
const GridOrderCard = ({
  order, onView, onGST, onMore, isWeb,
}: {
  order: Order; onView: (o: Order) => void; onGST: (id: string) => void;
  onMore: (o: Order) => void; isWeb: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[order.status];

  return (
    <View style={[s.gridCard, isWeb && s.gridCardWeb]}>
      {/* Card top accent */}
      <View style={[s.cardAccent, { backgroundColor: cfg.dot }]} />

      {/* Header row */}
      <View style={s.gridCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={s.orderIdRow}>
            <Text style={s.gridOrderNum}>{order.orderNumber}</Text>
            <TouchableOpacity onPress={() => copyToClipboard(order.orderNumber)} style={s.copyBtn} activeOpacity={0.7}>
              <CopyIcon color={C.textLight} />
            </TouchableOpacity>
          </View>
          <View style={s.metaRow}>
            <CalendarIcon />
            <Text style={s.metaText}> {order.date}</Text>
            {order.time ? <Text style={s.metaText}> · {order.time}</Text> : null}
          </View>
        </View>
        <View style={s.headerRight}>
          <StatusBadge status={order.status} />
          <TouchableOpacity onPress={() => onMore(order)} style={s.moreBtn} activeOpacity={0.7}>
            <MoreIcon />
          </TouchableOpacity>
        </View>
      </View>

      {/* Customer row */}
      <View style={s.gridCustomerRow}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{getInitials(order.customer.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.customerName} numberOfLines={1}>{order.customer.name}</Text>
          <Text style={s.customerEmail} numberOfLines={1}>{order.customer.email}</Text>
        </View>
      </View>

      {/* Seller groups */}
      {order.sellerGroups.length > 0 && (
        <View style={s.sellerSection}>
          <View style={s.sellerSectionHeader}>
            <ShopIcon color={C.textLight} />
            <Text style={s.sectionLabel}>
              {order.sellerGroups.length > 1
                ? `${order.sellerGroups.length} SELLERS · SEPARATE SUBORDERS`
                : "SELLER"}
            </Text>
          </View>
          {(expanded ? order.sellerGroups : order.sellerGroups.slice(0, 1)).map((g, i) => (
            <SellerSubOrder key={i} group={g} isLast={i === order.sellerGroups.length - 1} />
          ))}
          {order.sellerGroups.length > 1 && (
            <TouchableOpacity
              style={s.viewMoreBtn}
              onPress={() => setExpanded(!expanded)}
              activeOpacity={0.7}
            >
              <Text style={s.viewMoreText}>
                {expanded ? "Show less" : `+ ${order.sellerGroups.length - 1} more seller${order.sellerGroups.length > 2 ? "s" : ""}`}
              </Text>
              <ChevronDownIcon
                color={C.navy}
                size={12}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Amount strip */}
      <View style={s.amountStrip}>
        <View>
          <Text style={s.amountLabel}>Order Total</Text>
          <Text style={s.amountVal}>{fmtCur(order.amount)}</Text>
        </View>
        <View style={s.payChip}>
          <TruckIcon color={C.textMid} />
          <Text style={s.payChipText}>{order.paymentType}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={s.gridCardFooter}>
        <View>
          <Text style={s.footerLabel}>GST</Text>
          <GSTBadge status={order.gstStatus} onMark={() => onGST(order.id)} />
        </View>
        <TouchableOpacity style={s.viewBtn} onPress={() => onView(order)} activeOpacity={0.85}>
          <EyeIcon color={C.white} />
          <Text style={s.viewBtnText}>View Details</Text>
          <ChevronRightIcon color={C.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── List Table Row ───────────────────────────────────────────────────────────
const ListTableRow = ({
  order, idx, onView, onGST, onMore,
}: {
  order: Order; idx: number; onView: (o: Order) => void;
  onGST: (id: string) => void; onMore: (o: Order) => void;
}) => (
  <View style={[s.tRow, idx % 2 === 1 && s.tRowAlt]}>
    {/* Order # */}
    <View style={[s.tcell, s.colOrder]}>
      <View style={s.orderIdRow}>
        <Text style={s.tdOrderNum} numberOfLines={1}>{order.orderNumber}</Text>
        <TouchableOpacity onPress={() => copyToClipboard(order.orderNumber)} activeOpacity={0.7}>
          <CopyIcon color={C.textLight} />
        </TouchableOpacity>
      </View>
      <View style={s.metaRow}>
        <CalendarIcon />
        <Text style={s.metaText}> {order.date}</Text>
      </View>
    </View>

    {/* Customer */}
    <View style={[s.tcell, s.colCustomer]}>
      <View style={s.customerRowInner}>
        <View style={s.avatarSm}>
          <Text style={s.avatarSmText}>{getInitials(order.customer.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.tdName} numberOfLines={1}>{order.customer.name}</Text>
          <Text style={s.tdEmail} numberOfLines={1}>{order.customer.email}</Text>
        </View>
      </View>
    </View>

    {/* Seller */}
    <View style={[s.tcell, s.colSeller]}>
      {order.sellerGroups.length === 0 ? (
        <Text style={s.tdMuted}>—</Text>
      ) : (
        order.sellerGroups.map((g, i) => (
          <View key={i} style={[i > 0 && { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }]}>
            <Text style={s.tdSellerName} numberOfLines={1}>{g.seller.name}</Text>
            {g.subOrderId && <Text style={s.tdMuted} numberOfLines={1}>#{g.subOrderId}</Text>}
          </View>
        ))
      )}
    </View>

    {/* Products with images */}
    <View style={[s.tcell, s.colProducts]}>
      {order.sellerGroups.length === 0 ? (
        <Text style={s.tdMuted}>—</Text>
      ) : (
        order.sellerGroups.map((g, gi) => (
          <View key={gi} style={[gi > 0 && { marginTop: 6 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {g.products.map((p) => (
                  p.image ? (
                    <Image key={p.id} source={{ uri: p.image }} style={s.tableThumb} resizeMode="cover" />
                  ) : (
                    <View key={p.id} style={s.tableThumbEmpty} />
                  )
                ))}
                {g.products.length === 0 && <View style={s.tableThumbEmpty} />}
              </View>
            </ScrollView>
          </View>
        ))
      )}
    </View>

    {/* Amount */}
    <View style={[s.tcell, s.colAmount]}>
      <Text style={s.tdAmount}>{fmtCur(order.amount)}</Text>
      <Text style={s.tdPayment} numberOfLines={1}>{order.paymentType}</Text>
    </View>

    {/* Status */}
    <View style={[s.tcell, s.colStatus]}>
      <StatusBadge status={order.status} />
    </View>

    {/* GST */}
    <View style={[s.tcell, s.colGst]}>
      <GSTBadge status={order.gstStatus} onMark={() => onGST(order.id)} />
    </View>

    {/* Invoice / Label */}
    <View style={[s.tcell, s.colDocs]}>
      {order.sellerGroups.map((g, i) => (
        <View key={i} style={[s.tableDocRow, i > 0 && { marginTop: 4 }]}>
          <TouchableOpacity style={s.tableDocBtn} activeOpacity={0.75}>
            <FileIcon color={C.navy} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.tableDocBtn, { borderColor: "#FED7AA" }]} activeOpacity={0.75}>
            <TruckIcon color={C.orange} />
          </TouchableOpacity>
        </View>
      ))}
    </View>

    {/* Actions */}
    <View style={[s.tcell, s.colAction]}>
      <View style={s.tableActions}>
        <TouchableOpacity style={s.viewBtnSm} onPress={() => onView(order)} activeOpacity={0.85}>
          <EyeIcon color={C.white} />
          <Text style={s.viewBtnSmText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.moreBtnSm} onPress={() => onMore(order)} activeOpacity={0.7}>
          <MoreIcon color={C.textMid} />
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
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  if (total > 1) pages.push(total);
  return pages;
}

const PaginationBar = ({
  page, total, rangeStart, rangeEnd, totalElements, onPrev, onNext, onPage,
}: {
  page: number; total: number; rangeStart: number; rangeEnd: number;
  totalElements: number; onPrev: () => void; onNext: () => void; onPage: (p: number) => void;
}) => (
  <View style={s.pagination}>
    <Text style={s.paginationInfo}>Showing {rangeStart}–{rangeEnd} of {totalElements} orders</Text>
    {total > 1 && (
      <View style={s.paginationControls}>
        <TouchableOpacity style={[s.pageBtn, page <= 1 && s.pageBtnOff]} onPress={onPrev} disabled={page <= 1}>
          <ChevronLeftIcon color={page <= 1 ? C.textLight : C.textMid} />
        </TouchableOpacity>
        {buildPages(page, total).map((num, i) =>
          num === "…" ? (
            <Text key={`e-${i}`} style={s.pageEllipsis}>…</Text>
          ) : (
            <TouchableOpacity
              key={num}
              style={[s.pageBtn, num === page && s.pageBtnActive]}
              onPress={() => onPage(num as number)}
            >
              <Text style={[s.pageBtnText, num === page && s.pageBtnTextActive]}>{num}</Text>
            </TouchableOpacity>
          )
        )}
        <TouchableOpacity style={[s.pageBtn, page >= total && s.pageBtnOff]} onPress={onNext} disabled={page >= total}>
          <ChevronRightIcon color={page >= total ? C.textLight : C.textMid} />
        </TouchableOpacity>
      </View>
    )}
  </View>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function OrdersScreen({ navigation }: { navigation?: any }) {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [orders, setOrders]               = useState<Order[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [currentPage, setCurrentPage]     = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages]       = useState(0);

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All Payments");
  const [sortOption, setSortOption]       = useState<SortOption>("newest");
  const [viewMode, setViewMode]           = useState<ViewMode>("grid");
  const [sortVisible, setSortVisible]     = useState(false);
  const [activeAction, setActiveAction]   = useState<Order | null>(null);

  // ── Load ──
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchOrders({ page: currentPage - 1, size: ORDERS_PAGE_SIZE });
      setOrders(page.items.map((item) => toUiOrder(mapOrderRow(item), item)));
      setTotalElements(page.totalElements);
      setTotalPages(page.totalPages);
      if (currentPage > page.totalPages && page.totalPages > 0) setCurrentPage(page.totalPages);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleView = useCallback((o: Order) => {
    if (navigation) navigation.navigate("OrderDetails", { order: o });
  }, [navigation]);

  const handleGST = useCallback(async (id: string) => {
    try {
      await updateOrderGstStatus(Number(id), "Filed");
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, gstStatus: "Filed" } : o)));
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to update GST status.");
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ["Order #", "Date", "Customer", "Email", "Amount", "Payment", "Status", "GST"];
    const rows = filtered.map((o) => [
      o.orderNumber, o.date, o.customer.name, o.customer.email,
      o.amount, o.paymentType, o.status, o.gstStatus,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "orders.csv"; a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert("Export", "CSV exported successfully");
    }
  }, []);

  // ── Filter + Sort ──
  const filtered = useMemo(() => {
    let result = orders.filter((o) => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.email.toLowerCase().includes(q);
      const matchStatus  = statusFilter  === "All"          || o.status      === statusFilter;
      const matchPayment = paymentFilter === "All Payments" || o.paymentType === paymentFilter;
      return matchSearch && matchStatus && matchPayment;
    });

    result = [...result].sort((a, b) => {
      if (sortOption === "amount_high") return b.amount - a.amount;
      if (sortOption === "amount_low")  return a.amount - b.amount;
      if (sortOption === "oldest")      return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date); // newest
    });

    return result;
  }, [orders, search, statusFilter, paymentFilter, sortOption]);

  const rangeStart = totalElements === 0 ? 0 : (currentPage - 1) * ORDERS_PAGE_SIZE + 1;
  const rangeEnd   = Math.min(currentPage * ORDERS_PAGE_SIZE, totalElements);

  // Stats
  const thisMonth = orders.filter((o) => {
    const d = new Date(o.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const monthRevenue = orders
    .filter((o) => {
      const d = new Date(o.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + o.amount, 0);
  const pendingPayment = orders.filter((o) => o.status === "Pending").length;

  const currentSortLabel = SORT_OPTIONS.find((s) => s.key === sortOption)?.label ?? "Newest First";

  return (
    <AdminLayout>
      <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={s.headerBlock}>
            <View style={s.headerTop}>
              <View style={s.headerLeft}>
                <View style={s.headerIcon}>
                  <OrderBoxIcon color={C.white} />
                </View>
                <View>
                  <Text style={s.headerTitle}>Orders Management</Text>
                  <Text style={s.headerSub}>Manage and track all customer orders</Text>
                </View>
              </View>
              <View style={s.headerActions}>
                <TouchableOpacity style={s.exportBtn} onPress={handleExportCSV} activeOpacity={0.85}>
                  <ExportIcon />
                  <Text style={s.exportBtnText}>Export CSV</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Overlapping status filter pills — scrollable */}
            <View style={s.filterPillsWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterPillsRow}
              >
                {STATUS_FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[s.filterPill, statusFilter === f && s.filterPillActive]}
                    onPress={() => { setStatusFilter(f); setCurrentPage(1); }}
                    activeOpacity={0.75}
                  >
                    {statusFilter === f && (
                      <View style={[s.filterPillDot, {
                        backgroundColor: f === "All" ? C.white : STATUS_CFG[f as OrderStatus]?.dot ?? C.white,
                      }]} />
                    )}
                    <Text style={[s.filterPillText, statusFilter === f && s.filterPillTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* ── Stats Cards ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.statsRow}
          >
            {[
              { label: "Total Orders",      value: String(totalElements), accent: C.navy    },
              { label: "This Month",        value: String(thisMonth),     accent: C.teal    },
              { label: "Monthly Revenue",   value: fmtCur(monthRevenue),  accent: C.green   },
              { label: "Pending Payment",   value: String(pendingPayment), accent: C.orange  },
            ].map((stat, i) => (
              <View key={i} style={s.statCard}>
                <View style={[s.statAccent, { backgroundColor: stat.accent }]} />
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </ScrollView>

          {/* ── Toolbar ── */}
          <View style={s.toolbar}>
            {/* Search */}
            <View style={s.searchBox}>
              <SearchIcon />
              <TextInput
                style={s.searchInput}
                placeholder="Search orders, customers…"
                placeholderTextColor={C.textLight}
                value={search}
                onChangeText={(t) => { setSearch(t); setCurrentPage(1); }}
              />
            </View>

            <View style={s.toolbarRight}>
              {/* Payment filter */}
              <View style={s.paymentDropWrap}>
                <TouchableOpacity
                  style={s.paymentDrop}
                  onPress={() => {
                    const idx = PAYMENT_FILTERS.indexOf(paymentFilter);
                    const next = PAYMENT_FILTERS[(idx + 1) % PAYMENT_FILTERS.length];
                    setPaymentFilter(next);
                    setCurrentPage(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={s.paymentDropText} numberOfLines={1}>
                    {paymentFilter === "All Payments" ? "Payment" : paymentFilter}
                  </Text>
                  <ChevronDownIcon />
                </TouchableOpacity>
              </View>

              {/* Sort */}
              <TouchableOpacity style={s.sortBtn} onPress={() => setSortVisible(true)} activeOpacity={0.8}>
                <SortIcon />
                <Text style={s.sortBtnText} numberOfLines={1}>
                  {isWeb ? currentSortLabel : "Sort"}
                </Text>
                <ChevronDownIcon color={C.navy} />
              </TouchableOpacity>

              {/* View toggle */}
              <View style={s.viewToggle}>
                <TouchableOpacity
                  style={[s.viewToggleBtn, viewMode === "grid" && s.viewToggleBtnActive]}
                  onPress={() => setViewMode("grid")}
                  activeOpacity={0.8}
                >
                  <GridIcon active={viewMode === "grid"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.viewToggleBtn, viewMode === "list" && s.viewToggleBtnActive]}
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
            <View style={s.stateBox}>
              <ActivityIndicator size="large" color={C.navy} />
              <Text style={s.stateText}>Loading orders…</Text>
            </View>
          ) : error ? (
            <View style={s.stateBox}>
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={loadOrders} activeOpacity={0.8}>
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.stateBox}>
              <OrderBoxIcon color={C.textLight} />
              <Text style={s.stateText}>No orders found</Text>
              <Text style={s.stateSub}>Try adjusting your filters or search</Text>
            </View>
          ) : viewMode === "grid" ? (
            /* ── Grid View ── */
            <View style={[s.gridWrap, isWeb && s.gridWrapWeb]}>
              {filtered.map((o) => (
                <GridOrderCard
                  key={o.id}
                  order={o}
                  onView={handleView}
                  onGST={handleGST}
                  onMore={(ord) => setActiveAction(ord)}
                  isWeb={isWeb}
                />
              ))}
            </View>
          ) : (
            /* ── List / Table View ── */
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={s.tableScroll}>
              <View style={s.tableWrap}>
                {/* Table head */}
                <View style={s.tHead}>
                  {[
                    { label: "Order #",        style: s.colOrder    },
                    { label: "Customer",       style: s.colCustomer },
                    { label: "Seller",         style: s.colSeller   },
                    { label: "Products",       style: s.colProducts },
                    { label: "Amount",         style: s.colAmount   },
                    { label: "Status",         style: s.colStatus   },
                    { label: "GST Filed",      style: s.colGst      },
                    { label: "Invoice/Label",  style: s.colDocs     },
                    { label: "Action",         style: s.colAction   },
                  ].map((col) => (
                    <Text key={col.label} style={[s.th, col.style]}>{col.label}</Text>
                  ))}
                </View>

                {filtered.map((o, idx) => (
                  <ListTableRow
                    key={o.id}
                    order={o}
                    idx={idx}
                    onView={handleView}
                    onGST={handleGST}
                    onMore={(ord) => setActiveAction(ord)}
                  />
                ))}
              </View>
            </ScrollView>
          )}

          {/* ── Pagination ── */}
          {!loading && !error && totalPages > 0 && (
            <PaginationBar
              page={currentPage}
              total={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              totalElements={totalElements}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              onPage={setCurrentPage}
            />
          )}
        </ScrollView>
      </View>

      {/* ── Sort Modal ── */}
      <SortModal
        visible={sortVisible}
        isWeb={isWeb}
        current={sortOption}
        onSelect={setSortOption}
        onClose={() => setSortVisible(false)}
      />

      {/* ── Action Menu ── */}
      {activeAction && (
        <ActionMenu
          order={activeAction}
          visible={!!activeAction}
          onClose={() => setActiveAction(null)}
          onView={handleView}
          onGST={handleGST}
          isWeb={isWeb}
        />
      )}
    </AdminLayout>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scrollContent: { paddingBottom: 60 },

  // ── Header ──────────────────────────────────────────────────────────────────
  headerBlock: {
    backgroundColor: C.navyDeep,
    paddingTop: 20,
    paddingBottom: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  headerIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: C.white, letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  exportBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.orange, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  exportBtnText: { fontSize: 13, fontWeight: "700", color: C.white },

  // Filter pills — overlapping the header bottom
  filterPillsWrap: {
    marginTop: 4,
    paddingBottom: 20,
  },
  filterPillsRow: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
  },
  filterPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  filterPillActive: {
    backgroundColor: C.white,
    borderColor: C.white,
  },
  filterPillDot: { width: 6, height: 6, borderRadius: 3 },
  filterPillText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  filterPillTextActive: { color: C.navyDeep },

  // ── Stats ────────────────────────────────────────────────────────────────────
  statsRow: { paddingHorizontal: 20, gap: 12, paddingBottom: 4, flexDirection: "row" },
  statCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    minWidth: 140,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  statAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
  statValue: { fontSize: 22, fontWeight: "800", color: C.textDark, marginTop: 8, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: C.textLight, marginTop: 4, fontWeight: "500" },

  // ── Toolbar ──────────────────────────────────────────────────────────────────
  toolbar: {
    flexDirection: "row", gap: 10, alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    flexWrap: "wrap",
  },
  searchBox: {
    flex: 1, minWidth: 180,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark, outlineStyle: "none" } as any,
  toolbarRight: { flexDirection: "row", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" },

  paymentDropWrap: {},
  paymentDrop: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 44,
  },
  paymentDropText: { fontSize: 13, color: C.textMid, maxWidth: 110 },

  sortBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 44,
  },
  sortBtnText: { fontSize: 13, color: C.navy, fontWeight: "600", maxWidth: 140 },

  viewToggle: {
    flexDirection: "row",
    backgroundColor: C.border,
    borderRadius: 10,
    padding: 3,
  },
  viewToggleBtn: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  viewToggleBtnActive: { backgroundColor: C.navy },

  // ── Sort Modal ───────────────────────────────────────────────────────────────
  sortOverlay: {
    flex: 1, justifyContent: "flex-end",
    backgroundColor: "rgba(21,29,79,0.45)",
  },
  sortOverlayWeb: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000, justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(21,29,79,0.35)",
  },
  sortMenu: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32,
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sortMenuWeb: {
    borderRadius: 20, minWidth: 300,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  sortHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sortTitle:   { fontSize: 16, fontWeight: "700", color: C.textDark },
  sortDismiss: { padding: 6 },
  sortItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sortItemActive:     { backgroundColor: "#F0F3FF" },
  sortItemText:       { fontSize: 15, color: C.textMid },
  sortItemTextActive: { color: C.navy, fontWeight: "700" },
  sortCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.navy, alignItems: "center", justifyContent: "center",
  },
  sortCancelBtn: {
    marginHorizontal: 20, marginTop: 12,
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#F3F4F6", alignItems: "center",
  },
  sortCancelText: { fontSize: 15, fontWeight: "600", color: C.textMid },

  // ── Action Menu ──────────────────────────────────────────────────────────────
  actionOverlay: {
    flex: 1, justifyContent: "flex-end",
    backgroundColor: "rgba(21,29,79,0.45)",
  },
  actionOverlayWeb: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000, justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(21,29,79,0.35)",
  },
  actionMenu: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  actionMenuWeb: {
    borderRadius: 20, minWidth: 300,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  actionMenuTitle: {
    fontSize: 14, fontWeight: "700", color: C.textLight,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    textTransform: "uppercase", letterSpacing: 0.8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  actionItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  actionItemIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.bg, alignItems: "center", justifyContent: "center",
  },
  actionItemText: { fontSize: 15, color: C.textDark, fontWeight: "500" },

  // ── Grid ─────────────────────────────────────────────────────────────────────
  gridWrap: { paddingHorizontal: 20, gap: 14 },
  gridWrapWeb: {
    flexDirection: "row", flexWrap: "wrap", gap: 16,
  },
  gridCard: {
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  gridCardWeb: { flex: 1, minWidth: 360, maxWidth: 520 },
  cardAccent:  { height: 3 },

  gridCardHeader: {
    flexDirection: "row", alignItems: "flex-start",
    padding: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 8,
  },
  orderIdRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  gridOrderNum: { fontSize: 14, fontWeight: "800", color: C.navyDeep, letterSpacing: -0.2 },
  copyBtn: { padding: 3 },
  metaRow:  { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 11, color: C.textLight },
  headerRight: { alignItems: "flex-end", gap: 6 },
  moreBtn: { padding: 4 },

  gridCustomerRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText:   { fontSize: 12, fontWeight: "800", color: C.navy },
  customerName: { fontSize: 13, fontWeight: "700", color: C.textDark },
  customerEmail:{ fontSize: 11, color: C.textLight, marginTop: 1 },

  // Seller section
  sellerSection: {
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  sellerSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 9, fontWeight: "700", color: C.textLight,
    letterSpacing: 0.8, textTransform: "uppercase",
  },

  // Sub-order block
  subOrderBlock: { paddingBottom: 10, marginBottom: 4 },
  subOrderBorder: {
    borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 10,
  },
  subOrderHeader: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8,
  },
  sellerAvatarWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.orangePale, alignItems: "center", justifyContent: "center",
  },
  sellerName:  { fontSize: 12, fontWeight: "700", color: C.textDark, flex: 1 },
  sellerEmail: { fontSize: 10, color: C.textLight },
  subOrderId:  { fontSize: 9, color: C.teal, fontWeight: "600", marginTop: 2 },

  productScroll: { marginBottom: 2 },
  productRow:   { flexDirection: "row", gap: 8, paddingBottom: 4 },
  productItem:  { alignItems: "center", width: 62 },
  productThumb: {
    width: 54, height: 54, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  productThumbEmpty: {
    width: 54, height: 54, borderRadius: 10,
    backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center",
  },
  productName:  { fontSize: 9, color: C.textMid, marginTop: 4, textAlign: "center" },
  productPrice: { fontSize: 10, fontWeight: "700", color: C.orange, marginTop: 2 },

  sellerDocRow: { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 4 },
  sellerDocBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border, borderRadius: 7,
    backgroundColor: C.card,
  },
  sellerDocBtnShip: { borderColor: "#FED7AA" },
  sellerDocBtnText: { fontSize: 10, fontWeight: "600", color: C.navy },
  trackingChip: {
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: "#EFF6FF", borderRadius: 6,
  },
  trackingText: { fontSize: 10, fontWeight: "600", color: C.blue },

  viewMoreBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 8,
  },
  viewMoreText: { fontSize: 12, fontWeight: "700", color: C.navy },

  // Amount strip
  amountStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.orangePale,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#FED7AA",
  },
  amountLabel: { fontSize: 10, color: C.textLight, marginBottom: 2 },
  amountVal:   { fontSize: 20, fontWeight: "800", color: C.orange, letterSpacing: -0.5 },
  payChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.card, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  payChipText: { fontSize: 11, fontWeight: "500", color: C.textMid },

  // Grid card footer
  gridCardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  footerLabel: {
    fontSize: 9, fontWeight: "700", color: C.textLight,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4,
  },
  viewBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.navy, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  viewBtnText: { fontSize: 13, fontWeight: "700", color: C.white },

  // Status / GST badge
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, alignSelf: "flex-start",
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  gstFiled: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.greenPale, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 7, alignSelf: "flex-start",
  },
  gstUnfiled: {
    backgroundColor: C.yellowPale, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 7, alignSelf: "flex-start",
  },
  gstText: { fontSize: 11, fontWeight: "600" },

  // ── List / Table ─────────────────────────────────────────────────────────────
  tableScroll: { paddingHorizontal: 20 },
  tableWrap: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
    minWidth: 1200,
  },
  tHead: {
    flexDirection: "row",
    backgroundColor: C.navyDeep,
    borderTopLeftRadius: 15, borderTopRightRadius: 15,
  },
  th: {
    paddingVertical: 14, paddingHorizontal: 12,
    fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase", letterSpacing: 0.7,
  },
  tRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border,
    alignItems: "flex-start", backgroundColor: C.white, minHeight: 72,
  },
  tRowAlt: { backgroundColor: "#FAFBFF" },
  tcell: { paddingVertical: 12, paddingHorizontal: 12, justifyContent: "center" },

  // Column widths
  colOrder:    { width: 160 },
  colCustomer: { width: 180 },
  colSeller:   { width: 160 },
  colProducts: { width: 180 },
  colAmount:   { width: 130 },
  colStatus:   { width: 120 },
  colGst:      { width: 110 },
  colDocs:     { width: 90  },
  colAction:   { width: 110 },

  tdOrderNum:   { fontSize: 13, fontWeight: "700", color: C.navyDeep, marginBottom: 2 },
  tdName:       { fontSize: 13, fontWeight: "600", color: C.textDark },
  tdEmail:      { fontSize: 11, color: C.textLight, marginTop: 1 },
  tdSellerName: { fontSize: 12, fontWeight: "700", color: C.textDark },
  tdAmount:     { fontSize: 14, fontWeight: "800", color: C.orange },
  tdPayment:    { fontSize: 10, color: C.textLight, marginTop: 3 },
  tdMuted:      { fontSize: 12, color: C.textLight },

  customerRowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarSm: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarSmText: { fontSize: 10, fontWeight: "800", color: C.navy },

  tableThumb: {
    width: 32, height: 32, borderRadius: 7,
    borderWidth: 1, borderColor: C.border,
  },
  tableThumbEmpty: {
    width: 32, height: 32, borderRadius: 7,
    backgroundColor: "#F3F4F6",
  },
  tableDocRow: { flexDirection: "row", gap: 4 },
  tableDocBtn: {
    width: 30, height: 30, borderRadius: 7,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card, alignItems: "center", justifyContent: "center",
  },
  tableActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  viewBtnSm: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.navy, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  viewBtnSmText: { fontSize: 11, fontWeight: "700", color: C.white },
  moreBtnSm: {
    width: 28, height: 28, borderRadius: 7,
    borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },

  // ── Pagination ───────────────────────────────────────────────────────────────
  pagination: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12,
    marginTop: 16, marginHorizontal: 20,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
  },
  paginationInfo:     { fontSize: 13, color: C.textMid },
  paginationControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  pageBtn: {
    width: 34, height: 34, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.card,
  },
  pageBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  pageBtnOff:    { opacity: 0.35 },
  pageBtnText:       { fontSize: 13, fontWeight: "600", color: C.textMid },
  pageBtnTextActive: { color: C.white },
  pageEllipsis: { fontSize: 13, color: C.textLight, paddingHorizontal: 2 },

  // ── State boxes ──────────────────────────────────────────────────────────────
  stateBox: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 60, gap: 12, marginHorizontal: 20,
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
  },
  stateText: { fontSize: 16, fontWeight: "700", color: C.textMid },
  stateSub:  { fontSize: 13, color: C.textLight },
  errorText: { fontSize: 14, color: C.red, textAlign: "center", paddingHorizontal: 24 },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, backgroundColor: C.navy,
  },
  retryText: { color: C.white, fontWeight: "700", fontSize: 13 },
});