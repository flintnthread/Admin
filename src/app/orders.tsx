import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View, useWindowDimensions,
} from "react-native";
import Svg, { Path, Circle, Rect, Polyline } from "react-native-svg";
import AdminLayout from "../components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import type { OrderSummary } from "@/lib/api/types";
import { mapOrderRow } from "@/lib/mappers";
import { fetchOrders, updateOrderGstStatus } from "@/services/orderApi";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  navy:         "#1d324e",
  navyMid:      "#2E4A6E",
  navyLight:    "#e8ecf2",
  navyLighter:  "#f0f3f7",
  primary:      "#ef7b1a",
  primaryLight: "#FFF0EA",
  primaryMid:   "#FED7AA",
  bg:           "#F4F6FA",
  surface:      "#FFFFFF",
  border:       "#E8ECF2",
  borderLight:  "#F0F2F7",
  text:         "#1C2B4A",
  textSub:      "#4B5563",
  textMuted:    "#9CA3AF",
  green:        "#10B981",
  greenBg:      "#ECFDF5",
  greenDark:    "#065F46",
  amber:        "#D97706",
  amberBg:      "#FEF3C7",
  amberDark:    "#92400E",
  red:          "#EF4444",
  redBg:        "#FEE2E2",
  cyan:         "#0369A1",
  cyanBg:       "#E0F2FE",
  purple:       "#5B21B6",
  purpleBg:     "#EDE9FE",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentType = "Cash on Delivery" | "Online Payment" | "UPI" | "Card";
type OrderStatus = "Processing" | "Pending" | "Completed" | "Cancelled" | "Shipped";
type GSTStatus = "Filed" | "Not Filed";

