import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/context/auth-context";
import { getApiErrorMessage } from "@/lib/api/client";
import { sweetConfirm, sweetError, sweetSuccess } from "@/lib/sweetAlert";
import type { SellerSummary } from "@/lib/api/types";
import { blurActiveElementOnWeb } from "@/lib/focus";
import { formatDate } from "@/lib/format";
import { fetchSellers, resendSellerVerification } from "@/services/sellerApi";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const NAVY = "#1D324E";
const BLUE = "#2563EB";
const BLUE_LIGHT = "#EFF6FF";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const GREEN = "#16A34A";
const RED = "#DC2626";
const AMBER = "#D97706";

type StatusFilter = "all" | "active" | "email_pending" | "pending" | "suspended" | "rejected";

type SellerRow = {
  id: number;
  name: string;
  businessName: string;
  email: string;
  mobile: string;
  status: string;
  statusLabel: string;
  kycStatus: string;
  registeredOn: string;
  resendEligible: boolean;
};

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "email_pending", label: "Email Pending" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

function formatMobile(mobile?: string | null): string {
  const raw = (mobile ?? "").trim();
  if (!raw) return "—";
  if (raw.startsWith("+")) return raw;
  if (raw.length === 10) return `+91${raw}`;
  return raw;
}

function formatStatusLabel(status?: string | null): string {
  const raw = (status ?? "").trim().toLowerCase();
  if (!raw) return "—";
  if (raw === "email_pending") return "Email_pending";
  if (raw === "active") return "Active";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function mapSellerRow(s: SellerSummary): SellerRow {
  const status = (s.status ?? "").toLowerCase();
  return {
    id: s.id,
    name: s.fullName?.trim() || "—",
    businessName: s.businessName?.trim() || "—",
    email: s.email?.trim() || "—",
    mobile: formatMobile(s.mobile),
    status,
    statusLabel: formatStatusLabel(s.status),
    kycStatus: s.kycStatusLabel?.trim() || (s.kycVerified ? "Completed" : "Not Completed"),
    registeredOn: formatDate(s.createdAt),
    resendEligible: Boolean(
      s.resendVerificationEligible ??
        (!s.emailVerified && (status === "email_pending" || status === "pending"))
    ),
  };
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  const normalized = status.toLowerCase();
  let color = MUTED;
  let bg = "#F1F5F9";
  if (normalized === "active") {
    color = GREEN;
    bg = "#DCFCE7";
  } else if (normalized === "email_pending") {
    color = RED;
    bg = "#FEE2E2";
  } else if (normalized === "pending") {
    color = AMBER;
    bg = "#FEF3C7";
  } else if (normalized === "suspended" || normalized === "rejected") {
    color = RED;
    bg = "#FEE2E2";
  }
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg, borderColor: color }]}>
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function KycBadge({ label }: { label: string }) {
  const done = label.toLowerCase().includes("complete") || label.toLowerCase().includes("verified");
  return (
    <View style={[styles.kycBadge, { backgroundColor: done ? "#DCFCE7" : "#F1F5F9" }]}>
      <Text style={[styles.kycBadgeText, { color: done ? GREEN : "#475569" }]}>{label}</Text>
    </View>
  );
}

