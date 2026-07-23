/**
 * AdsOrderManagementScreen.tsx
 * ----------------------------------------------------------------
 * Ads Order Management â€” redesigned to match ads-payments.tsx
 * design system and layout patterns exactly.
 *
 * Changes vs. old version:
 *   - Header matches ads-payments navy header style
 *   - Same color tokens as ads-payments (no separate FONT object)
 *   - Filter bar: mobile = all controls in ONE row (status, billing,
 *     list/grid toggle) with dropdowns opening immediately below
 *   - List view: table on tablet/desktop, card list on phone
 *   - Grid view: card grid on all breakpoints
 *   - Two action buttons per row/card:
 *       â€¢ Eye (View Order) -> /order-details
 *       â€¢ Receipt (Payments) -> /ads-payments (filtered by customer)
 *   - No fontFamily references anywhere
 *   - No colored card borders â€” shadows only
 *
 * Breakpoints (measured container width):
 *   phone   : width < 640
 *   tablet  : 640 <= width < 1024
 *   desktop : width >= 1024
 * ----------------------------------------------------------------
 */
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  fetchAdsOrders,
  fetchAdsOrderStats,
  formatAdsDate,
  type AdsApiRow,
} from "@/services/adsApi";

/* ------------------------------------------------------------------ */
/* Design tokens â€” same as ads-payments.tsx                             */
/* ------------------------------------------------------------------ */
const COLORS = {
  surface: "#FFFFFF",
  navy: "#151D4F",
  navyDeep: "#151D4F",
  navyTint: "#F7F3EE",
  orange: "#ef7b1a",
  orangeDeep: "#ef7b1a",
  orangeTint: "#FFF0EA",
  ink: "#1C2B4A",
  inkSoft: "#1C2B4A",
  muted: "#6B7280",
  rule: "#E8E2D9",
  ruleSoft: "#E8E2D9",
  sub: "#6B7280",
  active: "#10B981",
  activeLight: "#ECFDF5",
  primaryLight: "#FFF0EA",
  blue: "#3B82F6",
  page: "#FFFFFF",
  avatarPalette: ["#ef7b1a", "#1C2B4A", "#10B981", "#8B5CF6", "#F59E0B", "#3B82F6"],
};

const fmtINR = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/* ------------------------------------------------------------------ */
/* Types + mock data                                                    */
/* ------------------------------------------------------------------ */
type BillingType = "Daily" | "Monthly";
type OrderStatus = "paid" | "pending";

interface Order {
  id: string;
  internalId: number;
  customerName: string;
  customerEmail: string;
  adTitle: string;
  adType: "Placement" | "Performance" | "Campaign" | "Display";
  billingType: BillingType;
  dailyAmt?: number;
  monthlyAmt: number;
  amount: number;
  status: OrderStatus;
  date: string;
}

function mapAdType(raw?: unknown): Order["adType"] {
  const label = String(raw ?? "Display");
  const normalized = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  if (normalized === "Placement" || normalized === "Performance" || normalized === "Campaign" || normalized === "Display") {
    return normalized;
  }
  return "Display";
}

function mapBillingType(raw?: unknown): BillingType {
  return String(raw ?? "").toLowerCase() === "daily" ? "Daily" : "Monthly";
}

function mapOrderRow(row: AdsApiRow): Order {
  const status = String(row.status ?? "pending").toLowerCase();
  const billingType = mapBillingType(row.billingType);
  const dailyRate = Number(row.dailyRate ?? 0) || 0;
  const monthlyRate = Number(row.monthlyRate ?? 0) || 0;
  return {
    id: String(row.orderId ?? row.id ?? ""),
    internalId: Number(row.id ?? 0),
    customerName: String(row.customerName ?? "â€”"),
    customerEmail: String(row.customerEmail ?? ""),
    adTitle: String(row.adName ?? "â€”"),
    adType: mapAdType(row.adType),
    billingType,
    dailyAmt: billingType === "Daily" ? dailyRate : undefined,
    monthlyAmt: monthlyRate,
    amount: Number(row.amount ?? 0) || 0,
    status: status === "paid" ? "paid" : "pending",
    date: formatAdsDate(row.createdAt),
  };
}

