import AdminLayout from "@/components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapBankPendingRow } from "@/lib/mappers";
import { fetchBankStats, fetchPendingBankSellers } from "@/services/sellerApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";

type BankRow = ReturnType<typeof mapBankPendingRow>;

const STAT_DEFS = [
  { icon: "people", label: "Total Sellers", key: "total", sub: "Bank submissions", color: "#FF6B35", bg: "#FFF3EE" },
  { icon: "time", label: "Pending Sellers", key: "pending", sub: "Pending approval", color: "#4CAF50", bg: "#F0FBF0" },
  { icon: "shield-checkmark", label: "Approved Sellers", key: "verified", sub: "Verified banks", color: "#2196F3", bg: "#EEF5FF" },
  { icon: "business", label: "Banks Integrated", key: "verified", sub: "Total verified", color: "#FF6B35", bg: "#FFF3EE" },
  { icon: "hourglass", label: "Avg. Approval Time", key: "avgDays", sub: "This month", color: "#9C27B0", bg: "#F5EEF8" },
  { icon: "trending-up", label: "Approval Rate", key: "rate", sub: "This month", color: "#00BCD4", bg: "#EEF9FB" },
] as const;

/* ─── Dropdown Component ─────────────────────────────────────────────────── */
function Dropdown({
  value, onChange, options, style,
}: {
  value: string; onChange: (v: string) => void;
  options: string[]; style?: object;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const { width: screenW } = Dimensions.get("window");
  const isDesktop = screenW >= 1024;

  const handlePress = () => {
    if (!open && triggerRef.current) {
      triggerRef.current.measure((x, y, width, height, pageX, pageY) => {
        const { width: screenWidth } = Dimensions.get("window");
        const menuWidth = Math.min(width, screenWidth - 32);
        const adjustedLeft = Math.min(pageX, screenWidth - menuWidth - 16);
        setMenuPosition({ top: pageY + height, left: adjustedLeft, width: menuWidth });
      });
    }
    setOpen(o => !o);
  };

  return (
    <View style={[{ minWidth: 120 }, style]}>
      <TouchableOpacity
        ref={triggerRef as any}
        activeOpacity={0.8}
        onPress={handlePress}
        style={styles.dropdownTrigger}
      >
        <Text style={styles.dropdownText} numberOfLines={1}>{value}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={12} color="#94A3B8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        {menuPosition && (
          <View style={[styles.dropdownOverlay, { top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }]}>
            <View style={[styles.dropdownMenu, isDesktop && styles.dropdownMenuDesktop]}>
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {options.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => { onChange(opt); setOpen(false); }}
                    style={[
                      styles.dropdownItem,
                      value === opt && { backgroundColor: "#FF6B35" },
                    ]}
                  >
                    <Text style={{ fontSize: 13, color: value === opt ? "#fff" : "#374151", fontWeight: value === opt ? "700" : "400" }}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, { bg: string; color: string; dot: string }> = {
    pending: { bg: "#FF6B35", color: "#fff", dot: "#FF6B35" },
    not_requested: { bg: "#1a2332", color: "#fff", dot: "#555" },
    approved: { bg: "#E8F5E9", color: "#2E7D32", dot: "#4CAF50" },
  };
  const s = styles[status] || styles.not_requested;
  // return (
  //   <View style={{
  //     backgroundColor: s.bg,
  //     borderRadius: 2,
  //     paddingHorizontal: 3,
  //     paddingVertical: 1,
  //   }}>
  return (
    <View style={{
      backgroundColor: s.bg,
      borderRadius: 2,
      paddingHorizontal: 6,
      paddingVertical: 2,
      alignSelf: 'flex-start',
    }}>
      <Text style={{
        color: s.color,
        fontSize: 9,
        fontWeight: "600",
      }}>
        {label}
      </Text>
    </View>
  );
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    // <View
    //   style={{
    //     width: 40,
    //     height: 40,
    //     borderRadius: 20,
    //     backgroundColor: color + "22",
    //     alignItems: "center",
    //     justifyContent: "center",
    //     fontWeight: "700",
    //     borderWidth: 1.5,
    //     borderColor: color + "44",
    //   }}
    // >
    //   <Text style={{ color, fontWeight: "700", fontSize: 14 }}>{initials}</Text>
    // </View>
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: color + "22",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: color + "44",
      }}
    >
      <Text
        style={{
          color,
          fontWeight: "700",
          fontSize: 14,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

// export default function BankApproval(){


// const router = useRouter();
// const [activeNav, setActiveNav] = useState("Pending Sellers");
// const [activeTab, setActiveTab] = useState("Dashboard");

// Detect mobile via window width using state
// const [isMobile, setIsMobile] = useState(
//   typeof window !== "undefined" ? window.innerWidth < 768 : false
// );
// const [searchQuery, setSearchQuery] = useState("");

// React.useEffect(() => {
//   const handle = () => setIsMobile(window.innerWidth < 768);
//   window.addEventListener("resize", handle);
//   return () => window.removeEventListener("resize", handle);
// }, []);
export default function BankApproval() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("Pending Sellers");
  const [activeTab, setActiveTab] = useState("Dashboard");

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const STATUS_OPTIONS = ["All", "Pending", "Approved", "Not Requested"];
  const [sellers, setSellers] = useState<BankRow[]>([]);
  const [bankStats, setBankStats] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
      const [pendingRes, statsRes] = await Promise.all([
        fetchPendingBankSellers(0, 200),
        fetchBankStats(),
      ]);
      setSellers((pendingRes?.items ?? []).map(mapBankPendingRow));
      setBankStats(statsRes ?? {});
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
      setSellers([]);
      setBankStats({});
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSellers = sellers.filter((seller) => {
    const matchStatus =
      statusFilter === "All" ||
      (statusFilter === "Pending" && seller.status === "pending") ||
      (statusFilter === "Approved" && seller.status === "approved") ||
      (statusFilter === "Not Requested" && seller.status === "not_requested");
    const matchSearch =
      !normalizedQuery ||
      [seller.name, seller.business, seller.phone, seller.email].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      );
    return matchStatus && matchSearch;
  });

  const pending = bankStats.pending ?? 0;
  const verified = bankStats.verified ?? 0;
  const total = pending + verified;
  const rate = total > 0 ? `${Math.round((verified / total) * 1000) / 10}%` : "—";
  const stats = STAT_DEFS.map((s) => {
    let value = "—";
    if (s.key === "total") value = String(total);
    else if (s.key === "pending") value = String(pending);
    else if (s.key === "verified") value = String(verified);
    else if (s.key === "rate") value = rate;
    return { ...s, value };
  });

  // Pagination state (defined after filter)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = isMobile ? 5 : 10;
  const totalEntries = filteredSellers.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const pagedSellers = filteredSellers.slice(startIndex, endIndex);

  function gotoPage(n: number) {
    const v = Math.max(1, Math.min(totalPages, n));
    setCurrentPage(v);
  }

  function makePageList() {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  return (
    <AdminLayout>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Main */}
        <View style={styles.mainContent}>
          {/* Page Content */}
          <View style={[styles.pageContent, { padding: isDesktop ? 32 : isMobile ? 16 : 24 }]}>

            {loadError ? (
              <Text style={{ color: "#DC2626", marginBottom: 12 }}>{loadError}</Text>
            ) : null}

            {/* Desktop Page Title Bar */}
            {!isMobile && (
              <View style={styles.desktopHeader}>
                <View style={styles.desktopHeaderLeft}>
                  <Text style={styles.desktopTitle}>Seller Bank Approval</Text>
                  {/* <View style={styles.desktopBreadcrumb}>
                    <Text style={styles.desktopBreadcrumbItem}>Dashboard</Text>
                    <Text style={styles.desktopBreadcrumbSeparator}>•</Text>
                    <Text style={styles.desktopBreadcrumbItem}>Sellers</Text>
                    <Text style={styles.desktopBreadcrumbSeparator}>•</Text>
                    <Text style={styles.desktopBreadcrumbItemActive}>Bank Approval</Text>
                  </View> */}
                </View>
                <View style={styles.desktopHeaderTabs}>
                  <TouchableOpacity style={styles.desktopTabActive} onPress={() => router.push('/bankverification')}>
                    <Text style={styles.desktopTabTextActive}>Bank Verifications</Text>
                  </TouchableOpacity>
                  {/* <TouchableOpacity style={styles.desktopTab} onPress={() => router.push('/supportticket')}> */}
                  <TouchableOpacity style={[styles.desktopTab, { backgroundColor: '#16A34A' }]} onPress={() => router.push('/Sellerticket')}>

                    <Text style={styles.desktopTabText}>Seller Support</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Mobile Page Title */}
            {isMobile && (
              <View style={{ backgroundColor: "#1d324e", padding: 16, borderRadius: 12, marginBottom: 14 }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 4 }}>Seller Bank Approval</Text>
                {/* <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 12, color: "#FF6B35" }}>Dashboard</Text>
                  <Text style={{ fontSize: 10, color: "#999" }}>›</Text>
                  <Text style={{ fontSize: 12, color: "#FF6B35" }}>Sellers</Text>
                  <Text style={{ fontSize: 10, color: "#999" }}>›</Text>
                  <Text style={{ fontSize: 12, color: "#999" }}>Bank Approval</Text>
                </View> */}
              </View>
            )}

            {/* Mobile action buttons */}
            {isMobile && (
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                <TouchableOpacity style={[styles.btnOutline, { flex: 1, justifyContent: "center" }]} onPress={() => router.push('/bankverification')}>
                  <Text style={styles.btnOutlineText}>Bank Verifications</Text>
                </TouchableOpacity>
                {/* <TouchableOpacity style={[styles.btnDark, { flex: 1, justifyContent: "center" }]} onPress={() => router.push('/supportticket')}> */}
                <TouchableOpacity style={[styles.btnDark, { flex: 1, justifyContent: "center", backgroundColor: '#16A34A' }]} onPress={() => router.push('/Sellerticket')}>
                  <Text style={styles.btnDarkText}>Seller Support</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Desktop Stats Section */}
            {!isMobile && (
              <View style={styles.desktopStatsContainer}>
                {stats.map((stat, index) => (
                  <View key={index} style={styles.desktopStatCard}>
                    <View style={styles.desktopStatTopRow}>
                      <View style={[styles.desktopStatIconContainer, { backgroundColor: stat.bg }]}>
                        <Ionicons name={stat.icon as any} size={14} color={stat.color} />
                      </View>
                      <Text style={[styles.desktopStatValue, { color: stat.color }]}>{stat.value}</Text>
                    </View>
                    <View style={styles.desktopStatBottomRow}>
                      <Text style={styles.desktopStatLabel}>{stat.label}</Text>
                      <Text style={styles.desktopStatSub}>{stat.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Filters */}
            <View style={{ backgroundColor: isMobile ? "transparent" : "#fff", paddingHorizontal: isMobile ? 0 : 28, paddingTop: isMobile ? 0 : 20, paddingBottom: isMobile ? 0 : 20, borderBottomWidth: isMobile ? 0 : 1, borderBottomColor: isMobile ? "transparent" : "#f0f2f5", marginBottom: isMobile ? 0 : 0 }}>
              {!isMobile ? (
                <View style={styles.desktopFilterRow}>
                  <View style={styles.desktopFilterItem}>
                    <Text style={styles.desktopFilterLabel}>Status</Text>
                    <Dropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
                  </View>
                  {/* <View style={styles.desktopFilterItem}>   */}
                  <View style={[styles.desktopFilterItem, { flexBasis: 600 }]}>
                    <Text style={styles.desktopFilterLabel}>Search</Text>
                    <TextInput
                      style={styles.desktopSearchInput}
                      placeholder="Seller name / email / mobile / business"
                      value={searchQuery}
                      onChangeText={(text) => {
                        setSearchQuery(text);
                        setCurrentPage(1);
                      }}
                    />
                  </View>
                  <TouchableOpacity style={styles.desktopFilterBtn}>
                    <Text style={styles.desktopFilterBtnText}>Filter</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#333", marginBottom: 6 }}>Status</Text>
                      <Dropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#333", marginBottom: 6 }}>Search</Text>
                      <TextInput
                        style={[styles.searchInput, { paddingRight: 36, fontSize: 12 }]}
                        placeholder="Seller name / email / mobile / business"
                        value={searchQuery}
                        onChangeText={(text) => {
                          setSearchQuery(text);
                          setCurrentPage(1);
                        }}
                      />
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.filterBtn, { width: "100%", justifyContent: "center" }]}>
                    <Text style={styles.filterBtnText}>Filter</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Stats (Mobile/Tablet only) */}
            {isMobile && (
              <View style={{ paddingHorizontal: isMobile ? 0 : 28, paddingTop: isMobile ? 0 : 24, paddingBottom: isMobile ? 0 : 24, backgroundColor: isMobile ? "transparent" : "#fff", borderBottomWidth: isMobile ? 0 : 1, borderBottomColor: isMobile ? "transparent" : "#f0f2f5", marginBottom: isMobile ? 14 : 24 }}>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: isMobile ? 10 : isDesktop ? 14 : 16,
                  }}
                >
                  {stats.map((s, i) => (
                    <View style={[styles.statCard, isMobile && styles.statCardMobile, isDesktop && styles.statCardDesktop, { paddingVertical: isMobile ? 8 : 10, paddingHorizontal: isMobile ? 10 : 14, gap: isMobile ? 6 : 10, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center" }]} key={i}>
                      <View style={[styles.statIcon, { backgroundColor: s.bg, width: isMobile ? 30 : 38, height: isMobile ? 30 : 38 }]}>
                        <Ionicons name={s.icon as any} size={isMobile ? 14 : 18} color={s.color} />
                      </View>
                      <View>
                        <Text style={{ fontSize: isMobile ? 9 : 11, color: "#888", fontWeight: "500", marginBottom: 2 }}>{s.label}</Text>
                        <Text style={{ fontSize: isMobile ? 14 : 18, fontWeight: "800", color: "#1a2332", lineHeight: 14 }}>{s.value}</Text>
                        <Text style={{ fontSize: isMobile ? 8 : 10, color: "#aaa", marginTop: 2 }}>{s.sub}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Desktop Table */}
            {!isMobile && (
              <View style={[styles.desktopTable, { marginHorizontal: 0, width: '100%' }]}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 0.4 }]}>ID</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Seller</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.0 }]}>Business</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>Status</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.0 }]}>Bank</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Account</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.7 }]}>Requested</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Seller Confirm</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Actions</Text>
                </View>
                {pagedSellers.map((s, i) => (
                  <View key={startIndex + i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { color: "#555", fontWeight: "600", flex: 0.4 }]}>{s.id}</Text>
                    <View style={[styles.tableCell, { flex: 1.5 }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Avatar initials={s.initials} color={s.color} />
                        <View>
                          <Text style={{ fontWeight: "600", color: "#1a2332", fontSize: 12 }}>{s.name}</Text>
                          <Text style={{ color: "#888", fontSize: 11 }}>{s.email}</Text>
                          <Text style={{ color: "#888", fontSize: 11 }}>{s.phone}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.tableCell, { fontWeight: "600", fontSize: 11, flex: 1.0 }]}>{s.business}</Text>
                    <View style={[styles.tableCell, { flex: 0.6 }]}><StatusBadge status={s.status} label={s.statusLabel} /></View>
                    <View style={[styles.tableCell, { flex: 1.0 }]}>
                      <Text style={{ fontWeight: "600", fontSize: 12 }}>{s.bank}</Text>
                      <Text style={{ color: "#888", fontSize: 10 }}>{s.branch}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 0.9 }]}>
                      <Text style={{ fontSize: 12 }}>{s.account}</Text>
                      <Text style={{ color: "#888", fontSize: 10 }}>{s.ifsc}</Text>
                    </View>
                    <Text style={[styles.tableCell, { fontSize: 10, color: "#555", flex: 0.7 }]}>{s.requested}</Text>
                    <Text style={[styles.tableCell, { fontSize: 10, color: "#555", flex: 0.8 }]}>{s.sellerConfirm}</Text>
                    <View style={[styles.tableCell, { flex: 0.5 }]}>
                      <TouchableOpacity style={styles.viewBtn} onPress={() => router.push({ pathname: '/viewbankdetails', params: { sellerId: String(s.sellerId) } })}>
                        <Text style={{ color: "#FF6B35", fontWeight: "600", fontSize: 11 }}>View</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <View style={styles.tableFooter}>
                  <Text style={{ fontSize: 13, color: "#666" }}>Showing {startIndex + 1} to {endIndex} of {totalEntries} entries</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <TouchableOpacity style={styles.pageBtn} onPress={() => gotoPage(currentPage - 1)} disabled={currentPage === 1}>
                      <Text style={{ color: currentPage === 1 ? '#9CA3AF' : '#374151', fontWeight: '600' }}>←</Text>
                    </TouchableOpacity>
                    {makePageList().map((p, i) => (
                      typeof p === 'number' ? (
                        <TouchableOpacity key={i} style={[styles.pageBtn, p === currentPage && styles.pageBtnActive]} onPress={() => gotoPage(p as number)}>
                          <Text style={{ color: p === currentPage ? '#FFF' : '#374151', fontWeight: '600' }}>{p}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View key={i} style={[styles.pageBtn, { borderWidth: 0 }]}>
                          <Text style={{ color: '#6B7280', fontWeight: '600' }}>{p}</Text>
                        </View>
                      )
                    ))}
                    <TouchableOpacity style={styles.pageBtn} onPress={() => gotoPage(currentPage + 1)} disabled={currentPage === totalPages}>
                      <Text style={{ color: currentPage === totalPages ? '#9CA3AF' : '#374151', fontWeight: '600' }}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Mobile Cards */}
            <View style={isMobile ? styles.mobileCards : styles.desktopCards}>
              {pagedSellers.map((s, i) => {
                const isApproved = s.status === "approved";
                const isPending = s.status === "pending";
                const dotColor = isApproved ? "#4CAF50" : isPending ? "#FF6B35" : "#1a2332";
                return (
                  <View style={styles.mobileSellerCard} key={i}>
                    <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
                      <Avatar initials={s.initials} color={s.color} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", fontSize: 14, color: "#1a2332" }}>{s.name}</Text>
                        <Text style={{ fontSize: 11.5, color: "#888" }}>{s.email}</Text>
                        <Text style={{ fontSize: 11.5, color: "#888" }}>{s.phone}</Text>
                      </View>
                      <TouchableOpacity style={{ borderWidth: 1.5, borderColor: "#FF6B35", backgroundColor: "#fff", borderRadius: 7, padding: 5, flexDirection: "row", alignItems: "center", gap: 4 }} onPress={() => router.push({ pathname: '/viewbankdetails', params: { sellerId: String(s.sellerId) } })}>
                        <Text style={{ color: "#FF6B35", fontWeight: "600", fontSize: 12 }}>View</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: "#aaa", fontWeight: "600", marginBottom: 2 }}>Business</Text>
                        <Text style={{ fontSize: 11.5, fontWeight: "600", color: "#1a2332" }}>{s.business}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: "#aaa", fontWeight: "600", marginBottom: 2 }}>Bank</Text>
                        <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#1a2332" }}>{s.bank}</Text>
                        <Text style={{ fontSize: 10, color: "#888" }}>{s.branch}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: "#aaa", fontWeight: "600", marginBottom: 2 }}>Account</Text>
                        <Text style={{ fontSize: 11.5, color: "#1a2332" }}>{s.account}</Text>
                        <Text style={{ fontSize: 10, color: "#888" }}>{s.ifsc}</Text>
                      </View>
                    </View>

                    {/* Progress Timeline */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 0, marginBottom: 8 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dotColor }} />
                      <View style={{ flex: 1, height: 2, backgroundColor: isApproved ? "#4CAF50" : "#e5e7eb" }} />
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#e5e7eb", borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 7, color: "#999" }}>👤</Text>
                      </View>
                      <View style={{ flex: 1, height: 2, backgroundColor: isApproved ? "#4CAF50" : "#e5e7eb" }} />
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#e5e7eb", borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 7, color: "#999" }}>🛡️</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>Status</Text>
                        <StatusBadge status={s.status} label={s.statusLabel} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>Requested</Text>
                        <Text style={{ fontSize: 10.5, color: "#555" }}>{s.requested}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>Seller Confirm</Text>
                        <Text style={{ fontSize: 10.5, color: "#555" }}>{s.sellerConfirm}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Mobile Pagination */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: "#666" }}>Showing {startIndex + 1} to {endIndex} of {totalEntries} entries</Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <TouchableOpacity style={styles.pageBtn} onPress={() => gotoPage(currentPage - 1)} disabled={currentPage === 1}>
                    <Text style={{ color: currentPage === 1 ? '#9CA3AF' : '#374151', fontWeight: '600' }}>←</Text>
                  </TouchableOpacity>
                  {makePageList().map((p, i) => (
                    typeof p === 'number' ? (
                      <TouchableOpacity key={i} style={[styles.pageBtn, p === currentPage && styles.pageBtnActive]} onPress={() => gotoPage(p as number)}>
                        <Text style={{ color: p === currentPage ? '#FFF' : '#374151', fontWeight: '600' }}>{p}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View key={i} style={[styles.pageBtn, { borderWidth: 0 }]}>
                        <Text style={{ color: '#6B7280', fontWeight: '600' }}>{p}</Text>
                      </View>
                    )
                  ))}
                  <TouchableOpacity style={styles.pageBtn} onPress={() => gotoPage(currentPage + 1)} disabled={currentPage === totalPages}>
                    <Text style={{ color: currentPage === totalPages ? '#9CA3AF' : '#374151', fontWeight: '600' }}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fa",
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContent: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    padding: 16,
  },
  mobileCards: {
    display: "flex",
  },
  desktopCards: {
    display: "none",
  },
  mobileSellerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 14,
    padding: 16,
  },
  desktopTable: {
    // marginHorizontal: 28,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  /* Desktop Header Styles */
  desktopHeader: {
    backgroundColor: "#151D4F",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 64,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  desktopHeaderLeft: {
    flex: 1,
  },
  desktopTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  desktopBreadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  desktopBreadcrumbItem: {
    fontSize: 13,
    color: "#FF6B35",
    fontWeight: "500",
  },
  desktopBreadcrumbSeparator: {
    fontSize: 13,
    color: "#666",
  },
  desktopBreadcrumbItemActive: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "500",
  },
  desktopHeaderTabs: {
    flexDirection: "row",
    gap: 8,
  },
  desktopTabActive: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  desktopTab: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  desktopTabTextActive: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  desktopTabText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },

  /* Desktop Stats Styles */
  desktopStatsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
    marginTop: -48,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  desktopStatCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "column",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E8EDF5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  desktopStatTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 8,
  },
  desktopStatBottomRow: {
    flexDirection: "column",
    gap: 2,
  },
  desktopStatIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  desktopStatValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  desktopStatLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  desktopStatSub: {
    fontSize: 11,
    color: "#94A3B8",
  },

  /* Desktop Filter Styles */
  desktopFilterRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-end",
  },
  desktopFilterItem: {
    flexBasis: 200,
    flexGrow: 0,
    flexShrink: 0,
  },
  desktopFilterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  desktopSearchInput: {
    borderWidth: 1,
    borderColor: "#E8EDF5",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    backgroundColor: "#fff",
  },
  desktopFilterBtn: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  desktopFilterBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tableHeader: {
    backgroundColor: "#1a2332",
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "600",
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f5",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: "#333",
  },
  tableFooter: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnActive: {
    backgroundColor: "#1d324e",
    borderColor: "#1d324e",
  },
  viewBtn: {
    borderWidth: 1.5,
    borderColor: "#FF6B35",
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: "#FF6B35",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  btnOutlineText: {
    color: "#FF6B35",
    fontSize: 13,
    fontWeight: "600",
  },
  btnDark: {
    backgroundColor: "#1a2332",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  btnDarkText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  filterBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
  },
  filterBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 13.5,
    color: "#555",
  },
  selectInput: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 13.5,
    backgroundColor: "#fff",
    color: "#555",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statCardMobile: {
    flex: 1,
    minWidth: "45%",
  },
  statCardDesktop: {
    width: "23%",
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  /* Dropdown */
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    zIndex: 10,
  },
  dropdownText: {
    fontSize: 13.5,
    color: "#555",
    flex: 1,
    marginRight: 6,
  },
  dropdownOverlay: {
    position: "absolute",
    paddingHorizontal: 0,
    zIndex: 9999,
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    overflow: "hidden",
    width: "100%",
    maxWidth: 340,
    zIndex: 10000,
  },
  dropdownMenuDesktop: {
    maxWidth: 400,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
});