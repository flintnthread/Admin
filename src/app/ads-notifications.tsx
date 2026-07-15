/**
 * ads-notifications.tsx
 * ----------------------------------------------------------------
 * Redesigned to match ads-payments.tsx & ads-ordermanagement.tsx
 *
 * Changes:
 * - Uses AdminLayout & Pagination
 * - Shared COLORS token palette (navy & orange)
 * - Stat cards overlap the header
 * - Single-row FilterBar on mobile (Search, Status, Read, Toggle)
 * - Action buttons: Edit (Modal) and Order (redirect to /order-details)
 * - Custom "Update Notification" modal matching design specs
 */
import React, { useEffect, useMemo, useState } from "react";
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
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";
import { useRouter } from "expo-router";
import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";

/* ------------------------------------------------------------------ */
/* Design Tokens                                                        */
/* ------------------------------------------------------------------ */
const COLORS = {
  surface: "#FFFFFF",
  navy: "#151D4F",
  navyDeep: "#151D4F",
  navyTint: "#F7F3EE",
  orange: "#ef7b1a",
  orangeTint: "#FFF5ED",
  orangeDeep: "#D9680F",
  active: "#2EB872",
  blue: "#2C75FF",
  ink: "#1B1F3B",
  inkSoft: "#4A4D60",
  muted: "#787B8E",
  muted2: "#A5A7B4",
  rule: "#E8E9F1",
  ruleSoft: "#F3F4F8",
  page: "#F8F9FA",
  avatarPalette: ["#4F6D7A", "#C0D6DF", "#DB6C79", "#EDAE49", "#F7A278", "#61A0AF", "#96C0B7", "#D8A48F"],
};

/* ------------------------------------------------------------------ */
/* Mock Data                                                            */
/* ------------------------------------------------------------------ */
type NotificationStatus = "paid" | "pending" | "failed" | "cancelled" | "refunded";

interface AppNotification {
  id: string;
  orderId: string;
  customer: string;
  email: string;
  detail: string;
  amount: number;
  status: NotificationStatus;
  unread: boolean;
  date: string;
}

const INITIAL_DATA: AppNotification[] = [
  { id: "notif_1", orderId: "AD-2025-2159", customer: "Flint & Thread", email: "flintnthread@gmail.com", detail: "Landing Page Sub-Banner", amount: 325000, status: "paid", unread: true, date: "26 Oct 2025" },
  { id: "notif_2", orderId: "AD-2025-7865", customer: "Tayi Gopi Chand", email: "gopichand93667@gmail.com", detail: "Instagram Posts", amount: 15000, status: "paid", unread: true, date: "06 Oct 2025" },
  { id: "notif_3", orderId: "AD-2025-5982", customer: "Tayi Gopi Chand", email: "gopichand93667@gmail.com", detail: "Search Sponsored Listings", amount: 100, status: "pending", unread: true, date: "06 Oct 2025" },
  { id: "notif_4", orderId: "AD-2025-1780", customer: "Tayi Gopi Chand", email: "gopichand93667@gmail.com", detail: "YouTube Video Spotlight", amount: 30000, status: "pending", unread: true, date: "06 Oct 2025" },
  { id: "notif_5", orderId: "AD-2025-1277", customer: "Tayi Gopi Chand", email: "gopichand93667@gmail.com", detail: "YouTube Video Spotlight", amount: 30000, status: "pending", unread: true, date: "06 Oct 2025" },
  { id: "notif_6", orderId: "AD-2025-9988", customer: "Studio North", email: "hello@studionorth.co", detail: "Home Page Hero", amount: 50000, status: "failed", unread: false, date: "05 Oct 2025" },
  { id: "notif_7", orderId: "AD-2025-5544", customer: "Rekha Traders", email: "rekha@gmail.com", detail: "Sidebar Ad", amount: 12000, status: "refunded", unread: false, date: "04 Oct 2025" },
  { id: "notif_8", orderId: "AD-2025-1122", customer: "Jane Smith", email: "jane@example.com", detail: "Footer Ad", amount: 8000, status: "cancelled", unread: false, date: "03 Oct 2025" },
];