export default function SellerManagementScreen() {
  const { token, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;
  const isMobile = width < 768;

  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const itemsPerPage = isMobile ? 10 : 15;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSellers({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQ || undefined,
        page: page - 1,
        size: itemsPerPage,
      });
      setSellers((res.items ?? []).map(mapSellerRow));
      setTotalElements(res.totalElements ?? 0);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load sellers."));
      setSellers([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, searchQ, page, itemsPerPage]);

  useEffect(() => {
    if (authLoading || !token) return;
    void load();
  }, [authLoading, token, load]);

  const totalPages = Math.max(1, Math.ceil(totalElements / itemsPerPage));

  const statusFilterLabel = useMemo(
    () => STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? "All Status",
    [statusFilter]
  );

  const handleSearch = () => {
    setPage(1);
    setSearchQ(search.trim());
  };

  const handleView = (sellerId: number) => {
    blurActiveElementOnWeb();
    router.push({ pathname: "/approveseller", params: { sellerId: String(sellerId) } });
  };

  const handleResend = async (seller: SellerRow) => {
    const prompt = `Resend verification email to ${seller.email}?`;
    if (!(await sweetConfirm({ title: "Resend verification", text: prompt, confirmText: "Send" }))) return;
    setResendingId(seller.id);
    try {
      const result = await resendSellerVerification(seller.id);
      const msg = result.message || "Verification email sent.";
      void sweetSuccess("Success", msg);
    } catch (e) {
      const msg = getApiErrorMessage(e, "Failed to resend verification email.");
      void sweetError("Error", msg);
    } finally {
      setResendingId(null);
    }
  };

  return (
    <AdminLayout>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <View style={styles.headerContainer}>
          {isMobile ? (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.headerIconBox}>
                  <Feather name="user-plus" size={20} color="#fff" />
                </View>
                <Text style={[styles.title, { flex: 1, fontSize: 18 }]}>Seller Management</Text>
              </View>
              <Text style={styles.subtitle}>All registered sellers — including unverified accounts</Text>
            </View>
          ) : (
            <View style={styles.header}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View style={styles.headerIconBox}>
                  <Feather name="user-plus" size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.title}>Seller Management</Text>
                  <Text style={styles.subtitle}>All registered sellers — including unverified accounts</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => void load()}>
                <Feather name="refresh-cw" size={16} color={BLUE} />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Feather name="search" size={18} color={MUTED} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, business, email, mobile…"
              placeholderTextColor={MUTED}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>

          <View style={styles.toolbarRight}>
            <View style={styles.filterWrap}>
              <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => setShowStatusMenu((v) => !v)}
              >
                <Text style={styles.filterBtnText}>{statusFilterLabel}</Text>
                <Feather name="chevron-down" size={16} color={NAVY} />
              </TouchableOpacity>
              {showStatusMenu && (
                <View style={styles.filterMenu}>
                  {STATUS_FILTERS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterItem, statusFilter === opt.value && styles.filterItemActive]}
                      onPress={() => {
                        setStatusFilter(opt.value);
                        setShowStatusMenu(false);
                        setPage(1);
                      }}
                    >
                      <Text
                        style={[
                          styles.filterItemText,
                          statusFilter === opt.value && styles.filterItemTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "grid" && styles.viewToggleBtnActive]}
                onPress={() => setViewMode("grid")}
              >
                <Feather name="grid" size={16} color={viewMode === "grid" ? "#fff" : MUTED} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive]}
                onPress={() => setViewMode("list")}
              >
                <Feather name="list" size={16} color={viewMode === "list" ? "#fff" : MUTED} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={styles.muted}>Loading sellers…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => void load()}>
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sellers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="users" size={40} color={BLUE} />
            <Text style={styles.emptyTitle}>No sellers found</Text>
            <Text style={styles.muted}>Try adjusting your search or status filter.</Text>
          </View>
        ) : viewMode === "list" && isWide ? (
          <View style={styles.tableCard}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 0.5 }]}>ID</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Name</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Business Name</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>Email</Text>
              <Text style={[styles.th, { flex: 1 }]}>Mobile</Text>
              <Text style={[styles.th, { flex: 0.9, textAlign: "center" }]}>Status</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>KYC Status</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>Registered On</Text>
              <Text style={[styles.th, { flex: 1.1, textAlign: "center" }]}>Action</Text>
            </View>
            {sellers.map((s, idx) => (
              <View key={s.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.td, { flex: 0.5, fontWeight: "600" }]}>{s.id}</Text>
                <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>{s.name}</Text>
                <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>{s.businessName}</Text>
                <Text style={[styles.td, { flex: 1.4, color: MUTED }]} numberOfLines={1}>{s.email}</Text>
                <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{s.mobile}</Text>
                <View style={{ flex: 0.9, alignItems: "center" }}>
                  <StatusBadge label={s.statusLabel} status={s.status} />
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <KycBadge label={s.kycStatus} />
                </View>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Feather name="calendar" size={12} color={MUTED} />
                  <Text style={[styles.td, { fontSize: 12 }]}>{s.registeredOn}</Text>
                </View>
                <View style={[styles.actionCol, { flex: 1.1 }]}>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => handleView(s.id)}>
                    <Feather name="eye" size={14} color="#fff" />
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                  {s.resendEligible && (
                    <TouchableOpacity
                      style={styles.resendBtn}
                      disabled={resendingId === s.id}
                      onPress={() => void handleResend(s)}
                    >
                      {resendingId === s.id ? (
                        <ActivityIndicator size="small" color={AMBER} />
                      ) : (
                        <>
                          <Feather name="mail" size={12} color={AMBER} />
                          <Text style={styles.resendBtnText}>Resend verification</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={viewMode === "grid" ? styles.grid : styles.cardList}>
            {sellers.map((s) => (
              <View key={s.id} style={viewMode === "grid" ? styles.gridCard : styles.mobileCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardId}>#{s.id}</Text>
                  <StatusBadge label={s.statusLabel} status={s.status} />
                </View>
                <Text style={styles.cardName}>{s.name}</Text>
                <Text style={styles.cardBiz}>{s.businessName}</Text>
                <Text style={styles.cardMeta}>{s.email}</Text>
                <Text style={styles.cardMeta}>{s.mobile}</Text>
                <View style={styles.cardKycRow}>
                  <Text style={styles.cardKycLabel}>KYC:</Text>
                  <KycBadge label={s.kycStatus} />
                </View>
                <View style={styles.cardDateRow}>
                  <Feather name="calendar" size={12} color={MUTED} />
                  <Text style={styles.cardMeta}>{s.registeredOn}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => handleView(s.id)}>
                    <Feather name="eye" size={14} color="#fff" />
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                  {s.resendEligible && (
                    <TouchableOpacity
                      style={styles.resendBtn}
                      disabled={resendingId === s.id}
                      onPress={() => void handleResend(s)}
                    >
                      <Feather name="mail" size={12} color={AMBER} />
                      <Text style={styles.resendBtnText}>Resend verification</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && sellers.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalElements}
            itemsPerPage={itemsPerPage}
          />
        )}
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  pageContent: { padding: 16, paddingBottom: 32 },
  headerContainer: {
    backgroundColor: NAVY,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshText: { color: BLUE, fontWeight: "600", fontSize: 13 },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
    alignItems: "center",
    zIndex: 100,
  },
  searchBox: {
    flex: 1,
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1E293B" },
  toolbarRight: { flexDirection: "row", alignItems: "center", gap: 10, zIndex: 100 },
  filterWrap: { position: "relative", zIndex: 20 },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  filterBtnText: { color: NAVY, fontWeight: "600", fontSize: 13 },
  filterMenu: {
    position: "absolute",
    top: 46,
    right: 0,
    minWidth: 160,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  filterItem: { paddingHorizontal: 14, paddingVertical: 10 },
  filterItemActive: { backgroundColor: BLUE_LIGHT },
  filterItemText: { fontSize: 13, color: "#334155" },
  filterItemTextActive: { color: BLUE, fontWeight: "600" },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    overflow: "hidden",
  },
  viewToggleBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  viewToggleBtnActive: { backgroundColor: NAVY },
  center: { alignItems: "center", paddingVertical: 48, gap: 12 },
  muted: { color: MUTED, fontSize: 14 },
  error: { color: RED, fontSize: 14, textAlign: "center" },
  primaryBtn: {
    backgroundColor: BLUE,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  emptyCard: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: NAVY },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BLUE_LIGHT,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  th: { fontSize: 11, fontWeight: "700", color: NAVY, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: { backgroundColor: "#F8FAFC" },
  td: { fontSize: 13, color: "#1E293B", paddingRight: 8 },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  kycBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  kycBadgeText: { fontSize: 11, fontWeight: "600" },
  actionCol: { alignItems: "center", gap: 6 },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: NAVY,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },
  viewBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: AMBER,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#FFFBEB",
  },
  resendBtnText: { color: AMBER, fontSize: 10, fontWeight: "600" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCard: {
    width: "48%",
    minWidth: 280,
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 4,
  },
  cardList: { gap: 12 },
  mobileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 4,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardId: { fontSize: 12, fontWeight: "700", color: BLUE },
  cardName: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  cardBiz: { fontSize: 13, color: "#334155" },
  cardMeta: { fontSize: 12, color: MUTED },
  cardKycRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  cardKycLabel: { fontSize: 12, color: MUTED },
  cardDateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  cardActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
});