const AD_TYPE_COLORS: Record<string, string> = {
  Placement: COLORS.navyDeep,
  Performance: COLORS.orange,
  Campaign: "#8B5CF6",
  Display: COLORS.blue,
};

/* ------------------------------------------------------------------ */
/* Layout helpers                                                       */
/* ------------------------------------------------------------------ */
type Breakpoint = "phone" | "tablet" | "desktop";

function useMeasuredWidth(fallback: number) {
  const [w, setW] = useState(fallback);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - w) > 0.5) setW(next);
  };
  return { measuredWidth: w, onLayout };
}

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS.avatarPalette[Math.abs(h) % COLORS.avatarPalette.length];
}

/* ------------------------------------------------------------------ */
/* Glyph icons                                                          */
/* ------------------------------------------------------------------ */
function SearchGlyph({
  color = COLORS.muted,
  size = 16,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M20 20 L16.2 16.2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
function EyeGlyph({
  color = "#fff",
  size = 14,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M2 12c2.7-4.7 6.3-7 10-7s7.3 2.3 10 7c-2.7 4.7-6.3 7-10 7s-7.3-2.3-10-7Z"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}
function ReceiptGlyph({
  color = "#fff",
  size = 14,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 3 h14 v18 l-2.5 -1.6 L14 21 l-2 -1.6 L10 21 l-2.5 -1.6 L5 21 Z"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinejoin="round"
      />
      <Path
        d="M8 8 h8 M8 12 h8 M8 16 h5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
function OrderGlyph({
  color = "#fff",
  size = 24,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x="4"
        y="7"
        width="16"
        height="13"
        rx="2"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      <Path
        d="M8 7 V5 a2 2 0 0 1 2 -2 h4 a2 2 0 0 1 2 2 v2"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}
function ChevronGlyph({
  color = COLORS.muted,
  size = 11,
  open,
}: {
  color?: string;
  size?: number;
  open?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
    >
      <Path
        d="M5 9 L12 16 L19 9"
        stroke={color}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
function TrendGlyph({ color, size = 17 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 17 L10 11 L14 15 L20 6"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 6 H20 V12"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
function CheckGlyph({ color, size = 17 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M8 12.5 L11 15.5 L16.5 9"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
function ClockGlyph({ color, size = 17 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M12 7 V12 L15.2 14.2"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
function GridGlyph({
  color = COLORS.muted,
  size = 16,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="7" height="7" />
      <Rect x="14" y="3" width="7" height="7" />
      <Rect x="14" y="14" width="7" height="7" />
      <Rect x="3" y="14" width="7" height="7" />
    </Svg>
  );
}
function ListIconGlyph({
  color = COLORS.muted,
  size = 16,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Header â€” matches ads-payments.tsx style                              */
/* ------------------------------------------------------------------ */
function ScreenHeader() {
  return (
    <View style={[styles.header, { paddingBottom: 48, paddingTop: 16 }]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 24,
          gap: 14,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            backgroundColor: COLORS.orange,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <OrderGlyph color="#fff" size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700", fontSize: 22, color: "#FFFFFF" }}>
            Ads Order Management
          </Text>
          <Text
            style={{
              fontSize: 13.5,
              color: "rgba(255,255,255,0.7)",
              marginTop: 4,
            }}
          >
            Track payments, campaigns and billing cycles
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Stat cards                                                           */
/* ------------------------------------------------------------------ */
function StatCard({
  icon,
  label,
  value,
  iconBg,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
  valueColor: string;
}) {
  return (
    <View style={[styles.statCard, { minWidth: 140 }]}>
      <View style={styles.statCardTop}>
        <View style={[styles.statIconBadge, { backgroundColor: iconBg }]}>
          {icon}
        </View>
        <Text style={[styles.statValue, { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Status + billing badges                                              */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: OrderStatus }) {
  const paid = status === "paid";
  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: paid ? COLORS.activeLight : COLORS.primaryLight },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          { color: paid ? COLORS.active : COLORS.orange },
        ]}
      >
        {paid ? "Paid" : "Pending"}
      </Text>
    </View>
  );
}

function BillingBadge({ order }: { order: Order }) {
  const isDaily = order.billingType === "Daily";
  return (
    <View>
      <View
        style={[
          styles.billingPill,
          {
            backgroundColor: isDaily
              ? COLORS.navyDeep + "15"
              : COLORS.orange + "15",
          },
        ]}
      >
        <Text
          style={[
            styles.billingPillText,
            { color: isDaily ? COLORS.navyDeep : COLORS.orange },
          ]}
        >
          {order.billingType}
        </Text>
      </View>
      <Text style={styles.billingSub}>
        {isDaily
          ? `${fmtINR(order.dailyAmt || 0)}/day`
          : `${fmtINR(order.monthlyAmt)}/mo`}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Action buttons                                                       */
/* ------------------------------------------------------------------ */
function ActionButtons({
  onViewOrder,
  onViewPayments,
}: {
  onViewOrder: () => void;
  onViewPayments: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: COLORS.navyDeep }]}
        activeOpacity={0.85}
        onPress={onViewOrder}
      >
        <EyeGlyph size={13} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: COLORS.orange }]}
        activeOpacity={0.85}
        onPress={onViewPayments}
      >
        <ReceiptGlyph size={13} />
      </TouchableOpacity>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Filter bar â€” same pattern as ads-payments.tsx                        */
/* ------------------------------------------------------------------ */
type StatusFilter = "all" | "paid" | "pending";
type BillingFilter = "all" | "Daily" | "Monthly";
type ViewMode = "list" | "grid";

function StatusDropdown({
  value,
  onChange,
  open,
  onToggle,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const OPTIONS: { label: string; value: StatusFilter; color?: string }[] = [
    { label: "All statuses", value: "all" },
    { label: "Paid", value: "paid", color: COLORS.active },
    { label: "Pending", value: "pending", color: COLORS.orange },
  ];
  const current =
    OPTIONS.find((o) => o.value === value)?.label ?? "All statuses";
  const currentColor = OPTIONS.find((o) => o.value === value)?.color;
  return (
    <View style={[styles.dropdownWrap, open && { zIndex: 50 }]}>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: currentColor ?? "transparent" },
          ]}
        />
        <Text style={styles.dropdownBtnText} numberOfLines={1} ellipsizeMode="tail">
          {current}
        </Text>
        <ChevronGlyph open={open} color={COLORS.navyDeep} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.dropdownOption,
                  active && styles.dropdownOptionActive,
                ]}
                onPress={() => {
                  onChange(opt.value);
                  onToggle();
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: opt.color ?? "transparent" },
                  ]}
                />
                <Text
                  style={[
                    styles.dropdownOptionText,
                    active && styles.dropdownOptionTextActive,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function BillingDropdown({
  value,
  onChange,
  open,
  onToggle,
}: {
  value: BillingFilter;
  onChange: (v: BillingFilter) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const OPTIONS: { label: string; value: BillingFilter }[] = [
    { label: "All billing", value: "all" },
    { label: "Daily", value: "Daily" },
    { label: "Monthly", value: "Monthly" },
  ];
  const current =
    OPTIONS.find((o) => o.value === value)?.label ?? "All billing";
  return (
    <View style={[styles.dropdownWrap, open && { zIndex: 50 }]}>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <View style={[styles.statusDot, { backgroundColor: "transparent" }]} />
        <Text style={styles.dropdownBtnText} numberOfLines={1} ellipsizeMode="tail">
          {current}
        </Text>
        <ChevronGlyph open={open} color={COLORS.navyDeep} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.dropdownOption,
                  active && styles.dropdownOptionActive,
                ]}
                onPress={() => {
                  onChange(opt.value);
                  onToggle();
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    active && styles.dropdownOptionTextActive,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function FilterBar({
  search,
  onSearch,
  status,
  onStatus,
  billing,
  onBilling,
  viewMode,
  setViewMode,
  isTablet,
}: {
  search: string;
  onSearch: (v: string) => void;
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  billing: BillingFilter;
  onBilling: (v: BillingFilter) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  isTablet: boolean;
}) {
  const [openDropdown, setOpenDropdown] = useState<
    "status" | "billing" | null
  >(null);

  const toggleButtons = (
    <View style={styles.viewToggleGroup}>
      <TouchableOpacity
        style={[
          styles.viewToggleBoxBtn,
          viewMode === "grid" && styles.viewToggleBoxBtnActive,
        ]}
        onPress={() => setViewMode("grid")}
        activeOpacity={0.85}
      >
        <GridGlyph color={viewMode === "grid" ? "#fff" : COLORS.muted} size={16} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.viewToggleBoxBtn,
          viewMode === "list" && styles.viewToggleBoxBtnActive,
        ]}
        onPress={() => setViewMode("list")}
        activeOpacity={0.85}
      >
        <ListIconGlyph color={viewMode === "list" ? "#fff" : COLORS.muted} size={16} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.filterCard, { zIndex: 100 }]}>
      {isTablet ? (
        <View style={[styles.filterRow, { zIndex: 100 }]}>
          <View style={[styles.searchBox, { flex: 1 }]}>
            <SearchGlyph />
            <TextInput
              value={search}
              onChangeText={onSearch}
              placeholder="Search orders, customers..."
              placeholderTextColor={COLORS.sub}
              style={styles.searchInput}
            />
          </View>
          {toggleButtons}
          <StatusDropdown
            value={status}
            onChange={onStatus}
            open={openDropdown === "status"}
            onToggle={() =>
              setOpenDropdown((p) => (p === "status" ? null : "status"))
            }
          />
          <BillingDropdown
            value={billing}
            onChange={onBilling}
            open={openDropdown === "billing"}
            onToggle={() =>
              setOpenDropdown((p) => (p === "billing" ? null : "billing"))
            }
          />
        </View>
      ) : (
        <View style={{ gap: 12, zIndex: 100 }}>
          <View style={styles.searchBox}>
            <SearchGlyph />
            <TextInput
              value={search}
              onChangeText={onSearch}
              placeholder="Search orders..."
              placeholderTextColor={COLORS.sub}
              style={styles.searchInput}
            />
          </View>
          {/* All controls in one row on mobile */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "nowrap",
              gap: 6,
              zIndex: 100,
              overflow: "visible",
            }}
          >
            <View
              style={{
                flexShrink: 1,
                zIndex: openDropdown === "status" ? 50 : 20,
                overflow: "visible",
              }}
            >
              <StatusDropdown
                value={status}
                onChange={onStatus}
                open={openDropdown === "status"}
                onToggle={() =>
                  setOpenDropdown((p) => (p === "status" ? null : "status"))
                }
              />
            </View>
            <View
              style={{
                flexShrink: 1,
                zIndex: openDropdown === "billing" ? 50 : 10,
                overflow: "visible",
              }}
            >
              <BillingDropdown
                value={billing}
                onChange={onBilling}
                open={openDropdown === "billing"}
                onToggle={() =>
                  setOpenDropdown((p) => (p === "billing" ? null : "billing"))
                }
              />
            </View>
            {toggleButtons}
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Table view â€” tablet/desktop list                                     */
/* ------------------------------------------------------------------ */
function OrdersTable({
  orders,
  onViewOrder,
  onViewPayments,
}: {
  orders: Order[];
  onViewOrder: (o: Order) => void;
  onViewPayments: (o: Order) => void;
}) {
  return (
    <View style={styles.tableCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: "100%" }}>
        <View style={{ width: "100%", minWidth: 960 }}>
          <View style={styles.tableHeadRow}>
        <Text style={[styles.tableHeadCell, { flex: 0.9 }]}>Order ID</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.5 }]}>Customer</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.6 }]}>Ad Details</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.0 }]}>Billing</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.85 }]}>Amount</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.75 }]}>Status</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.85 }]}>Date</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.7, textAlign: "center" }]}>Actions</Text>
      </View>
      {orders.map((o) => {
        const avaColor = avatarColor(o.customerName);
        const adColor = AD_TYPE_COLORS[o.adType];
        return (
          <View key={o.id} style={styles.tableRow}>
            <View style={{ flex: 0.9, paddingRight: 6 }}>
              <Text style={styles.idMono} numberOfLines={1}>{o.id}</Text>
            </View>
            <View
              style={{
                flex: 1.5,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingRight: 6,
              }}
            >
              <View style={[styles.avatar, { backgroundColor: avaColor }]}>
                <Text style={styles.avatarText}>
                  {o.customerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.custName} numberOfLines={1}>
                  {o.customerName}
                </Text>
                <Text style={styles.custMail} numberOfLines={1}>
                  {o.customerEmail}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1.6, paddingRight: 6 }}>
              <Text style={styles.adTitle} numberOfLines={1}>{o.adTitle}</Text>
              <View
                style={[
                  styles.adTypePill,
                  { backgroundColor: adColor + "18", marginTop: 4 },
                ]}
              >
                <Text style={[styles.adTypePillText, { color: adColor }]}>
                  {o.adType}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1.0 }}>
              <BillingBadge order={o} />
            </View>
            <Text style={[styles.amt, { flex: 0.85 }]}>{fmtINR(o.amount)}</Text>
            <View style={{ flex: 0.75 }}>
              <StatusBadge status={o.status} />
            </View>
            <Text style={[styles.dateText, { flex: 0.85 }]}>{o.date}</Text>
            <View style={{ flex: 0.7, alignItems: "center" }}>
              <ActionButtons
                onViewOrder={() => onViewOrder(o)}
                onViewPayments={() => onViewPayments(o)}
              />
            </View>
          </View>
        );
      })}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Phone list card â€” used on mobile in list view                        */