const STATUS_META: Record<NotificationStatus, { label: string; color: string; bg: string }> = {
  paid: { label: "Paid", color: COLORS.active, bg: COLORS.active + "15" },
  pending: { label: "Pending", color: COLORS.orange, bg: COLORS.orange + "15" },
  failed: { label: "Failed", color: "#E02424", bg: "#E0242415" },
  cancelled: { label: "Cancelled", color: COLORS.muted, bg: COLORS.rule },
  refunded: { label: "Refunded", color: COLORS.blue, bg: COLORS.blue + "15" },
};

function fmtINR(val: number) {
  return "₹" + val.toLocaleString("en-IN");
}

/* ------------------------------------------------------------------ */
/* Layout Hooks                                                         */
/* ------------------------------------------------------------------ */
type Breakpoint = "phone" | "tablet" | "desktop";
function useBreakpoint(): { width: number } {
  const { width } = useWindowDimensions();
  return { width };
}
function useMeasuredWidth(fallback: number) {
  const [w, setW] = useState(fallback);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - w) > 0.5) setW(next);
  };
  return { measuredWidth: w, onLayout };
}

/* ------------------------------------------------------------------ */
/* Glyphs                                                               */
/* ------------------------------------------------------------------ */
function BellGlyph({ color = "#fff", size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function BellStatGlyph({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CheckCircleGlyph({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M8 12.5 L11 15.5 L16.5 9" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ReceiptGlyph({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 3 h14 v18 l-2.5 -1.6 L14 21 l-2 -1.6 L10 21 l-2.5 -1.6 L5 21 Z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
      <Path d="M8 8 h8 M8 12 h8 M8 16 h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
function EyeGlyph({ color = "#fff", size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 12c2.7-4.7 6.3-7 10-7s7.3 2.3 10 7c-2.7 4.7-6.3 7-10 7s-7.3-2.3-10-7Z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}
function PencilGlyph({ color = "#fff", size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function GridGlyph({ color = COLORS.muted, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={2} fill="none" />
      <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={2} fill="none" />
      <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={2} fill="none" />
      <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}
function ListIconGlyph({ color = COLORS.muted, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="8" y1="6" x2="21" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="8" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="8" y1="18" x2="21" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="4" cy="6" r="1.5" fill={color} />
      <Circle cx="4" cy="12" r="1.5" fill={color} />
      <Circle cx="4" cy="18" r="1.5" fill={color} />
    </Svg>
  );
}
function SearchGlyph({ color = COLORS.muted2, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M20 20 L16.2 16.2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function ChevronGlyph({ color = COLORS.muted, size = 11, open }: { color?: string; size?: number; open?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
      <Path d="M5 9 L12 16 L19 9" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function XGlyph({ color = "#fff", size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 5 L19 19 M19 5 L5 19" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}
function CheckGlyph({ color = "#fff", size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function SaveGlyph({ color = "#fff", size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 21v-8H7v8M7 3v5h8" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function TrendGlyph({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 17 L10 11 L14 15 L20 6" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 6 H20 V12" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS.avatarPalette[Math.abs(h) % COLORS.avatarPalette.length];
}

/* ------------------------------------------------------------------ */
/* Header & Stats                                                       */
/* ------------------------------------------------------------------ */
function ScreenHeader() {
  return (
    <View style={[styles.header, { paddingBottom: 56, paddingTop: 24 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 24, gap: 14 }}>
        <View style={{ width: 48, height: 48, backgroundColor: COLORS.orange, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <BellGlyph color="#fff" size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700", fontSize: 22, color: "#FFFFFF" }}>Ads Notifications</Text>
          <Text style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Manage your alerts and updates</Text>
        </View>
      </View>
    </View>
  );
}

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
        <View style={[styles.statIconBadge, { backgroundColor: iconBg }]}>{icon}</View>
        <Text style={[styles.statValue, { color: valueColor }]} numberOfLines={1}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Action Buttons                                                       */
/* ------------------------------------------------------------------ */
function ActionButtons({
  onEdit,
  onViewOrder,
}: {
  onEdit: () => void;
  onViewOrder: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.orangeTint }]} activeOpacity={0.85} onPress={onEdit}>
        <PencilGlyph size={12} color={COLORS.orangeDeep} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.navyTint }]} activeOpacity={0.85} onPress={onViewOrder}>
        <EyeGlyph size={13} color={COLORS.navyDeep} />
      </TouchableOpacity>
    </View>
  );
}

function StatusBadge({ status }: { status: NotificationStatus }) {
  const meta = STATUS_META[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Filter Dropdowns                                                     */
/* ------------------------------------------------------------------ */
type StatusFilter = "all" | NotificationStatus;
type ReadFilter = "all" | "read" | "unread";

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
    { label: "Failed", value: "failed", color: "#E02424" },
    { label: "Cancelled", value: "cancelled", color: COLORS.muted },
    { label: "Refunded", value: "refunded", color: COLORS.blue },
  ];
  const current = OPTIONS.find((o) => o.value === value)?.label ?? "All statuses";
  const currentColor = OPTIONS.find((o) => o.value === value)?.color;
  return (
    <View style={[styles.dropdownWrap, open && { zIndex: 50 }]}>
      <TouchableOpacity style={styles.dropdownBtn} onPress={onToggle} activeOpacity={0.85}>
        <View style={[styles.statusDot, { backgroundColor: currentColor ?? "transparent" }]} />
        <Text style={styles.dropdownBtnText} numberOfLines={1}>{current}</Text>
        <ChevronGlyph open={open} color={COLORS.navyDeep} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                onPress={() => { onChange(opt.value); onToggle(); }}
                activeOpacity={0.8}
              >
                <View style={[styles.statusDot, { backgroundColor: opt.color ?? "transparent" }]} />
                <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ReadDropdown({
  value,
  onChange,
  open,
  onToggle,
}: {
  value: ReadFilter;
  onChange: (v: ReadFilter) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const OPTIONS: { label: string; value: ReadFilter }[] = [
    { label: "All Messages", value: "all" },
    { label: "Unread", value: "unread" },
    { label: "Read", value: "read" },
  ];
  const current = OPTIONS.find((o) => o.value === value)?.label ?? "All Messages";
  return (
    <View style={[styles.dropdownWrap, open && { zIndex: 50 }]}>
      <TouchableOpacity style={styles.dropdownBtn} onPress={onToggle} activeOpacity={0.85}>
        <Text style={styles.dropdownBtnText} numberOfLines={1}>{current}</Text>
        <ChevronGlyph open={open} color={COLORS.navyDeep} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                onPress={() => { onChange(opt.value); onToggle(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Custom Update Modal                                                  */
/* ------------------------------------------------------------------ */
function UpdateNotificationModal({
  notification,
  onClose,
  onUpdate,
  isTablet,
}: {
  notification: AppNotification;
  onClose: () => void;
  onUpdate: (id: string, status: NotificationStatus, read: boolean) => void;
  isTablet: boolean;
}) {
  const [status, setStatus] = useState<NotificationStatus>(notification.status);
  const [read, setRead] = useState(!notification.unread);
  const [openStatus, setOpenStatus] = useState(false);

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, !isTablet && styles.modalCardPhone]}>
        {/* Orange Header */}
        <View style={styles.modalHeaderOrange}>
          <Text style={styles.modalHeaderTitle}>Update Notification</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseIcon} activeOpacity={0.8}>
            <XGlyph color="#fff" size={14} />
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View style={[styles.modalBody, { zIndex: 10, elevation: 10 }]}>
          <Text style={styles.inputLabel}>Status</Text>
          <View style={[styles.selectWrap, openStatus && { zIndex: 100 }]}>
            <TouchableOpacity style={styles.selectBtn} onPress={() => setOpenStatus(!openStatus)} activeOpacity={0.9}>
              <Text style={styles.selectBtnText}>{STATUS_META[status].label}</Text>
              <ChevronGlyph open={openStatus} color={COLORS.ink} size={14} />
            </TouchableOpacity>
            {openStatus && (
              <ScrollView style={styles.selectMenu} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {["paid", "pending", "failed", "cancelled", "refunded"].map((opt, index, arr) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.selectOption,
                      status === opt && styles.selectOptionActive,
                      index === 0 && { borderTopLeftRadius: 8, borderTopRightRadius: 8 },
                      index === arr.length - 1 && { borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderBottomWidth: 0 }
                    ]}
                    onPress={() => { setStatus(opt as NotificationStatus); setOpenStatus(false); }}
                  >
                    <Text style={[styles.selectOptionText, status === opt && styles.selectOptionTextActive]}>
                      {STATUS_META[opt as NotificationStatus].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setRead(!read)} activeOpacity={0.8}>
            <View style={[styles.checkbox, read && styles.checkboxChecked]}>
              {read && <CheckGlyph color="#fff" size={10} />}
            </View>
            <Text style={styles.checkboxLabel}>Mark as Read</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.modalFooterBtns}>
          <TouchableOpacity style={[styles.btnAction, { backgroundColor: "#5D5D66", flex: 1 }]} onPress={onClose} activeOpacity={0.8}>
            <XGlyph color="#fff" size={12} />
            <Text style={styles.btnActionText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: COLORS.orange, flex: 1 }]}
            onPress={() => onUpdate(notification.id, status, read)}
            activeOpacity={0.8}
          >
            <SaveGlyph color="#fff" size={12} />
            <Text style={styles.btnActionText}>Update</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* View Modes (Table / Grid)                                            */
/* ------------------------------------------------------------------ */
function NotificationsTable({
  items,
  onEdit,
  onOrder,
}: {
  items: AppNotification[];
  onEdit: (n: AppNotification) => void;
  onOrder: (n: AppNotification) => void;
}) {
  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHeadRow}>
        <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>Date</Text>
        <Text style={[styles.tableHeadCell, { flex: 1 }]}>Order ID</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.5 }]}>Customer</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.5 }]}>Ad Detail</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.8 }]}>Amount</Text>
        <Text style={[styles.tableHeadCell, { flex: 1 }]}>Status</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.6 }]}>Read</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.6, textAlign: "center" }]}>Action</Text>
      </View>
      {items.map((n) => {
        const avaColor = avatarColor(n.customer);
        return (
          <View key={n.id} style={styles.tableRow}>
            <Text style={[styles.dateText, { flex: 1.2 }]} numberOfLines={1}>{n.date}</Text>
            <Text style={[styles.idMono, { flex: 1 }]} numberOfLines={1}>{n.orderId}</Text>
            <View style={{ flex: 1.5, flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 8 }}>
              <View style={[styles.avatar, { backgroundColor: avaColor }]}>
                <Text style={styles.avatarText}>{n.customer.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.custName} numberOfLines={1}>{n.customer}</Text>
                <Text style={styles.custMail} numberOfLines={1}>{n.email}</Text>
              </View>
            </View>
            <Text style={[styles.adTitle, { flex: 1.5, paddingRight: 8 }]} numberOfLines={2}>{n.detail}</Text>
            <Text style={[styles.amt, { flex: 0.8 }]}>{fmtINR(n.amount)}</Text>
            <View style={{ flex: 1 }}>
              <StatusBadge status={n.status} />
            </View>
            <View style={{ flex: 0.6 }}>
              {n.unread ? (
                <View style={styles.unreadDotWrap}>
                  <View style={styles.unreadDot} />
                  <Text style={styles.unreadText}>Unread</Text>
                </View>
              ) : (
                <Text style={styles.readText}>Read</Text>
              )}
            </View>
            <View style={{ flex: 0.6, alignItems: "center" }}>
              <ActionButtons onEdit={() => onEdit(n)} onViewOrder={() => onOrder(n)} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function NotificationsListPhone({
  items,
  onEdit,
  onOrder,
}: {
  items: AppNotification[];
  onEdit: (n: AppNotification) => void;
  onOrder: (n: AppNotification) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {items.map((n) => {
        const avaColor = avatarColor(n.customer);
        return (
          <View key={n.id} style={styles.listCard}>
            <View style={styles.listCardTopRow}>
              <Text style={styles.idMono}>{n.orderId}</Text>
              <StatusBadge status={n.status} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
              <View style={[styles.avatar, { backgroundColor: avaColor, width: 40, height: 40 }]}>
                <Text style={[styles.avatarText, { fontSize: 16 }]}>{n.customer.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.custName}>{n.customer}</Text>
                <Text style={styles.custMail}>{n.email}</Text>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={styles.adTitle} numberOfLines={2}>{n.detail}</Text>
            </View>
            <View style={styles.listCardBottomRow}>
              <Text style={styles.amt}>{fmtINR(n.amount)}</Text>
              <Text style={styles.dateText}>{n.date}</Text>
            </View>
            <View style={[styles.listCardBottomRow, { borderTopWidth: 0, marginTop: 4, paddingTop: 4 }]}>
              {n.unread ? (
                <View style={styles.unreadDotWrap}>
                  <View style={styles.unreadDot} />
                  <Text style={styles.unreadText}>Unread</Text>
                </View>
              ) : (
                <Text style={styles.readText}>Read</Text>
              )}
            </View>
            <View style={styles.listCardActions}>
              <TouchableOpacity style={[styles.listCardActionBtn, { backgroundColor: COLORS.orangeTint }]} onPress={() => onEdit(n)}>
                <PencilGlyph size={13} color={COLORS.orangeDeep} />
                <Text style={[styles.listCardActionText, { color: COLORS.orangeDeep }]}>Edit Status</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.listCardActionBtn} onPress={() => onOrder(n)}>
                <EyeGlyph size={14} color={COLORS.navyDeep} />
                <Text style={styles.listCardActionText}>View Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function NotificationsGrid({
  items,
  onEdit,
  onOrder,
  cardWidth,
}: {
  items: AppNotification[];
  onEdit: (n: AppNotification) => void;
  onOrder: (n: AppNotification) => void;
  cardWidth: number;
}) {
  return (
    <View style={styles.gridRow}>
      {items.map((n) => {
        const avaColor = avatarColor(n.customer);
        return (
          <View key={n.id} style={[styles.gridCard, { width: cardWidth }]}>
            <View style={styles.gridCardTop}>
              <View style={[styles.avatar, { backgroundColor: avaColor, width: 40, height: 40 }]}>
                <Text style={[styles.avatarText, { fontSize: 16 }]}>{n.customer.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.custName} numberOfLines={1}>{n.customer}</Text>
                <Text style={styles.custMail} numberOfLines={1}>{n.email}</Text>
              </View>
              <StatusBadge status={n.status} />
            </View>
            <View style={styles.gridCardMid}>
              <Text style={styles.adTitle} numberOfLines={2}>{n.detail}</Text>
              <Text style={styles.idMono} numberOfLines={1}>{n.orderId}</Text>
            </View>
            <View style={styles.gridCardBottom}>
              <Text style={styles.gridCardAmt}>{fmtINR(n.amount)}</Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.dateText}>{n.date}</Text>
                {n.unread ? (
                  <View style={[styles.unreadDotWrap, { marginTop: 4 }]}>
                    <View style={styles.unreadDot} />
                    <Text style={styles.unreadText}>Unread</Text>
                  </View>
                ) : (
                  <Text style={[styles.readText, { marginTop: 4 }]}>Read</Text>
                )}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <TouchableOpacity style={[styles.listCardActionBtn, { backgroundColor: COLORS.orangeTint }]} onPress={() => onEdit(n)}>
                <PencilGlyph size={13} color={COLORS.orangeDeep} />
                <Text style={[styles.listCardActionText, { color: COLORS.orangeDeep }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.listCardActionBtn} onPress={() => onOrder(n)}>
                <EyeGlyph size={14} color={COLORS.navyDeep} />
                <Text style={styles.listCardActionText}>Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Main Screen                                                          */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 8;

export default function AdsNotificationsScreen() {
  const router = useRouter();
  const { width: windowWidth } = useBreakpoint();
  const { measuredWidth, onLayout } = useMeasuredWidth(windowWidth);

  const [items, setItems] = useState<AppNotification[]>(INITIAL_DATA);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<"status" | "read" | null>(null);

  const [editing, setEditing] = useState<AppNotification | null>(null);

  const bp: Breakpoint = measuredWidth >= 1024 ? "desktop" : measuredWidth >= 640 ? "tablet" : "phone";
  const isTablet = bp !== "phone";
  const contentPad = bp === "phone" ? 14 : 24;
  const gutter = bp === "phone" ? 12 : 16;
  const fullWidth = Math.max(0, measuredWidth - contentPad * 2);
  const gridCols = bp === "desktop" ? 3 : bp === "tablet" ? 2 : 1;
  const gridGap = 16;
  const gridCardWidth = (fullWidth - gridGap * (gridCols - 1)) / gridCols;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((n) => {
      if (status !== "all" && n.status !== status) return false;
      if (readFilter === "read" && n.unread) return false;
      if (readFilter === "unread" && !n.unread) return false;
      if (q && !(n.orderId.toLowerCase().includes(q) || n.customer.toLowerCase().includes(q) || n.detail.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, search, status, readFilter]);

  useEffect(() => setPage(1), [search, status, readFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const total = items.length;
    const unread = items.filter((n) => n.unread).length;
    const paid = items.filter((n) => n.status === "paid").reduce((s, n) => s + n.amount, 0);
    const pending = items.filter((n) => n.status === "pending").reduce((s, n) => s + n.amount, 0);
    return { total, unread, paid, pending };
  }, [items]);

  const handleUpdate = (id: string, newStatus: NotificationStatus, isRead: boolean) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, status: newStatus, unread: !isRead } : n)));
    setEditing(null);
  };

  const handleOrder = (n: AppNotification) => {
    router.push('/order-details' as any);
  };

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
    <AdminLayout>
      <View style={{ flex: 1, width: "100%" }} onLayout={onLayout}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: contentPad, paddingTop: 16, paddingBottom: 28, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <ScreenHeader />
          {bp === "phone" ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: -32, zIndex: 10 }} contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingRight: 32 }}>
              <StatCard
                icon={<BellStatGlyph color={COLORS.navyDeep} size={17} />}
                label="TOTAL ALERTS"
                value={String(stats.total)}
                iconBg={COLORS.navyTint}
                valueColor={COLORS.navyDeep}
              />
              <StatCard
                icon={<BellStatGlyph color={COLORS.orange} size={17} />}
                label="UNREAD"
                value={String(stats.unread)}
                iconBg={COLORS.orangeTint}
                valueColor={COLORS.orange}
              />
              <StatCard
                icon={<CheckCircleGlyph color={COLORS.active} size={17} />}
                label="PAID AMOUNT"
                value={fmtINR(stats.paid)}
                iconBg={COLORS.active + "15"}
                valueColor={COLORS.active}
              />
              <StatCard
                icon={<TrendGlyph color={COLORS.blue} size={17} />}
                label="PENDING"
                value={fmtINR(stats.pending)}
                iconBg={COLORS.blue + "15"}
                valueColor={COLORS.blue}
              />
            </ScrollView>
          ) : (
            <View style={[styles.statsRow, { marginTop: -32, paddingHorizontal: 16, zIndex: 10 }]}>
              <StatCard
                icon={<BellStatGlyph color={COLORS.navyDeep} size={17} />}
                label="TOTAL ALERTS"
                value={String(stats.total)}
                iconBg={COLORS.navyTint}
                valueColor={COLORS.navyDeep}
              />
              <StatCard
                icon={<BellStatGlyph color={COLORS.orange} size={17} />}
                label="UNREAD"
                value={String(stats.unread)}
                iconBg={COLORS.orangeTint}
                valueColor={COLORS.orange}
              />
              <StatCard
                icon={<CheckCircleGlyph color={COLORS.active} size={17} />}
                label="PAID AMOUNT"
                value={fmtINR(stats.paid)}
                iconBg={COLORS.active + "15"}
                valueColor={COLORS.active}
              />
              <StatCard
                icon={<TrendGlyph color={COLORS.blue} size={17} />}
                label="PENDING"
                value={fmtINR(stats.pending)}
                iconBg={COLORS.blue + "15"}
                valueColor={COLORS.blue}
              />
            </View>
          )}

          <View style={{ marginTop: gutter, zIndex: 30, position: "relative" }}>
            <View style={[styles.filterCard, { zIndex: 100 }]}>
              {isTablet ? (
                <View style={[styles.filterRow, { zIndex: 100 }]}>
                  <View style={styles.searchBox}>
                    <SearchGlyph />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search notifications..."
                      placeholderTextColor={COLORS.muted}
                      style={styles.searchInput}
                    />
                  </View>
                  {toggleButtons}
                  <StatusDropdown
                    value={status}
                    onChange={setStatus}
                    open={openDropdown === "status"}
                    onToggle={() => setOpenDropdown((p) => (p === "status" ? null : "status"))}
                  />
                  <ReadDropdown
                    value={readFilter}
                    onChange={setReadFilter}
                    open={openDropdown === "read"}
                    onToggle={() => setOpenDropdown((p) => (p === "read" ? null : "read"))}
                  />
                </View>
              ) : (
                <View style={{ gap: 12, zIndex: 100 }}>
                  <View style={styles.searchBox}>
                    <SearchGlyph />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search notifications..."
                      placeholderTextColor={COLORS.muted}
                      style={styles.searchInput}
                    />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, zIndex: 100, overflow: "visible" }}>
                    <View style={{ flex: 1, minWidth: 120, zIndex: openDropdown === "status" ? 50 : 20, overflow: "visible" }}>
                      <StatusDropdown
                        value={status}
                        onChange={setStatus}
                        open={openDropdown === "status"}
                        onToggle={() => setOpenDropdown((p) => (p === "status" ? null : "status"))}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 120, zIndex: openDropdown === "read" ? 50 : 10, overflow: "visible" }}>
                      <ReadDropdown
                        value={readFilter}
                        onChange={setReadFilter}
                        open={openDropdown === "read"}
                        onToggle={() => setOpenDropdown((p) => (p === "read" ? null : "read"))}
                      />
                    </View>
                    {toggleButtons}
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={{ marginTop: 8, zIndex: 1 }}>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No notifications match your filters</Text>
                <Text style={styles.emptySub}>Try clearing the search or switching the dropdown filters.</Text>
              </View>
            ) : viewMode === "grid" ? (
              <NotificationsGrid items={pageItems} onEdit={setEditing} onOrder={handleOrder} cardWidth={gridCardWidth} />
            ) : !isTablet ? (
              <NotificationsListPhone items={pageItems} onEdit={setEditing} onOrder={handleOrder} />
            ) : (
              <NotificationsTable items={pageItems} onEdit={setEditing} onOrder={handleOrder} />
            )}
          </View>

          {filtered.length > 0 && (
            <View style={{ marginTop: gutter, zIndex: 0 }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                itemsPerPage={PAGE_SIZE}
                itemName="notifications"
                onPageChange={setPage}
              />
            </View>
          )}
        </ScrollView>
        {editing && <UpdateNotificationModal notification={editing} onClose={() => setEditing(null)} onUpdate={handleUpdate} isTablet={isTablet} />}
      </View>
    </AdminLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.navyDeep,
    borderRadius: 16,
    marginBottom: 4,
    overflow: "hidden",
  },
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
  statCardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  statIconBadge: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statValue: { fontWeight: "700", fontSize: 18 },
  statLabel: { fontSize: 11, fontWeight: "600", color: COLORS.muted, letterSpacing: 0.4 },

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
  filterRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
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

  dropdownWrap: { position: "relative", zIndex: 20, minWidth: 140 },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.page,
    minWidth: 140,
  },
  dropdownBtnText: { flex: 1, fontWeight: "600", fontSize: 12, color: COLORS.ink },
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
    minWidth: 140,
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
  dropdownOptionText: { fontSize: 12.5, color: COLORS.ink },
  dropdownOptionTextActive: { fontWeight: "700", color: COLORS.navyDeep },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },

  /* view toggle — two separate boxed icon buttons */
  viewToggleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewToggleBoxBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.rule,
  },
  viewToggleBoxBtnActive: {
    backgroundColor: COLORS.navyDeep,
    borderColor: COLORS.navyDeep,
  },

  avatar: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  custName: { fontWeight: "600", fontSize: 13, color: COLORS.ink },
  custMail: { fontSize: 10, color: COLORS.muted, marginTop: 1 },
  idMono: { fontSize: 11.5, fontWeight: "700", color: COLORS.orangeDeep },
  adTitle: { fontWeight: "600", fontSize: 12.5, color: COLORS.ink },
  amt: { fontWeight: "700", fontSize: 13.5, color: COLORS.ink },
  dateText: { fontSize: 11, color: COLORS.muted },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusBadgeText: { fontWeight: "700", fontSize: 10.5 },
  unreadDotWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.orange },
  unreadText: { fontSize: 10, fontWeight: "700", color: COLORS.orange, textTransform: "uppercase" },
  readText: { fontSize: 10, color: COLORS.muted2, textTransform: "uppercase" },
  actionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },

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
  tableHeadRow: { flexDirection: "row", backgroundColor: COLORS.orangeTint, paddingVertical: 13, paddingHorizontal: 14, gap: 8 },
  tableHeadCell: { fontSize: 10.5, fontWeight: "700", color: COLORS.inkSoft, textTransform: "uppercase", letterSpacing: 0.4 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.ruleSoft },

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
  listCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  listCardBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.ruleSoft },
  listCardActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  listCardActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.navyTint, borderRadius: 8, paddingVertical: 9 },
  listCardActionText: { fontWeight: "700", fontSize: 12, color: COLORS.navyDeep },

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
  gridCardMid: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.ruleSoft },
  gridCardAmt: { fontWeight: "800", fontSize: 18, color: COLORS.navyDeep },
  gridCardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },

  emptyState: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 32, alignItems: "center" },
  emptyTitle: { fontWeight: "700", fontSize: 15, color: COLORS.ink },
  emptySub: { fontSize: 12.5, color: COLORS.muted, marginTop: 6, textAlign: "center" },

  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  modalCard: { width: 400, backgroundColor: COLORS.surface, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalCardPhone: { width: "90%" },
  modalHeaderOrange: { backgroundColor: COLORS.orange, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalHeaderTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalCloseIcon: { padding: 4 },
  modalBody: { padding: 24, zIndex: 10, elevation: 10 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: COLORS.ink, marginBottom: 8 },
  selectWrap: { position: "relative", marginBottom: 24 },
  selectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COLORS.rule, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  selectBtnText: { fontSize: 14, color: COLORS.ink },
  selectMenu: { marginTop: 4, maxHeight: 220, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.rule, borderRadius: 8, overflow: "hidden" },
  selectOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.ruleSoft },
  selectOptionActive: { backgroundColor: COLORS.orangeTint },
  selectOptionText: { fontSize: 14, color: COLORS.ink },
  selectOptionTextActive: { color: COLORS.orangeDeep, fontWeight: "600" },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: COLORS.muted2, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  checkboxLabel: { fontSize: 14, color: COLORS.ink, fontWeight: "500" },
  modalFooterBtns: { flexDirection: "row", paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  btnAction: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 8 },
  btnActionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});