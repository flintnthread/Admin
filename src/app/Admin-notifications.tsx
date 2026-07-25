import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AdminLayout from '@/components/admin-layout';
import { usePayoutRequestAlerts } from "@/hooks/usePayoutRequestAlerts";
import { useAuth } from "@/context/auth-context";

/**
 * â”€â”€ INTEGRATION NOTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Assumes it's rendered inside your shared AdminLayout, same as
 * AddSellersScreen / AdPlacementsScreen:
 *
 *   <AdminLayout activeRoute="notifications">
 *     <NotificationsScreen />
 *   </AdminLayout>
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

const COLORS = {
  navy: "#151D4F",
  navySoft: "#152238",
  orange: "#F97316",
  orangeDark: "#EA580C",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#1E293B",
  textMuted: "#64748B",
  textFaint: "#94A3B8",
  orangeBg: "#FFF7ED",
};

type NotifType = "Order" | "Seller" | "Ad" | "Ticket" | "Payment";

type TypeMeta = { label: string; color: string; bg: string; icon: keyof typeof Feather.glyphMap };

const TYPE_META: Record<NotifType, TypeMeta> = {
  Order: { label: "Orders", color: "#059669", bg: "#ECFDF5", icon: "box" },
  Seller: { label: "Sellers", color: "#D97706", bg: "#FFFBEB", icon: "user-plus" },
  Ad: { label: "Ads", color: "#0D9488", bg: "#F0FDFA", icon: "target" },
  Ticket: { label: "Tickets", color: "#E11D48", bg: "#FFF1F2", icon: "headphones" },
  Payment: { label: "Payments", color: "#2563EB", bg: "#EFF6FF", icon: "credit-card" },
};

type Notification = {
  id: number;
  type: NotifType;
  title: string;
  message: string;
  time: string;
  unread: boolean;
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, type: "Order", title: "New order placed", message: "Order #FNT202607118773 was placed by Satya Retail Corporation.", time: "2m ago", unread: true },
  { id: 2, type: "Ticket", title: "New support ticket", message: "Sairamya raised a ticket about a delayed shipment.", time: "14m ago", unread: true },
  { id: 3, type: "Seller", title: "Seller pending approval", message: "Kusuma Adari submitted documents for seller verification.", time: "38m ago", unread: true },
  { id: 4, type: "Ad", title: "Ad placement expiring soon", message: "Homepage Main Banner placement expires in 2 days.", time: "1h ago", unread: false },
  { id: 5, type: "Order", title: "Payment received", message: "â‚¹1,331.85 payment confirmed for order #FNT202607106534.", time: "3h ago", unread: false },
  { id: 6, type: "Seller", title: "Seller reactivated", message: "Sravani Surampalli's account is now active again.", time: "5h ago", unread: false },
  { id: 7, type: "Ad", title: "New placement request", message: "A vendor requested a Category Sub-Banner slot for August.", time: "Yesterday", unread: false },
  { id: 8, type: "Ticket", title: "Ticket resolved", message: "Support ticket #TCK-2291 was marked as resolved.", time: "Yesterday", unread: false },
];

function timeSort(a: Notification, b: Notification) {
  return a.id - b.id;
}

function UnreadDot() {
  return <View style={styles.unreadDot} />;
}

function TypeIcon({ type, size = 18 }: { type: NotifType; size?: number }) {
  const meta = TYPE_META[type];
  return (
    <View style={[styles.typeIconBox, { backgroundColor: meta.bg, width: size + 20, height: size + 20, borderRadius: (size + 20) / 2.6 }]}>
      <Feather name={meta.icon} size={size} color={meta.color} />
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  tint,
  tintBg,
  isMobile,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: number;
  label: string;
  tint: string;
  tintBg: string;
  isMobile: boolean;
}) {
  return (
    <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
      {isMobile ? (
        <>
          <View style={[styles.statIconBox, styles.statIconBoxMobile, { backgroundColor: tintBg }]}>
            <Feather name={icon} size={14} color={tint} />
          </View>
          <Text style={[styles.statValue, styles.statValueMobile]}>{value}</Text>
          <Text style={styles.statLabelMobile} numberOfLines={1}>{label}</Text>
        </>
      ) : (
        <>
          <View style={[styles.statIconBox, { backgroundColor: tintBg }]}>
            <Feather name={icon} size={17} color={tint} />
          </View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
        </>
      )}
    </View>
  );
}

function RefreshToast({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      const t = setTimeout(onClose, 1400);
      return () => clearTimeout(t);
    } else {
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.refreshToast, { opacity }]} pointerEvents="none">
      <Feather name="check-circle" size={14} color="#fff" />
      <Text style={styles.refreshToastText}>Notifications refreshed</Text>
    </Animated.View>
  );
}

const FILTERS: { key: "All" | NotifType; label: string; color: string }[] = [
  { key: "All", label: "All", color: COLORS.orange },
  { key: "Payment", label: "Payments", color: TYPE_META.Payment.color },
  { key: "Order", label: "Orders", color: TYPE_META.Order.color },
  { key: "Seller", label: "Sellers", color: TYPE_META.Seller.color },
  { key: "Ad", label: "Ads", color: TYPE_META.Ad.color },
  { key: "Ticket", label: "Tickets", color: TYPE_META.Ticket.color },
];

export default function NotificationsScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isMobile = !isTablet;
  const router = useRouter();
  const { token } = useAuth();
  const { notifications: payoutNotifs, pendingCount, refresh } = usePayoutRequestAlerts(!!token);

  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<"All" | NotifType>("All");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">(isMobile ? "list" : "grid");
  const [refreshToast, setRefreshToast] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const paymentRows: Notification[] = payoutNotifs.map((n) => ({
      id: 100000 + n.requestId,
      type: "Payment" as const,
      title: n.text,
      message: n.detail,
      time: n.time,
      unread: true,
    }));
    setNotifications([...paymentRows, ...INITIAL_NOTIFICATIONS]);
  }, [payoutNotifs]);

  const counts = useMemo(() => {
    const c = {
      "Payment Requests": pendingCount,
      "New Orders": 0,
      "Pending Sellers": 0,
      "Pending Ads": 0,
      "Open Tickets": 0,
    };
    notifications.forEach((n) => {
      if (n.unread) {
        if (n.type === "Order") c["New Orders"]++;
        if (n.type === "Seller") c["Pending Sellers"]++;
        if (n.type === "Ad") c["Pending Ads"]++;
        if (n.type === "Ticket") c["Open Tickets"]++;
      }
    });
    return c;
  }, [notifications, pendingCount]);

  const filtered = useMemo(() => {
    return notifications
      .filter((n) => activeFilter === "All" || n.type === activeFilter)
      .filter((n) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.type === "Payment" && b.type !== "Payment") return -1;
        if (b.type === "Payment" && a.type !== "Payment") return 1;
        return timeSort(a, b);
      });
  }, [notifications, activeFilter, query]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    setRefreshToast(true);
  };

  const markRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const openNotification = (n: Notification) => {
    markRead(n.id);
    if (n.type === "Payment") {
      router.push({ pathname: "/Sellerpayments", params: { tab: "requests" } } as any);
    }
  };

  const clearFilters = () => {
    setActiveFilter("All");
    setQuery("");
  };

  const gridColumns = isDesktop ? 2 : isTablet ? 2 : 1;

  return (
    <AdminLayout>
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView
          style={{ width: "100%" }}
          contentContainerStyle={{ padding: isTablet ? 24 : 16, paddingBottom: 40, width: "100%" }}
        >
          {/* Navy header */}
          <View style={styles.hero}>
            <View style={styles.heroTopRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 }}>
                <View style={styles.heroIconBadge}>
                  <Feather name="bell" size={18} color="#fff" />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.heroTitle}>Notifications Center</Text>
                  <Text style={styles.heroSubtitle}>
                    Payment requests, orders, sellers, ads & support
                    {pendingCount > 0 ? ` Â· ${pendingCount} payment request(s)` : ""}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => void handleRefresh()}>
                <Animated.View>
                  <Feather name="refresh-cw" size={14} color="#fff" />
                </Animated.View>
                <Text style={styles.refreshBtnText}>{refreshing ? "Refreshingâ€¦" : "Refresh"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overlapping stat cards */}
          <View style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
            <StatCard icon="credit-card" value={counts["Payment Requests"]} label="Payment Requests" tint={TYPE_META.Payment.color} tintBg={TYPE_META.Payment.bg} isMobile={isMobile} />
            <StatCard icon="box" value={counts["New Orders"]} label="New Orders" tint={TYPE_META.Order.color} tintBg={TYPE_META.Order.bg} isMobile={isMobile} />
            <StatCard icon="user-plus" value={counts["Pending Sellers"]} label="Pending Sellers" tint={TYPE_META.Seller.color} tintBg={TYPE_META.Seller.bg} isMobile={isMobile} />
            <StatCard icon="headphones" value={counts["Open Tickets"]} label="Open Tickets" tint={TYPE_META.Ticket.color} tintBg={TYPE_META.Ticket.bg} isMobile={isMobile} />
          </View>

          {/* Search + view toggle */}
          <View style={[styles.toolbarCard, isMobile && { marginTop: 14 }]}>
            <View style={[styles.searchRow, isMobile && { flexDirection: "column", alignItems: "stretch", gap: 10 }]}>
              <View style={styles.searchBox}>
                <Feather name="search" size={14} color={COLORS.textFaint} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search notificationsâ€¦"
                  placeholderTextColor={COLORS.textFaint}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
              <View style={[styles.viewToggleRow, isMobile && { alignSelf: "flex-end" }]}>
                <Text style={styles.viewLabel}>View:</Text>
                <TouchableOpacity
                  style={[styles.viewToggleBtn, view === "grid" && styles.viewToggleBtnActive]}
                  onPress={() => setView("grid")}
                >
                  <Feather name="grid" size={14} color={view === "grid" ? "#fff" : COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewToggleBtn, view === "list" && styles.viewToggleBtnActive]}
                  onPress={() => setView("list")}
                >
                  <Feather name="list" size={14} color={view === "list" ? "#fff" : COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
              {FILTERS.map((f) => {
                const selected = activeFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setActiveFilter(f.key)}
                    style={[
                      styles.filterPill,
                      selected
                        ? { backgroundColor: f.color, borderColor: f.color }
                        : { backgroundColor: "#fff", borderColor: COLORS.border },
                    ]}
                  >
                    <Text style={[styles.filterPillText, { color: selected ? "#fff" : f.color }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Notifications feed */}
          <View style={[styles.feedCard, { marginTop: 16 }]}>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Feather name="bell-off" size={26} color={COLORS.textFaint} />
                </View>
                <Text style={styles.emptyTitle}>No notifications found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your filter or search criteria.</Text>
                <TouchableOpacity style={styles.emptyResetBtn} onPress={clearFilters}>
                  <Feather name="rotate-ccw" size={13} color={COLORS.orange} />
                  <Text style={styles.emptyResetBtnText}>Reset filters</Text>
                </TouchableOpacity>
              </View>
            ) : view === "list" ? (
              <View style={{ gap: 10 }}>
                {filtered.map((n) => {
                  const meta = TYPE_META[n.type];
                  return (
                    <TouchableOpacity
                      key={n.id}
                      onPress={() => openNotification(n)}
                      style={[styles.listItem, { borderLeftColor: meta.color }]}
                    >
                      <TypeIcon type={n.type} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          {n.unread && <UnreadDot />}
                          <Text style={styles.itemTitle} numberOfLines={1}>{n.title}</Text>
                        </View>
                        <Text style={styles.itemMessage} numberOfLines={2}>{n.message}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                          <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                            <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
                          </View>
                          <Text style={styles.itemTime}>{n.time}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.gridWrap}>
                {filtered.map((n) => {
                  const meta = TYPE_META[n.type];
                  return (
                    <TouchableOpacity
                      key={n.id}
                      onPress={() => openNotification(n)}
                      style={[
                        styles.gridItem,
                        { width: gridColumns === 1 ? "100%" : "48.5%", borderTopColor: meta.color },
                      ]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <TypeIcon type={n.type} size={16} />
                        {n.unread && <UnreadDot />}
                      </View>
                      <Text style={styles.itemTitle} numberOfLines={1}>{n.title}</Text>
                      <Text style={styles.itemMessage} numberOfLines={3}>{n.message}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                        <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        <Text style={styles.itemTime}>{n.time}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        <RefreshToast visible={refreshToast} onClose={() => setRefreshToast(false)} />
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: COLORS.navy, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 20, overflow: "hidden" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  heroIconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroSubtitle: { color: "#94A3B8", fontSize: 12, marginTop: 2, fontWeight: "400" },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.orange, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  refreshBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  statsRow: { flexDirection: "row", flexWrap: "nowrap", justifyContent: "center", gap: 10, marginTop: -20, paddingHorizontal: 2 },
  statsRowMobile: { flexWrap: "nowrap", justifyContent: "space-between", gap: 6, marginTop: -16, paddingHorizontal: 0 },
  statCard: { flexGrow: 0, flexShrink: 1, width: 150, backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: "#F1F5F9", shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  statCardMobile: { flex: 1, width: undefined, minWidth: 0, borderRadius: 13, paddingHorizontal: 8, paddingVertical: 9 },
  statIconBox: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statIconBoxMobile: { width: 21, height: 21, borderRadius: 7 },
  statValue: { fontSize: 20, fontWeight: "700", color: COLORS.navy, marginTop: 9 },
  statValueMobile: { fontSize: 14, marginTop: 6 },
  statLabel: { fontSize: 11.5, color: COLORS.textFaint, fontWeight: "500", marginTop: 2 },
  statLabelMobile: { fontSize: 9, color: COLORS.textFaint, fontWeight: "500", marginTop: 1 },

  toolbarCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#F1F5F9", marginTop: 20 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text, padding: 0 },
  viewToggleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  viewLabel: { fontSize: 12, color: COLORS.textFaint, fontWeight: "500", marginRight: 2 },
  viewToggleBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  viewToggleBtnActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },

  filterPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  filterPillText: { fontSize: 12.5, fontWeight: "600" },

  feedCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#F1F5F9" },

  typeIconBox: { alignItems: "center", justifyContent: "center" },

  listItem: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "#FAFBFD", borderRadius: 14, padding: 12, borderLeftWidth: 3 },
  itemTitle: { fontSize: 13.5, fontWeight: "600", color: COLORS.text, flexShrink: 1 },
  itemMessage: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, lineHeight: 16 },
  itemTime: { fontSize: 10.5, color: COLORS.textFaint, fontWeight: "500" },

  typeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: "700" },

  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.orange },

  gridWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  gridItem: { backgroundColor: "#FAFBFD", borderRadius: 14, padding: 13, borderTopWidth: 3 },

  emptyState: { alignItems: "center", paddingVertical: 44, paddingHorizontal: 20 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.navy },
  emptySubtitle: { fontSize: 12.5, color: COLORS.textFaint, marginTop: 4, textAlign: "center" },
  emptyResetBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, borderWidth: 1, borderColor: COLORS.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  emptyResetBtnText: { fontSize: 12.5, fontWeight: "600", color: COLORS.orange },

  refreshToast: { position: "absolute", bottom: 28, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.navy, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  refreshToastText: { color: "#fff", fontSize: 12.5, fontWeight: "600" },
});