/* ------------------------------------------------------------------ */
function OrderListCard({
  order,
  onViewOrder,
  onViewPayments,
}: {
  order: Order;
  onViewOrder: () => void;
  onViewPayments: () => void;
}) {
  const avaColor = avatarColor(order.customerName);
  const adColor = AD_TYPE_COLORS[order.adType];
  return (
    <View style={styles.listCard}>
      <View style={styles.listCardTopRow}>
        <Text style={styles.idMono} numberOfLines={1}>{order.id}</Text>
        <StatusBadge status={order.status} />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
        }}
      >
        <View style={[styles.avatar, { backgroundColor: avaColor }]}>
          <Text style={styles.avatarText}>
            {order.customerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.custName} numberOfLines={1}>{order.customerName}</Text>
          <Text style={styles.custMail} numberOfLines={1}>{order.customerEmail}</Text>
        </View>
      </View>
      <Text style={[styles.adTitle, { marginTop: 8 }]} numberOfLines={1}>
        {order.adTitle}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 4,
        }}
      >
        <View
          style={[styles.adTypePill, { backgroundColor: adColor + "18" }]}
        >
          <Text style={[styles.adTypePillText, { color: adColor }]}>
            {order.adType}
          </Text>
        </View>
        <Text style={styles.dateText}>{order.date}</Text>
      </View>
      <View style={styles.listCardBottomRow}>
        <BillingBadge order={order} />
        <Text style={styles.amt}>{fmtINR(order.amount)}</Text>
      </View>
      <View style={styles.listCardActions}>
        <TouchableOpacity
          style={styles.listCardActionBtn}
          onPress={onViewOrder}
          activeOpacity={0.85}
        >
          <EyeGlyph size={13} color="#fff" />
          <Text style={styles.listCardActionText}>View Order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.listCardActionBtn, { backgroundColor: COLORS.orange }]}
          onPress={onViewPayments}
          activeOpacity={0.85}
        >
          <ReceiptGlyph size={13} color="#fff" />
          <Text style={styles.listCardActionText}>Payments</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Grid view â€” cards on all breakpoints                                 */