interface Product {
  id: string; name: string; image: string;
  seller: string; sellerEmail: string; price?: number;
}
interface SellerGroup {
  seller: { name: string; email: string };
  products: Product[];
}
interface Order {
  id: string; orderNumber: string; date: string; time: string;
  customer: { name: string; email: string };
  sellerGroups: SellerGroup[];
  amount: number; paymentType: PaymentType;
  status: OrderStatus; gstStatus: GSTStatus;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IC = {
  Search: () => (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9" stroke="#9CA3AF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Order: ({ color = "#FFF" }: { color?: string }) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 6h18M16 10a4 4 0 0 1-8 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Grid: ({ active }: { active: boolean }) => (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x="1" y="1" width="6.5" height="6.5" rx="1.5" stroke={active ? "#FFF" : "#6B7280"} strokeWidth={1.6} />
      <Rect x="10.5" y="1" width="6.5" height="6.5" rx="1.5" stroke={active ? "#FFF" : "#6B7280"} strokeWidth={1.6} />
      <Rect x="1" y="10.5" width="6.5" height="6.5" rx="1.5" stroke={active ? "#FFF" : "#6B7280"} strokeWidth={1.6} />
      <Rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" stroke={active ? "#FFF" : "#6B7280"} strokeWidth={1.6} />
    </Svg>
  ),
  List: ({ active }: { active: boolean }) => (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M5 4.5h12M5 9h12M5 13.5h12" stroke={active ? "#FFF" : "#6B7280"} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx="2" cy="4.5" r="1" fill={active ? "#FFF" : "#6B7280"} />
      <Circle cx="2" cy="9" r="1" fill={active ? "#FFF" : "#6B7280"} />
      <Circle cx="2" cy="13.5" r="1" fill={active ? "#FFF" : "#6B7280"} />
    </Svg>
  ),
  ChevDown: ({ color = C.textMuted }: { color?: string }) => (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M4 6l4 4 4-4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  ChevLeft: () => (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M10 12L6 8l4-4" stroke={C.text} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  ChevRight: ({ color = C.text }: { color?: string }) => (
    <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <Path d="M6 4l4 4-4 4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Eye: ({ color = "#FFF" }: { color?: string }) => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  ),
  Shop: ({ color = C.primary, size = 13 }: { color?: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 6h18M16 10a4 4 0 0 1-8 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  File: ({ color = C.navy }: { color?: string }) => (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Truck: ({ color = C.primary }: { color?: string }) => (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Rect x="1" y="3" width="15" height="13" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 8h4l3 3v5h-7V8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth={1.8} />
      <Circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth={1.8} />
    </Svg>
  ),
  Check: ({ color = C.green }: { color?: string }) => (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="22 4 12 14.01 9 11.01" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  User: ({ color = C.navy }: { color?: string }) => (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.8} />
    </Svg>
  ),
  Calendar: ({ color = C.textMuted }: { color?: string }) => (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={1.6} />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  ),
  X: ({ color = "#FFF" }: { color?: string }) => (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M12 4L4 12M4 4l8 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCur = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// ─── Mapper ───────────────────────────────────────────────────────────────────
function toUiOrder(row: ReturnType<typeof mapOrderRow>, raw: OrderSummary): Order {
  const createdAt = raw.createdAt ? new Date(raw.createdAt) : null;
  const valid = createdAt && !Number.isNaN(createdAt.getTime());
  const statusMap: Record<string, OrderStatus> = {
    processing: "Processing", pending: "Pending", completed: "Completed",
    cancelled: "Cancelled", shipped: "Shipped",
  };
  const payMap: Record<string, PaymentType> = {
    cod: "Cash on Delivery", cash_on_delivery: "Cash on Delivery",
    upi: "UPI", card: "Card", online: "Online Payment",
  };
  return {
    id: String(row.id),
    orderNumber: row.orderId.startsWith("#") ? row.orderId : `#${row.orderId}`,
    date: valid ? createdAt!.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : row.date,
    time: valid ? createdAt!.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
    customer: { name: row.customer, email: row.email },
    sellerGroups: [],
    amount: typeof raw.totalAmount === "number" ? raw.totalAmount : Number(raw.totalAmount ?? 0),
    paymentType: payMap[(raw.paymentMethod ?? raw.paymentStatus ?? "").toLowerCase()] ?? "Cash on Delivery",
    status: statusMap[(raw.orderStatus ?? "").toLowerCase()] ?? "Pending",
    gstStatus: row.gstStatus?.toLowerCase() === "filed" ? "Filed" : "Not Filed",
  };
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  Processing: { bg: C.cyanBg,   text: C.cyan,   dot: C.cyan   },
  Pending:    { bg: C.amberBg,  text: C.amber,  dot: C.amber  },
  Completed:  { bg: C.greenBg,  text: C.green,  dot: C.green  },
  Cancelled:  { bg: C.redBg,    text: C.red,    dot: C.red    },
  Shipped:    { bg: C.purpleBg, text: C.purple, dot: C.purple },
};

const STATUS_FILTERS  = ["All", "Processing", "Pending", "Completed", "Shipped", "Cancelled"];
const PAYMENT_FILTERS = ["All Payments", "Cash on Delivery", "Online Payment", "UPI", "Card"];
const ORDERS_PAGE_SIZE = 20;

// ─── Portal Dropdown — uses Modal so it escapes ALL overflow clipping ─────────
const Dropdown = ({
  value, placeholder, options, onChange,
}: {
  value: string; placeholder: string; options: string[]; onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState({ x: 0, y: 0, w: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const ref = useRef<View>(null);

  const openMenu = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      const sw = typeof window !== "undefined" ? window.innerWidth : 420;
      const menuW = Math.max(width, 180);
      const clampX = Math.min(x, sw - menuW - 8);
      setMenu({ x: clampX, y: y + height + 4, w: menuW });
      setOpen(true);
    });
  };

  return (
    <View ref={ref} collapsable={false}>
      <TouchableOpacity
        style={[s.ddTrigger, open && s.ddTriggerOpen]}
        onPress={openMenu}
        activeOpacity={0.85}
      >
        <Text style={[s.ddVal, !value && s.ddPh]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <IC.ChevDown color={open ? C.navy : C.textMuted} />
      </TouchableOpacity>

      {/* ── Full-screen Modal so menu renders above EVERYTHING ── */}
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        {/* Backdrop — tap outside to close */}
        <TouchableOpacity
          style={s.ddBackdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
        {/* Floating menu positioned by measureInWindow coords */}
        <View style={[s.ddMenuWrap, { top: menu.y, left: menu.x, width: menu.w }]}>
          <ScrollView
            style={{ maxHeight: 240 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((opt) => {
              const isActive  = value === opt;
              const isHovered = hovered === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    s.ddItem,
                    isActive  && s.ddItemActive,
                    isHovered && !isActive && s.ddItemHover,
                  ]}
                  onPress={() => { onChange(opt); setOpen(false); setHovered(null); }}
                  onPressIn={() => setHovered(opt)}
                  onPressOut={() => setHovered(null)}
                >
                  <Text style={[s.ddItemText, isActive && s.ddItemTextActive]}>{opt}</Text>
                  {isActive && <View style={s.ddActiveDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

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
const GSTBadge = ({ status, onMark }: { status: GSTStatus; onMark: () => void }) =>
  status === "Filed" ? (
    <View style={s.gstFiled}>
      <IC.Check color={C.green} />
      <Text style={[s.gstText, { color: C.greenDark }]}>Filed</Text>
    </View>
  ) : (
    <TouchableOpacity onPress={onMark} style={s.gstUnfiled} activeOpacity={0.75}>
      <Text style={[s.gstText, { color: C.amberDark }]}>Mark Filed</Text>
    </TouchableOpacity>
  );

// ─── Seller block (shared between grid card + mobile card) ────────────────────
const SellerBlock = ({ group, isLast }: { group: SellerGroup; isLast: boolean }) => (
  <View style={[s.sellerBlock, !isLast && s.sellerBlockBorder]}>
    <View style={s.sellerRow}>
      <View style={s.sellerIcon}><IC.Shop color={C.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.sellerName} numberOfLines={1}>{group.seller.name}</Text>
        <Text style={s.sellerEmail} numberOfLines={1}>{group.seller.email}</Text>
      </View>
      <TouchableOpacity style={s.docBtn}>
        <IC.File color={C.navy} /><Text style={s.docBtnTxt}>Invoice</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.docBtn, { borderColor: C.primaryMid }]}>
        <IC.Truck color={C.primary} /><Text style={[s.docBtnTxt, { color: C.primary }]}>Label</Text>
      </TouchableOpacity>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={s.productRow}>
        {group.products.length === 0
          ? <View style={s.thumbEmpty}><IC.Shop color={C.textMuted} size={16} /></View>
          : group.products.map((p) => (
              <View key={p.id} style={s.productItem}>
                {p.image
                  ? <Image source={{ uri: p.image }} style={s.thumb} resizeMode="cover" />
                  : <View style={s.thumbEmpty}><IC.Shop color={C.textMuted} size={14} /></View>
                }
                {!!p.name && <Text style={s.productName} numberOfLines={2}>{p.name}</Text>}
                {p.price !== undefined && <Text style={s.productPrice}>{fmtCur(p.price)}</Text>}
              </View>
            ))
        }
      </View>
    </ScrollView>
  </View>
);

// ─── GRID CARD (used for both mobile + web grid view) ────────────────────────
const OrderGridCard = ({
  order, onView, onGST, isWeb,
}: {
  order: Order; onView: () => void; onGST: () => void; isWeb: boolean;
}) => {
  // Collect up to 4 product images for the image strip at top
  const allImages = order.sellerGroups.flatMap((g) => g.products.map((p) => p.image)).filter(Boolean).slice(0, 4);

  return (
    <View style={[s.gridCard, isWeb && s.gridCardWeb]}>
      {/* ── Product image strip ── */}
      <View style={s.gridImgStrip}>
        {allImages.length === 0 ? (
          <View style={s.gridImgPlaceholder}>
            <IC.Order color={C.textMuted} />
          </View>
        ) : allImages.length === 1 ? (
          <Image source={{ uri: allImages[0] }} style={s.gridImgFull} resizeMode="cover" />
        ) : (
          <View style={s.gridImgGrid}>
            {allImages.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={[s.gridImgQuad, i > 0 && { marginLeft: 2 }]} resizeMode="cover" />
            ))}
          </View>
        )}
        {/* Status pill overlay */}
        <View style={s.gridStatusPill}>
          <StatusBadge status={order.status} />
        </View>
      </View>

      {/* ── Body ── */}
      <View style={s.gridBody}>
        {/* Order # + date */}
        <View style={s.gridOrderRow}>
          <Text style={s.gridOrderNum}>{order.orderNumber}</Text>
          <View style={s.dateRow}>
            <IC.Calendar />
            <Text style={s.dateText}> {order.date}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={s.customerRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{getInitials(order.customer.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.customerName} numberOfLines={1}>{order.customer.name}</Text>
            <Text style={s.customerEmail} numberOfLines={1}>{order.customer.email}</Text>
          </View>
        </View>

        {/* Sellers summary */}
        {order.sellerGroups.length > 0 && (
          <View style={s.gridSellers}>
            {order.sellerGroups.map((g, i) => (
              <View key={i} style={s.gridSellerChip}>
                <IC.Shop color={C.primary} size={10} />
                <Text style={s.gridSellerChipText} numberOfLines={1}>{g.seller.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Amount + payment */}
        <View style={s.gridAmountRow}>
          <Text style={s.gridAmount}>{fmtCur(order.amount)}</Text>
          <Text style={s.gridPayment}>{order.paymentType}</Text>
        </View>

        {/* GST + doc buttons */}
        <View style={s.gridFooterRow}>
          <GSTBadge status={order.gstStatus} onMark={onGST} />
          <View style={s.gridDocBtns}>
            <TouchableOpacity style={s.docBtn}>
              <IC.File color={C.navy} /><Text style={s.docBtnTxt}>Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.docBtn, { borderColor: C.primaryMid }]}>
              <IC.Truck color={C.primary} /><Text style={[s.docBtnTxt, { color: C.primary }]}>Label</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── View button ── */}
      <TouchableOpacity style={s.gridViewBtn} onPress={onView} activeOpacity={0.85}>
        <IC.Eye />
        <Text style={s.gridViewBtnText}>View Order Details</Text>
        <IC.ChevRight color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

// ─── LIST TABLE ROW ───────────────────────────────────────────────────────────
const ListRow = ({
  order, idx, onView, onGST,
}: {
  order: Order; idx: number; onView: () => void; onGST: () => void;
}) => {
  // First product image (for the Order column)
  const firstImg = order.sellerGroups.flatMap((g) => g.products.map((p) => p.image)).filter(Boolean)[0];

  return (
    <View style={[s.tRow, idx % 2 === 1 && s.tRowAlt]}>

      {/* Order # + first product image */}
      <View style={[s.cell, s.cOrder]}>
        <View style={s.listOrderCell}>
          {firstImg
            ? <Image source={{ uri: firstImg }} style={s.listProductImg} resizeMode="cover" />
            : <View style={s.listProductImgEmpty}><IC.Order color={C.textMuted} /></View>
          }
          <View style={{ flex: 1 }}>
            <Text style={s.tdOrderNum}>{order.orderNumber}</Text>
            <View style={s.dateRow}>
              <IC.Calendar />
              <Text style={s.dateText}> {order.date}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Customer */}
      <View style={[s.cell, s.cCustomer]}>
        <View style={s.customerRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{getInitials(order.customer.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.tdName} numberOfLines={1}>{order.customer.name}</Text>
            <Text style={s.tdEmail} numberOfLines={1}>{order.customer.email}</Text>
          </View>
        </View>
      </View>

      {/* Sellers + product thumbs grouped by seller */}
      <View style={[s.cell, s.cSellers]}>
        {order.sellerGroups.length === 0 ? (
          <Text style={s.tdMuted}>—</Text>
        ) : (
          order.sellerGroups.map((g, i) => (
            <View
              key={i}
              style={[
                s.webSellerGroup,
                i > 0 && { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.borderLight },
              ]}
            >
              <View style={s.webSellerHeader}>
                <View style={s.sellerIcon}><IC.Shop color={C.primary} /></View>
                <Text style={s.tdName} numberOfLines={1}>{g.seller.name}</Text>
              </View>
              <View style={s.webProductRow}>
                {g.products.slice(0, 4).map((p) =>
                  p.image
                    ? <Image key={p.id} source={{ uri: p.image }} style={s.webThumb} resizeMode="cover" />
                    : <View key={p.id} style={s.webThumbEmpty} />
                )}
              </View>
              <View style={s.webDocsRow}>
                <TouchableOpacity style={s.docBtnSm}>
                  <IC.File color={C.navy} /><Text style={s.docBtnSmTxt}>Invoice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.docBtnSm, { borderColor: C.primaryMid }]}>
                  <IC.Truck color={C.primary} /><Text style={[s.docBtnSmTxt, { color: C.primary }]}>Label</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Amount */}
      <View style={[s.cell, s.cAmount]}>
        <Text style={s.tdAmount}>{fmtCur(order.amount)}</Text>
        <Text style={s.tdPayment}>{order.paymentType}</Text>
      </View>

      {/* Status */}
      <View style={[s.cell, s.cStatus]}>
        <StatusBadge status={order.status} />
      </View>

      {/* GST */}
      <View style={[s.cell, s.cGst]}>
        <GSTBadge status={order.gstStatus} onMark={onGST} />
      </View>

      {/* Action */}
      <View style={[s.cell, s.cAction, { alignItems: "center" }]}>
        <TouchableOpacity style={s.viewBtnSm} onPress={onView} activeOpacity={0.85}>
          <IC.Eye /><Text style={s.viewBtnSmText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
function buildPages(curr: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (curr > 3) out.push("…");
  for (let p = Math.max(2, curr - 1); p <= Math.min(total - 1, curr + 1); p++) out.push(p);
  if (curr < total - 2) out.push("…");
  if (total > 1) out.push(total);
  return out;
}

const PaginationBar = ({
  page, total, rangeStart, rangeEnd, totalEl, onPrev, onNext, onPage,
}: {
  page: number; total: number; rangeStart: number; rangeEnd: number;
  totalEl: number; onPrev: () => void; onNext: () => void; onPage: (p: number) => void;
}) => (
  <View style={s.pagination}>
    <Text style={s.paginationInfo}>Showing {rangeStart}–{rangeEnd} of {totalEl} orders</Text>
    {total > 1 && (
      <View style={s.paginationControls}>
        <TouchableOpacity style={[s.pageBtn, page <= 1 && s.pageBtnOff]} onPress={onPrev} disabled={page <= 1}>
          <IC.ChevLeft />
        </TouchableOpacity>
        {buildPages(page, total).map((n, i) =>
          n === "…" ? (
            <Text key={`e${i}`} style={s.pageEllipsis}>…</Text>
          ) : (
            <TouchableOpacity key={n} style={[s.pageBtn, n === page && s.pageBtnActive]} onPress={() => onPage(n as number)}>
              <Text style={[s.pageBtnText, n === page && s.pageBtnTextActive]}>{n}</Text>
            </TouchableOpacity>
          )
        )}
        <TouchableOpacity style={[s.pageBtn, page >= total && s.pageBtnOff]} onPress={onNext} disabled={page >= total}>
          <IC.ChevRight />
        </TouchableOpacity>
      </View>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrdersScreen({ navigation }: { navigation?: any }) {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [orders,       setOrders]       = useState<Order[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [totalElements,setTotalElements]= useState(0);
  const [totalPages,   setTotalPages]   = useState(0);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [payFilter,    setPayFilter]    = useState("All Payments");
  const [viewMode,     setViewMode]     = useState<"grid" | "list">("list");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
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

  useEffect(() => { load(); }, [load]);

  const handleView = useCallback((o: Order) => {
    if (navigation) navigation.navigate("OrderDetails", { order: o });
  }, [navigation]);

  const handleGST = useCallback(async (id: string) => {
    try {
      await updateOrderGstStatus(Number(id), "Filed");
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, gstStatus: "Filed" } : o));
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to update GST status.");
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    }
  }, []);

  const filtered = useMemo(() => orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (!search || o.orderNumber.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q)) &&
      (statusFilter === "All" || o.status === statusFilter) &&
      (payFilter === "All Payments" || o.paymentType === payFilter)
    );
  }), [orders, search, statusFilter, payFilter]);

  const rangeStart = totalElements === 0 ? 0 : (currentPage - 1) * ORDERS_PAGE_SIZE + 1;
  const rangeEnd   = Math.min(currentPage * ORDERS_PAGE_SIZE, totalElements);

  return (
    <AdminLayout>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={s.pageHeader}>
            <View style={s.pageHeaderLeft}>
              <View style={s.pageIconWrap}><IC.Order /></View>
              <View>
                <Text style={s.pageTitle}>Orders</Text>
                <Text style={s.pageSub}>Manage and track all customer orders</Text>
              </View>
            </View>
            <View style={s.statChip}>
              <Text style={s.statChipNum}>{totalElements}</Text>
              <Text style={s.statChipLabel}>Total</Text>
            </View>
          </View>

          {/* ── Toolbar: search · status · payment · view toggle ── */}
          <View style={s.toolbar}>
            <View style={s.searchBox}>
              <IC.Search />
              <TextInput
                style={s.searchInput}
                placeholder="Search orders or customers…"
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={(t) => { setSearch(t); setCurrentPage(1); }}
              />
            </View>
            <View style={s.toolbarRight}>
              <View style={{ minWidth: 140 }}>
                <Dropdown
                  value={statusFilter === "All" ? "" : statusFilter}
                  placeholder="All Statuses"
                  options={STATUS_FILTERS}
                  onChange={(v) => { setStatusFilter(v || "All"); setCurrentPage(1); }}
                />
              </View>
              <View style={{ minWidth: 160 }}>
                <Dropdown
                  value={payFilter === "All Payments" ? "" : payFilter}
                  placeholder="All Payments"
                  options={PAYMENT_FILTERS}
                  onChange={(v) => { setPayFilter(v || "All Payments"); setCurrentPage(1); }}
                />
              </View>
              {/* Grid / List toggle */}
              <View style={s.viewToggle}>
                <TouchableOpacity
                  style={[s.vtBtn, viewMode === "grid" && s.vtBtnActive]}
                  onPress={() => setViewMode("grid")}
                >
                  <IC.Grid active={viewMode === "grid"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.vtBtn, viewMode === "list" && s.vtBtnActive]}
                  onPress={() => setViewMode("list")}
                >
                  <IC.List active={viewMode === "list"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Content ── */}
          {loading ? (
            <View style={s.stateBox}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.stateText}>Loading orders…</Text>
            </View>
          ) : error ? (
            <View style={s.stateBox}>
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={load}>
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.stateBox}>
              <IC.Order color={C.textMuted} />
              <Text style={s.stateText}>No orders found</Text>
              <Text style={s.stateSub}>Try adjusting your filters</Text>
            </View>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW — works on both mobile + web ── */
            <View style={[s.gridContainer, isWeb && s.gridContainerWeb]}>
              {filtered.map((o) => (
                <OrderGridCard
                  key={o.id}
                  order={o}
                  isWeb={isWeb}
                  onView={() => handleView(o)}
                  onGST={() => handleGST(o.id)}
                />
              ))}
            </View>
          ) : (
            /* ── LIST VIEW ── */
            isWeb ? (
              /* Web: full table */
              <View style={s.tableWrap}>
                <View style={s.tHead}>
                  <Text style={[s.th, s.cOrder]}>Order</Text>
                  <Text style={[s.th, s.cCustomer]}>Customer</Text>
                  <Text style={[s.th, s.cSellers]}>Sellers & Products</Text>
                  <Text style={[s.th, s.cAmount]}>Amount</Text>
                  <Text style={[s.th, s.cStatus]}>Status</Text>
                  <Text style={[s.th, s.cGst]}>GST</Text>
                  <Text style={[s.th, s.cAction, { textAlign: "center" }]}>Action</Text>
                </View>
                {filtered.map((o, idx) => (
                  <ListRow
                    key={o.id} order={o} idx={idx}
                    onView={() => handleView(o)}
                    onGST={() => handleGST(o.id)}
                  />
                ))}
              </View>
            ) : (
              /* Mobile list: stacked cards (same as old MobileOrderCard) */
              <View style={s.cardList}>
                {filtered.map((o) => (
                  <View key={o.id} style={s.card}>
                    {/* Header */}
                    <View style={s.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.orderLabel}>ORDER ID</Text>
                        <Text style={s.orderNum}>{o.orderNumber}</Text>
                        <View style={s.dateRow}>
                          <IC.Calendar /><Text style={s.dateText}> {o.date} · {o.time}</Text>
                        </View>
                      </View>
                      <StatusBadge status={o.status} />
                    </View>

                    {/* Customer */}
                    <View style={s.cardSection}>
                      <Text style={s.sectionLabel}>CUSTOMER</Text>
                      <View style={s.customerRow}>
                        <View style={s.avatar}>
                          <Text style={s.avatarText}>{getInitials(o.customer.name)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.customerName} numberOfLines={1}>{o.customer.name}</Text>
                          <Text style={s.customerEmail} numberOfLines={1}>{o.customer.email}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Seller groups */}
                    {o.sellerGroups.length > 0 && (
                      <View style={s.cardSection}>
                        <Text style={s.sectionLabel}>
                          {o.sellerGroups.length > 1 ? `SELLERS (${o.sellerGroups.length})` : "SELLER"}
                        </Text>
                        {o.sellerGroups.map((g, i) => (
                          <SellerBlock key={i} group={g} isLast={i === o.sellerGroups.length - 1} />
                        ))}
                      </View>
                    )}

                    {/* Amount */}
                    <View style={s.amountStrip}>
                      <View>
                        <Text style={s.amountLabel}>Order Total</Text>
                        <Text style={s.amountVal}>{fmtCur(o.amount)}</Text>
                      </View>
                      <Text style={s.payText}>{o.paymentType}</Text>
                    </View>

                    {/* Footer */}
                    <View style={s.cardFooter}>
                      <GSTBadge status={o.gstStatus} onMark={() => handleGST(o.id)} />
                      <TouchableOpacity style={s.viewBtn} onPress={() => handleView(o)} activeOpacity={0.85}>
                        <IC.Eye /><Text style={s.viewBtnText}>View Details</Text>
                        <IC.ChevRight color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )
          )}

          {/* ── Pagination ── */}
          {!loading && !error && totalPages > 0 && (
            <PaginationBar
              page={currentPage} total={totalPages}
              rangeStart={rangeStart} rangeEnd={rangeEnd} totalEl={totalElements}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              onPage={setCurrentPage}
            />
          )}
        </ScrollView>
      </View>
    </AdminLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 48 },

  // Header
  pageHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.navy, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 16, marginBottom: 16,
  },
  pageHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center",
  },
  pageTitle: { fontSize: 20, fontWeight: "700", color: "#FFF", letterSpacing: -0.3 },
  pageSub:   { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  statChip: {
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, alignItems: "center",
  },
  statChipNum:   { fontSize: 18, fontWeight: "700", color: "#FFF" },
  statChipLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", marginTop: 1 },

  // Toolbar
  toolbar: {
    flexDirection: "row", gap: 8, marginBottom: 14,
    alignItems: "center", flexWrap: "wrap", width: "100%",
  },
  searchBox: {
    flex: 1, minWidth: 180,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, height: 42,
  },
  searchInput:  { flex: 1, fontSize: 14, color: C.text, outlineStyle: "none" } as any,
  toolbarRight: { flexDirection: "row", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" },
  viewToggle:   { flexDirection: "row", backgroundColor: C.navyLight, borderRadius: 10, padding: 3 },
  vtBtn:        { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  vtBtnActive:  { backgroundColor: C.navy },

  // Dropdown
  ddTrigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 42,
  },
  ddTriggerOpen: { borderColor: C.navy },
  ddVal:  { fontSize: 13, color: C.text, flex: 1 },
  ddPh:   { color: "#9CA3AF" },
  // Full-screen dismiss layer
  ddBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  // Floating menu — absolutely positioned via measureInWindow
  ddMenuWrap: {
    position: "absolute",
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16, shadowRadius: 16, elevation: 20, overflow: "hidden",
  },
  ddItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  ddItemActive:    { backgroundColor: C.navyLight },
  ddItemHover:     { backgroundColor: C.navyLighter },
  ddItemText:      { fontSize: 13, color: C.text },
  ddItemTextActive:{ color: C.navy, fontWeight: "700" },
  ddActiveDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: C.navy },

  // Shared badges
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start",
  },
  badgeDot:  { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  gstFiled: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.greenBg, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 7, alignSelf: "flex-start",
  },
  gstUnfiled: {
    backgroundColor: C.amberBg, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 7, alignSelf: "flex-start",
  },
  gstText: { fontSize: 11, fontWeight: "600" },

  // Shared seller block
  sellerBlock:       { paddingBottom: 10, marginBottom: 4 },
  sellerBlockBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight, marginBottom: 10 },
  sellerRow:         { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  sellerIcon: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center",
  },
  sellerName:  { fontSize: 12, fontWeight: "700", color: C.text, flex: 1 },
  sellerEmail: { fontSize: 10, color: C.textMuted },
  productRow:  { flexDirection: "row", gap: 8, paddingBottom: 4 },
  productItem: { alignItems: "center", width: 58 },
  thumb: {
    width: 50, height: 50, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  thumbEmpty: {
    width: 50, height: 50, borderRadius: 10,
    backgroundColor: C.navyLighter, alignItems: "center", justifyContent: "center",
  },
  productName:  { fontSize: 9,  color: C.textSub, marginTop: 4, textAlign: "center" },
  productPrice: { fontSize: 10, fontWeight: "600", color: C.primary, marginTop: 2 },
  docBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: C.navyLight, borderRadius: 7,
    backgroundColor: C.surface,
  },
  docBtnTxt: { fontSize: 10, fontWeight: "600", color: C.navy },

  // ── GRID ────────────────────────────────────────────────────────────────────
  gridContainer:    { flexDirection: "column", gap: 14 },
  gridContainerWeb: {
    flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start",
  },
  gridCard: {
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
    shadowColor: C.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    width: "100%",
  },
  gridCardWeb: {
    ...(Platform.OS === "web"
      ? { width: "calc(33.33% - 11px)" as any, minWidth: 280, flexShrink: 0 }
      : {}),
  },
  // Image strip at top of grid card
  gridImgStrip: {
    height: 180, backgroundColor: C.navyLighter, position: "relative",
    borderTopLeftRadius: 17, borderTopRightRadius: 17, overflow: "hidden",
  },
  gridImgPlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center",
  },
  gridImgFull: { width: "100%", height: "100%" },
  gridImgGrid: {
    flex: 1, flexDirection: "row",
  },
  gridImgQuad: { flex: 1, height: "100%" },
  gridStatusPill: {
    position: "absolute", top: 10, right: 10,
  },
  gridBody: { padding: 14, gap: 10 },
  gridOrderRow: { gap: 3 },
  gridOrderNum: { fontSize: 15, fontWeight: "700", color: C.navy, letterSpacing: -0.2 },
  gridSellers: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  gridSellerChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.primaryLight, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  gridSellerChipText: { fontSize: 10, fontWeight: "600", color: C.primary },
  gridAmountRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  gridAmount:   { fontSize: 20, fontWeight: "700", color: C.primary, letterSpacing: -0.5 },
  gridPayment:  { fontSize: 11, color: C.textMuted },
  gridFooterRow:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gridDocBtns:  { flexDirection: "row", gap: 6 },
  gridViewBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: C.navy, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  gridViewBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },

  // Shared customer / date rows
  customerRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.navyLight, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText:    { fontSize: 11, fontWeight: "700", color: C.navyMid },
  customerName:  { fontSize: 13, fontWeight: "600", color: C.text },
  customerEmail: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  dateRow:       { flexDirection: "row", alignItems: "center", marginTop: 2 },
  dateText:      { fontSize: 11, color: C.textMuted },

  // ── MOBILE LIST CARD ────────────────────────────────────────────────────────
  cardList: { gap: 14 },
  card: {
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", alignItems: "flex-start",
    padding: 16, gap: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  orderLabel: { fontSize: 9, fontWeight: "700", color: C.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 },
  orderNum:   { fontSize: 14, fontWeight: "700", color: C.navy, letterSpacing: -0.2, marginBottom: 2 },
  cardSection: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  sectionLabel: { fontSize: 9, fontWeight: "700", color: C.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  amountStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.primaryLight,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.primaryMid,
  },
  amountLabel: { fontSize: 10, color: C.textMuted, marginBottom: 2 },
  amountVal:   { fontSize: 22, fontWeight: "700", color: C.primary, letterSpacing: -0.5 },
  payText:     { fontSize: 11, color: C.textSub, fontWeight: "500" },
  cardFooter:  {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  viewBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  viewBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },

  // ── WEB TABLE ────────────────────────────────────────────────────────────────
  tableWrap: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    overflow: "hidden", width: "100%",
  },
  tHead: {
    flexDirection: "row", backgroundColor: C.navy,
    borderTopLeftRadius: 13, borderTopRightRadius: 13,
  },
  th: {
    paddingVertical: 14, paddingHorizontal: 14,
    fontSize: 11, fontWeight: "700", color: "#FFF",
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  tRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.borderLight,
    alignItems: "flex-start", backgroundColor: C.surface, minHeight: 72,
  },
  tRowAlt: { backgroundColor: C.navyLighter },
  cell:    { paddingVertical: 14, paddingHorizontal: 14, justifyContent: "center" },

  // Column widths
  cOrder:    { width: 180 },
  cCustomer: { flex: 1.2, minWidth: 150 },
  cSellers:  { flex: 2,   minWidth: 220 },
  cAmount:   { width: 130 },
  cStatus:   { width: 120 },
  cGst:      { width: 110 },
  cAction:   { width: 90  },

  // List column content
  listOrderCell: { flexDirection: "row", alignItems: "center", gap: 10 },
  listProductImg: {
    width: 48, height: 48, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, flexShrink: 0,
  },
  listProductImgEmpty: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: C.navyLighter, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  tdOrderNum: { fontSize: 13, fontWeight: "700", color: C.navy, marginBottom: 2 },
  tdName:     { fontSize: 13, fontWeight: "600", color: C.text },
  tdEmail:    { fontSize: 11, color: C.textMuted, marginTop: 1 },
  tdAmount:   { fontSize: 15, fontWeight: "700", color: C.primary },
  tdPayment:  { fontSize: 11, color: C.textMuted, marginTop: 2 },
  tdMuted:    { fontSize: 12, color: C.textMuted },
  webSellerGroup:  {},
  webSellerHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  webProductRow:   { flexDirection: "row", gap: 4, marginBottom: 5 },
  webThumb:        { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  webThumbEmpty:   { width: 34, height: 34, borderRadius: 8, backgroundColor: C.navyLighter },
  webDocsRow:      { flexDirection: "row", gap: 5 },
  docBtnSm: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 4,
    borderWidth: 1, borderColor: C.navyLight, borderRadius: 6, backgroundColor: C.surface,
  },
  docBtnSmTxt: { fontSize: 9, fontWeight: "600", color: C.navy },
  viewBtnSm: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.navy, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  viewBtnSmText: { fontSize: 12, fontWeight: "700", color: "#FFF" },

  // Pagination
  pagination: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12, marginTop: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
  },
  paginationInfo:     { fontSize: 13, color: C.textSub },
  paginationControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  pageBtn: {
    width: 34, height: 34, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center", backgroundColor: C.surface,
  },
  pageBtnActive:     { backgroundColor: C.navy, borderColor: C.navy },
  pageBtnOff:        { opacity: 0.35 },
  pageBtnText:       { fontSize: 13, fontWeight: "600", color: C.text },
  pageBtnTextActive: { color: "#FFF" },
  pageEllipsis:      { fontSize: 13, color: C.textMuted, paddingHorizontal: 2 },

  // State boxes
  stateBox: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 60, gap: 12,
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
  },
  stateText:  { fontSize: 15, fontWeight: "600", color: C.textSub },
  stateSub:   { fontSize: 13, color: C.textMuted },
  errorText:  { fontSize: 14, color: C.red, textAlign: "center", paddingHorizontal: 24 },
  retryBtn:   { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9, backgroundColor: C.navy },
  retryText:  { color: "#FFF", fontWeight: "700", fontSize: 13 },
});