/* ------------------------------------------------------------------ */
function OrderGridCard({
  order,
  cardWidth,
  onViewOrder,
  onViewPayments,
}: {
  order: Order;
  cardWidth: number;
  onViewOrder: () => void;
  onViewPayments: () => void;
}) {
  const avaColor = avatarColor(order.customerName);
  const adColor = AD_TYPE_COLORS[order.adType];
  return (
    <View style={[styles.gridCard, { width: cardWidth }]}>
      <View style={styles.gridCardTop}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: avaColor, width: 40, height: 40, borderRadius: 12 },
          ]}
        >
          <Text style={[styles.avatarText, { fontSize: 15 }]}>
            {order.customerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.custName} numberOfLines={1}>{order.customerName}</Text>
          <Text style={styles.custMail} numberOfLines={1}>{order.customerEmail}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>
      <View style={{ marginTop: 10 }}>
        <Text style={styles.adTitle} numberOfLines={1}>{order.adTitle}</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
        >
          <View
            style={[styles.adTypePill, { backgroundColor: adColor + "18" }]}
          >
            <Text style={[styles.adTypePillText, { color: adColor }]}>
              {order.adType}
            </Text>
          </View>
          <Text style={styles.idMono} numberOfLines={1}>{order.id}</Text>
        </View>
      </View>
      <View style={styles.gridCardMid}>
        <Text style={styles.gridCardAmt}>{fmtINR(order.amount)}</Text>
        <BillingBadge order={order} />
      </View>
      <View style={styles.gridCardBottom}>
        <Text style={styles.dateText}>{order.date}</Text>
        <ActionButtons onViewOrder={onViewOrder} onViewPayments={onViewPayments} />
      </View>
    </View>
  );
}

function OrdersGrid({
  orders,
  cardWidth,
  onViewOrder,
  onViewPayments,
}: {
  orders: Order[];
  cardWidth: number;
  onViewOrder: (o: Order) => void;
  onViewPayments: (o: Order) => void;
}) {
  return (
    <View style={styles.gridRow}>
      {orders.map((o) => (
        <OrderGridCard
          key={o.id}
          order={o}
          cardWidth={cardWidth}
          onViewOrder={() => onViewOrder(o)}
          onViewPayments={() => onViewPayments(o)}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                               */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 8;

export default function AdsOrderManagementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ customerEmail?: string; customerName?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const { measuredWidth, onLayout } = useMeasuredWidth(windowWidth);

  const initialSearch = String(params.customerEmail || params.customerName || "").trim();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [billing, setBilling] = useState<BillingFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    paidCount: 0,
    pendingCount: 0,
    totalRev: 0,
    pendingAmt: 0,
  });

  const bp: Breakpoint =
    measuredWidth >= 1024
      ? "desktop"
      : measuredWidth >= 640
      ? "tablet"
      : "phone";
  const isTablet = bp !== "phone";
  const isDesktop = bp === "desktop";
  const contentPad = bp === "phone" ? 14 : 24;
  const gutter = bp === "phone" ? 12 : 16;
  const fullWidth = Math.max(0, measuredWidth - contentPad * 2);
  const gridCols = isDesktop ? 3 : isTablet ? 2 : 1;
  const gridGap = 16;
  const gridCardWidth = (fullWidth - gridGap * (gridCols - 1)) / gridCols;

  useEffect(() => setPage(1), [search, status, billing, viewMode]);

  useEffect(() => {
    const seeded = String(params.customerEmail || params.customerName || "").trim();
    if (seeded && seeded !== search) {
      setSearch(seeded);
      setPage(1);
    }
  }, [params.customerEmail, params.customerName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [pageRes, statsRes] = await Promise.all([
          fetchAdsOrders({
            page: page - 1,
            size: PAGE_SIZE,
            search: search.trim() || undefined,
            status: status === "all" ? undefined : status,
            billingType: billing === "all" ? undefined : billing.toLowerCase(),
          }),
          fetchAdsOrderStats(),
        ]);
        if (cancelled) return;
        setOrders(pageRes.items.map(mapOrderRow));
        setTotalItems(pageRes.totalElements);
        const pendingCount = Number(statsRes.pendingOrders ?? 0);
        const paidCount = Number(statsRes.paidOrders ?? 0);
        const totalPaid = Number(statsRes.totalPaidAmount ?? 0);
        setStats({
          total: Number(statsRes.totalOrders ?? pageRes.totalElements ?? 0),
          paidCount,
          pendingCount,
          totalRev: totalPaid,
          pendingAmt: Math.max(0, totalPaid * (pendingCount / Math.max(1, paidCount + pendingCount))),
        });
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e, "Failed to load orders."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, status, billing, page]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageItems = orders;

  const handleViewOrder = (order: Order) => {
    if (order.internalId > 0) {
      router.push({ pathname: "/order-details" as any, params: { id: String(order.internalId) } });
      return;
    }
    router.push({ pathname: "/order-details" as any, params: { orderId: order.id } });
  };
  const handleViewPayments = (order: Order) => {
    router.push({
      pathname: "/ads-payments" as any,
      params: { orderId: order.id },
    });
  };

  const showTable = isTablet && viewMode === "list";
  const showGrid = viewMode === "grid";

  return (
    <AdminLayout>
      <View style={{ flex: 1, width: "100%" }} onLayout={onLayout}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: contentPad,
            paddingTop: 16,
            paddingBottom: 28,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader />

          {/* Stat cards */}
          {bp === "phone" ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: -48, zIndex: 10 }} contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingRight: 32 }}>
              <StatCard
                icon={<OrderGlyph color={COLORS.navyDeep} size={17} />}
                label="TOTAL ORDERS"
                value={String(stats.total)}
                iconBg={COLORS.navyDeep + "14"}
                valueColor={COLORS.navyDeep}
              />
              <StatCard
                icon={<TrendGlyph color={COLORS.blue} size={17} />}
                label="TOTAL REVENUE"
                value={fmtINR(stats.totalRev)}
                iconBg={COLORS.blue + "14"}
                valueColor={COLORS.blue}
              />
              <StatCard
                icon={<CheckGlyph color={COLORS.active} size={17} />}
                label="PAID ORDERS"
                value={String(stats.paidCount)}
                iconBg={COLORS.active + "14"}
                valueColor={COLORS.active}
              />
              <StatCard
                icon={<ClockGlyph color={COLORS.orange} size={17} />}
                label="PENDING AMOUNT"
                value={fmtINR(stats.pendingAmt)}
                iconBg={COLORS.orange + "14"}
                valueColor={COLORS.orange}
              />
            </ScrollView>
          ) : (
            <View style={[styles.statsRow, { marginTop: -48, paddingHorizontal: 16, zIndex: 10 }]}>
              <StatCard
                icon={<OrderGlyph color={COLORS.navyDeep} size={17} />}
                label="TOTAL ORDERS"
                value={String(stats.total)}
                iconBg={COLORS.navyDeep + "14"}
                valueColor={COLORS.navyDeep}
              />
              <StatCard
                icon={<TrendGlyph color={COLORS.blue} size={17} />}
                label="TOTAL REVENUE"
                value={fmtINR(stats.totalRev)}
                iconBg={COLORS.blue + "14"}
                valueColor={COLORS.blue}
              />
              <StatCard
                icon={<CheckGlyph color={COLORS.active} size={17} />}
                label="PAID ORDERS"
                value={String(stats.paidCount)}
                iconBg={COLORS.active + "14"}
                valueColor={COLORS.active}
              />
              <StatCard
                icon={<ClockGlyph color={COLORS.orange} size={17} />}
                label="PENDING AMOUNT"
                value={fmtINR(stats.pendingAmt)}
                iconBg={COLORS.orange + "14"}
                valueColor={COLORS.orange}
              />
            </View>
          )}

          {/* Filter bar */}
          <View style={{ marginTop: gutter, zIndex: 30, position: "relative" }}>
            <FilterBar
              search={search}
              onSearch={setSearch}
              status={status}
              onStatus={setStatus}
              billing={billing}
              onBilling={setBilling}
              viewMode={viewMode}
              setViewMode={setViewMode}
              isTablet={isTablet}
            />
          </View>

          {/* Content */}
          <View style={{ marginTop: 8, zIndex: 1 }}>
            {loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Loading ordersâ€¦</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{error}</Text>
              </View>
            ) : pageItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  No orders match your filters
                </Text>
                <Text style={styles.emptySub}>
                  Try clearing the search or switching the payment/billing
                  filters.
                </Text>
              </View>
            ) : showTable ? (
              <OrdersTable
                orders={pageItems}
                onViewOrder={handleViewOrder}
                onViewPayments={handleViewPayments}
              />
            ) : showGrid ? (
              <OrdersGrid
                orders={pageItems}
                cardWidth={gridCardWidth}
                onViewOrder={handleViewOrder}
                onViewPayments={handleViewPayments}
              />
            ) : (
              /* Phone list view */
              <View>
                {pageItems.map((o) => (
                  <OrderListCard
                    key={o.id}
                    order={o}
                    onViewOrder={() => handleViewOrder(o)}
                    onViewPayments={() => handleViewPayments(o)}
                  />
                ))}
              </View>
            )}
          </View>

          {!loading && !error && totalItems > 0 && (
            <View style={{ marginTop: gutter, zIndex: 0 }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={PAGE_SIZE}
                itemName="orders"
                onPageChange={setPage}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </AdminLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Styles â€” no fontFamily, no colored borders, shadows only            */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  /* header */
  header: {
    backgroundColor: COLORS.navyDeep,
    borderRadius: 16,
    marginBottom: 4,
    overflow: "hidden",
  },

  /* stat cards */
  statsRow: { flexDirection: "row", gap: 16, flexWrap: "wrap", justifyContent: "center" },
  statCard: {
    minWidth: 150,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    shadowColor: "#1B1F3B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  statIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontWeight: "700", fontSize: 18 },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
    letterSpacing: 0.4,
  },

  /* filter bar */
  filterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#1B1F3B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  searchBox: {
    flex: 1,
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.ink, outlineStyle: "none" } as any,

  /* dropdowns */
  dropdownWrap: { position: "relative", zIndex: 20 },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: COLORS.page,
    minWidth: 0,
    flexShrink: 1,
  },
  dropdownBtnText: {
    flexShrink: 1,
    minWidth: 0,
    fontWeight: "600",
    fontSize: 12,
    color: COLORS.ink,
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.rule,
    overflow: "hidden",
    shadowColor: "#1B1F3B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 30,
    zIndex: 999,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ruleSoft,
  },
  dropdownOptionActive: { backgroundColor: COLORS.navyTint },
  dropdownOptionText: { flex: 1, minWidth: 0, fontSize: 12.5, color: COLORS.ink },
  dropdownOptionTextActive: { fontWeight: "700", color: COLORS.navyDeep },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },

  /* view toggle â€” two separate boxed icon buttons */
  viewToggleGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    gap: 0,
  },
  viewToggleBoxBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  viewToggleBoxBtnActive: {
    backgroundColor: COLORS.navyDeep,
  },

  /* shared bits */
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  custName: { fontWeight: "600", fontSize: 13, color: COLORS.ink },
  custMail: { fontSize: 10, color: COLORS.muted, marginTop: 1 },
  idMono: { fontSize: 11.5, fontWeight: "700", color: COLORS.orangeDeep },
  adTitle: { fontWeight: "600", fontSize: 12.5, color: COLORS.ink },
  adTypePill: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  adTypePillText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  amt: { fontWeight: "700", fontSize: 13.5, color: COLORS.ink },
  dateText: { fontSize: 11, color: COLORS.muted },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: { fontWeight: "700", fontSize: 10.5 },
  billingPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  billingPillText: { fontSize: 9.5, fontWeight: "700" },
  billingSub: { fontSize: 10, color: COLORS.muted, marginTop: 3 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  /* table */
  tableCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#1B1F3B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  tableHeadRow: {
    flexDirection: "row",
    backgroundColor: COLORS.orangeTint,
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 8,
  },
  tableHeadCell: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ruleSoft,
  },

  /* phone list card */
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#1B1F3B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  listCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  listCardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.ruleSoft,
  },
  listCardActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  listCardActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.navyDeep,
    borderRadius: 8,
    paddingVertical: 9,
  },
  listCardActionText: { fontWeight: "700", fontSize: 12, color: "#fff" },

  /* grid card */
  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  gridCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#1B1F3B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  gridCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  gridCardMid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.ruleSoft,
  },
  gridCardAmt: { fontWeight: "800", fontSize: 18, color: COLORS.navyDeep },
  gridCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },

  /* empty state */
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyTitle: { fontWeight: "700", fontSize: 15, color: COLORS.ink },
  emptySub: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 6,
    textAlign: "center",
  },
});