/**
 * BankVerifications.tsx
 * React Native (Expo Router) – full conversion of the Bank Verifications web screen.
 *
 * Dependencies (add to package.json if not present):
 *   expo-router, react-native (core), @expo/vector-icons
 *
 * Usage (Expo Router):  app/bankverifications.tsx  → this file
 */

import AdminLayout from "@/components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import type { SellerSummary } from "@/lib/api/types";
import { initialsFromName, maskAccount } from "@/lib/format";
import { fetchBankStats, fetchBankVerifications } from "@/services/sellerApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

/* ─── Theme ─────────────────────────────────────────────────────────── */
const BLUE = "#2563EB";
const LIGHT = "#F8FAFC";
const BORDER = "#E8EDF5";
const DARK = "#0F172A";

type StatusKey = "Pending" | "Processing" | "Verified" | "Failed" | "Expired";

type Verification = {
  id: string;
  sellerId: number;
  sellerName: string;
  email: string;
  phone: string;
  business: string;
  account: string;
  ifsc: string;
  bank: string;
  status: StatusKey;
  attempts: number;
  created: string;
  verified: string;
  initials: string;
  color: string;
};

const COLORS = ["#F97316", "#10B981", "#8B5CF6", "#3B82F6", "#EC4899", "#06B6D4"];

function mapSellerToVerification(s: SellerSummary, index: number): Verification {
  const verified = Boolean(s.bankVerified);
  const status: StatusKey = verified ? "Verified" : "Pending";
  const created = s.updatedAt ?? s.createdAt;
  return {
    id: `#S${s.id}`,
    sellerId: s.id,
    sellerName: s.fullName ?? "Seller",
    email: s.email ?? "",
    phone: s.mobile ?? "",
    business: s.businessName ?? "—",
    account: maskAccount(s.accountNumber),
    ifsc: s.ifscCode ?? "—",
    bank: s.bankName ?? "—",
    status,
    attempts: 1,
    created: created ? new Date(created).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
    verified: verified && created ? new Date(created).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
    initials: initialsFromName(s.fullName),
    color: COLORS[index % COLORS.length],
  };
}

const STATUS_OPTIONS = ["All Status", "Pending", "Processing", "Verified", "Failed", "Expired"];
const PER_PAGE_OPTIONS = ["5", "10", "20", "50"];

const STATUS_CONFIG: Record<StatusKey, {
  bg: string; color: string; border: string;
  iconName: string; iconLib: string; iconBg: string; iconColor: string;
}> = {
  Pending: { bg: "#FEF9C3", color: "#854D0E", border: "#FDE047", iconName: "time-outline", iconLib: "Ionicons", iconBg: "#FEF08A", iconColor: "#CA8A04" },
  Processing: { bg: "#CFFAFE", color: "#155E75", border: "#67E8F9", iconName: "refresh-outline", iconLib: "Ionicons", iconBg: "#A5F3FC", iconColor: "#0891B2" },
  Verified: { bg: "#DCFCE7", color: "#14532D", border: "#86EFAC", iconName: "checkmark-circle-outline", iconLib: "Ionicons", iconBg: "#BBF7D0", iconColor: "#16A34A" },
  Failed: { bg: "#FEE2E2", color: "#7F1D1D", border: "#FCA5A5", iconName: "close-circle-outline", iconLib: "Ionicons", iconBg: "#FECACA", iconColor: "#DC2626" },
  Expired: { bg: "#F1F5F9", color: "#334155", border: "#CBD5E1", iconName: "hourglass-outline", iconLib: "Ionicons", iconBg: "#E2E8F0", iconColor: "#64748B" },
};

/* ─── Helpers ───────────────────────────────────────────────────────── */
function Avatar({ initials, color, size = 36 }: { initials: string; color: string; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + "22",
      borderWidth: 2, borderColor: color + "55",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ fontWeight: "700", fontSize: size * 0.32, color, letterSpacing: 0.5 }}>
        {initials}
      </Text>
    </View>
  );
}

function StatusBadge({ status, small = false }: { status: string; small?: boolean }) {
  const cfg = STATUS_CONFIG[status as StatusKey] ?? {
    bg: "#F1F5F9", color: "#64748B", border: "#CBD5E1", iconName: "ellipse-outline", iconLib: "Ionicons",
  };
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: cfg.bg,
      borderWidth: 1, borderColor: cfg.border,
      borderRadius: 20,
      paddingVertical: small ? 2 : 4,
      paddingHorizontal: small ? 7 : 10,
      alignSelf: "flex-start",
    }}>
      <Ionicons name={cfg.iconName as any} size={small ? 10 : 12} color={cfg.color} />
      <Text style={{ fontSize: small ? 10 : 12, fontWeight: "600", color: cfg.color }}>{status}</Text>
    </View>
  );
}

function AttemptsRow({ attempts, status }: { attempts: number; status: string }) {
  const dotColor = status === "Failed" ? "#EF4444" : status === "Verified" ? "#22C55E" : "#F59E0B";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: i < attempts ? dotColor : "#E2E8F0",
        }} />
      ))}
      <Text style={{ fontSize: 12, color: "#64748B", marginLeft: 2, fontWeight: "600" }}>{attempts}/3</Text>
    </View>
  );
}

/* ─── Dropdown ──────────────────────────────────────────────────────── */
function Dropdown({
  value, onChange, options, placeholder, minWidth = 160,
}: {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder?: string; minWidth?: number;
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
    <View style={{ minWidth, zIndex: 10 }}>
      <TouchableOpacity
        ref={triggerRef as any}
        onPress={handlePress}
        activeOpacity={0.8}
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderWidth: 1, borderColor: BORDER, borderRadius: 8,
          paddingVertical: 10, paddingHorizontal: 14,
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ fontSize: 14, color: "#374151", flex: 1 }}>{value || placeholder}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color="#94A3B8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        {menuPosition && (
          <View style={{
            position: "absolute",
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
            zIndex: 9999,
          }}>
            <View style={{
              backgroundColor: "#fff", borderRadius: 12,
              borderWidth: 1, borderColor: BORDER,
              shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12, shadowRadius: 20,
              elevation: 12, overflow: "hidden", width: "100%",
              maxWidth: isDesktop ? 400 : 320,
              zIndex: 10000,
            }}>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => { onChange(opt); setOpen(false); }}
                  style={{
                    paddingVertical: 12, paddingHorizontal: 18,
                    backgroundColor: value === opt ? BLUE : "#fff",
                    borderBottomWidth: 1, borderBottomColor: BORDER,
                  }}
                >
                  <Text style={{ fontSize: 14, color: value === opt ? "#fff" : "#374151", fontWeight: value === opt ? "700" : "400" }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────────── */
function StatCard({
  label, value, iconName, iconBg, iconColor, spinning, onPress,
}: {
  label: string; value: number; iconName: string;
  iconBg: string; iconColor: string; spinning?: boolean; onPress?: () => void;
}) {
  const rotation = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get("window");
  const isDesktop = width >= 1024;

  useEffect(() => {
    if (!spinning) return;
    const anim = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 1500, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [spinning]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        borderWidth: 1, borderColor: BORDER, borderRadius: 12,
        padding: isDesktop ? 10 : 14, backgroundColor: "#fff",
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", gap: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isDesktop ? 9 : 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: isDesktop ? 4 : 6 }}>
          {label}
        </Text>
        <Text style={{ fontSize: isDesktop ? 20 : 26, fontWeight: "800", color: DARK, lineHeight: isDesktop ? 22 : 28 }}>{value}</Text>
      </View>
      <View style={{ width: isDesktop ? 36 : 44, height: isDesktop ? 36 : 44, borderRadius: 10, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
        {spinning ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name={iconName as any} size={isDesktop ? 18 : 22} color={iconColor} />
          </Animated.View>
        ) : (
          <Ionicons name={iconName as any} size={isDesktop ? 18 : 22} color={iconColor} />
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ─── Pagination Button ─────────────────────────────────────────────── */
function PagBtn({ iconName, onPress, disabled }: { iconName: string; onPress: () => void; disabled: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={{
        width: 32, height: 32, borderRadius: 6,
        borderWidth: 1, borderColor: BORDER,
        backgroundColor: "#fff",
        alignItems: "center", justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
        zIndex: 10,
      }}
    >
      <Ionicons name={iconName as any} size={13} color={disabled ? "#CBD5E1" : "#374151"} />
    </TouchableOpacity>
  );
}

/* ─── Verification Card (mobile row) ───────────────────────────────── */
function VerificationCard({ item, onViewPress }: { item: Verification; onViewPress: (sellerId: number) => void }) {
  return (
    <View style={{
      borderWidth: 1, borderColor: BORDER, borderRadius: 12,
      padding: 14, backgroundColor: "#FAFBFD", marginBottom: 10,
    }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Avatar initials={item.initials} color={item.color} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontWeight: "700", color: DARK, fontSize: 15 }} numberOfLines={1}>{item.sellerName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
            <Ionicons name="mail-outline" size={11} color="#94A3B8" />
            <Text style={{ fontSize: 11, color: "#94A3B8" }} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="call-outline" size={11} color="#94A3B8" />
            <Text style={{ fontSize: 11, color: "#94A3B8" }}>{item.phone}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>{item.id}</Text>
          <StatusBadge status={item.status} small />
        </View>
      </View>

      {/* Account info */}
      <View style={{
        backgroundColor: "#F8FAFC", borderRadius: 8,
        padding: 10, marginBottom: 10,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <Ionicons name="card-outline" size={14} color="#64748B" />
          <Text style={{ fontWeight: "700", color: "#374151", fontSize: 13 }}>{item.account}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="business-outline" size={12} color="#94A3B8" />
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
            {item.bank}  ·  IFSC: {item.ifsc}
          </Text>
        </View>
      </View>

      {/* Meta grid */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Attempts", val: null, attemptsData: { attempts: item.attempts, status: item.status } },
          { label: "Created", val: item.created, attemptsData: null },
          { label: "Verified", val: item.verified, attemptsData: null },
        ].map(({ label, val, attemptsData }) => (
          <View key={label} style={{
            flex: 1, backgroundColor: "#fff",
            borderWidth: 1, borderColor: BORDER,
            borderRadius: 8, padding: 8,
          }}>
            <Text style={{ fontSize: 9, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", marginBottom: 4 }}>
              {label}
            </Text>
            {attemptsData ? (
              <AttemptsRow attempts={attemptsData.attempts} status={attemptsData.status} />
            ) : (
              <Text style={{ fontSize: 11, color: val === "—" ? "#CBD5E1" : "#374151", fontWeight: "600" }}>{val}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          onPress={() => onViewPress(item.sellerId)}
          style={{
            flex: 1, backgroundColor: "#EFF6FF",
            borderWidth: 1, borderColor: "#BFDBFE",
            borderRadius: 8, paddingVertical: 9,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Ionicons name="eye-outline" size={15} color={BLUE} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: BLUE }}>View</Text>
        </TouchableOpacity>
        {item.status === "Pending" && (
          <TouchableOpacity
            style={{
              flex: 1, backgroundColor: "#F0FDF4",
              borderWidth: 1, borderColor: "#BBF7D0",
              borderRadius: 8, paddingVertical: 9,
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Ionicons name="checkmark-outline" size={15} color="#16A34A" />
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#16A34A" }}>Verify</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ─── Main Screen ───────────────────────────────────────────────────── */
export default function BankVerifications() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [bankStats, setBankStats] = useState<Record<string, number>>({});

  const { width } = Dimensions.get("window");
  const isMobile = width < 768;
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const loadVerifications = useCallback(async () => {
    try {
      const [pendingRes, verifiedRes, statsRes] = await Promise.all([
        fetchBankVerifications("pending", 0, 500),
        fetchBankVerifications("verified", 0, 500),
        fetchBankStats(),
      ]);
      const merged = [...(pendingRes.items ?? []), ...(verifiedRes.items ?? [])];
      setVerifications(merged.map(mapSellerToVerification));
      setBankStats(statsRes);
    } catch (e) {
      console.warn(getApiErrorMessage(e));
      setVerifications([]);
      setBankStats({});
    }
  }, []);

  useEffect(() => {
    loadVerifications();
  }, [loadVerifications]);

  const goToDetails = (sellerId: number) => {
    router.push({ pathname: "/viewbankdetails", params: { sellerId: String(sellerId) } });
  };

  /* Counts from backend stats API */
  const counts = {
    total: bankStats.total ?? verifications.length,
    pending: bankStats.pending ?? verifications.filter(v => v.status === "Pending").length,
    processing: bankStats.processing ?? verifications.filter(v => v.status === "Processing").length,
    verified: bankStats.verified ?? verifications.filter(v => v.status === "Verified").length,
    failed: bankStats.failed ?? verifications.filter(v => v.status === "Failed").length,
    expired: bankStats.expired ?? verifications.filter(v => v.status === "Expired").length,
  };

  /* Filter */
  const filtered = verifications.filter(v => {
    const matchStatus = statusFilter === "All Status" || v.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      v.sellerName.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.phone.includes(q) ||
      v.business.toLowerCase().includes(q) ||
      v.account.toLowerCase().includes(q) ||
      v.ifsc.toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const doFilter = () => { setSearchQuery(searchInput); setPage(1); };

  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };

  const pageNums: (number | string)[] = (() => {
    if (totalPages <= 5) return [...Array(totalPages)].map((_, i) => i + 1);
    if (safePage <= 3) return [1, 2, 3, "...", totalPages];
    if (safePage >= totalPages - 2) return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", safePage, "...", totalPages];
  })();

  const STAT_CARDS = [
    { label: "TOTAL", value: counts.total, iconName: "list-outline", iconBg: "#EFF6FF", iconColor: "#3B82F6", spinning: false, filterVal: "All Status" },
    { label: "PENDING", value: counts.pending, iconName: "time-outline", iconBg: "#FEF9C3", iconColor: "#CA8A04", spinning: false, filterVal: "Pending" },
    { label: "PROCESSING", value: counts.processing, iconName: "refresh-outline", iconBg: "#CFFAFE", iconColor: "#0891B2", spinning: true, filterVal: "Processing" },
    { label: "VERIFIED", value: counts.verified, iconName: "checkmark-circle-outline", iconBg: "#DCFCE7", iconColor: "#16A34A", spinning: false, filterVal: "Verified" },
    { label: "FAILED", value: counts.failed, iconName: "close-circle-outline", iconBg: "#FEE2E2", iconColor: "#DC2626", spinning: false, filterVal: "Failed" },
    { label: "EXPIRED", value: counts.expired, iconName: "hourglass-outline", iconBg: "#F1F5F9", iconColor: "#64748B", spinning: false, filterVal: "Expired" },
  ];

  return (
    <AdminLayout>
      <View style={{ flex: 1, backgroundColor: LIGHT }}>
        {isMobile ? (
          <FlatList
            data={paginated}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: isTablet ? 24 : 14, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                {/* ── Page Title (Orange Container) ── */}
                <View style={{ backgroundColor: "#1d324e", borderRadius: 16, padding: 16, marginBottom: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name="business-outline" size={24} color="#fff" />
                    <Text style={{ fontSize: isTablet ? 24 : 20, fontWeight: "800", color: "#fff" }}>
                      Bank Verifications
                    </Text>
                  </View>
                </View>

                {/* ── Stat Cards (Mobile/Tablet) ── */}
                {isMobile && (
                  <View style={{
                    backgroundColor: "#fff", borderRadius: 14,
                    borderWidth: 1, borderColor: BORDER,
                    padding: 14, marginBottom: 14,
                  }}>
                    <View style={{
                      flexDirection: "row", flexWrap: "wrap", gap: 10,
                    }}>
                      {STAT_CARDS.map((c, idx) => (
                        <View key={c.label} style={{ width: "47%" }}>
                          <StatCard
                            label={c.label}
                            value={c.value}
                            iconName={c.iconName}
                            iconBg={c.iconBg}
                            iconColor={c.iconColor}
                            spinning={c.spinning}
                            onPress={() => handleStatusChange(c.filterVal)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Filters ── */}
                <View style={{
                  backgroundColor: "#fff", borderRadius: 14,
                  borderWidth: 1, borderColor: BORDER,
                  padding: isTablet ? 16 : 12, marginBottom: 14,
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 8,
                }}>
                  {/* Search */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.filterLabel}>Search</Text>
                    <View style={{
                      flexDirection: "row", alignItems: "center",
                      borderWidth: 1, borderColor: BORDER, borderRadius: 8,
                      backgroundColor: "#fff", paddingHorizontal: 10,
                    }}>
                      <Ionicons name="search-outline" size={16} color="#94A3B8" />
                      <TextInput
                        value={searchInput}
                        onChangeText={setSearchInput}
                        onSubmitEditing={doFilter}
                        returnKeyType="search"
                        placeholder="Search by email, name, account, IFSC..."
                        placeholderTextColor="#94A3B8"
                        style={{
                          flex: 1, fontSize: 13, color: "#374151",
                          paddingVertical: 10, paddingLeft: 6,
                          outlineStyle: "none",
                        } as any}
                      />
                      {searchInput.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchInput(""); setSearchQuery(""); setPage(1); }}>
                          <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Status */}
                  <View style={{ width: isTablet ? 160 : 110 }}>
                    <Text style={styles.filterLabel}>Status</Text>
                    <Dropdown
                      value={statusFilter}
                      onChange={handleStatusChange}
                      options={STATUS_OPTIONS}
                      minWidth={isTablet ? 160 : 110}
                    />
                  </View>

                  {/* Filter button */}
                  <TouchableOpacity
                    onPress={doFilter}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: BLUE, borderRadius: 8,
                      paddingVertical: 10,
                      paddingHorizontal: isTablet ? 16 : 12,
                      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <Ionicons name="search-outline" size={16} color="#fff" />
                    {isTablet && <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Filter</Text>}
                  </TouchableOpacity>
                </View>

                {/* ── Results Header (Mobile/Tablet) ── */}
                {isMobile && (
                  <View style={{
                    backgroundColor: "#fff", borderRadius: 14,
                    borderWidth: 1, borderColor: BORDER,
                    paddingHorizontal: isTablet ? 20 : 14,
                    paddingTop: isTablet ? 16 : 12,
                    paddingBottom: 4,
                    marginBottom: 0,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      <Text style={{ fontSize: 13, color: "#64748B", fontWeight: "500" }}>
                        {filtered.length > 0
                          ? `Showing ${(safePage - 1) * perPage + 1}–${Math.min(safePage * perPage, filtered.length)} of ${filtered.length}`
                          : "No results"}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontSize: 12, color: "#64748B" }}>Per page</Text>
                        <Dropdown
                          value={String(perPage)}
                          onChange={v => { setPerPage(Number(v)); setPage(1); }}
                          options={PER_PAGE_OPTIONS}
                          minWidth={80}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <View style={{
                backgroundColor: "#fff",
                borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER,
                paddingHorizontal: isTablet ? 20 : 14,
              }}>
                <VerificationCard
                  item={item}
                  onViewPress={goToDetails}
                />
              </View>
            )}
            ListEmptyComponent={
              <View style={{
                backgroundColor: "#fff",
                borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER,
                paddingVertical: 60, alignItems: "center",
              }}>
                <Ionicons name="information-circle-outline" size={44} color="#CBD5E1" />
                <Text style={{ fontSize: 15, fontWeight: "500", color: "#94A3B8", marginTop: 12 }}>
                  No verifications found
                </Text>
                {(searchQuery || statusFilter !== "All Status") && (
                  <TouchableOpacity
                    onPress={() => { setSearchInput(""); setSearchQuery(""); setStatusFilter("All Status"); setPage(1); }}
                    style={{
                      marginTop: 12, borderWidth: 1, borderColor: BORDER,
                      borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: BLUE, fontWeight: "600" }}>Clear filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            ListFooterComponent={
              <View>
                {/* bottom border of card */}
                <View style={{
                  backgroundColor: "#fff",
                  borderWidth: 1, borderTopWidth: 0, borderColor: BORDER,
                  borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
                  paddingHorizontal: isTablet ? 20 : 14,
                  paddingBottom: 4,
                }} />

                {/* ── Pagination ── */}
                {filtered.length > 0 && (
                  <View style={{
                    backgroundColor: "#fff", borderRadius: 14,
                    borderWidth: 1, borderColor: BORDER,
                    paddingHorizontal: isTablet ? 20 : 14,
                    paddingVertical: 12,
                    flexDirection: "row", alignItems: "center",
                    justifyContent: "space-between", flexWrap: "wrap", gap: 8,
                    marginTop: 10,
                  }}>
                    <Text style={{ fontSize: 12, color: "#64748B" }}>
                      Page {safePage} of {totalPages}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
                      <PagBtn iconName="play-skip-back-outline" onPress={() => setPage(1)} disabled={safePage === 1} />
                      <PagBtn iconName="chevron-back-outline" onPress={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} />
                      {pageNums.map((p, i) =>
                        p === "..." ? (
                          <View key={"e" + i} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ color: "#94A3B8", fontSize: 14 }}>…</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            key={p}
                            onPress={() => setPage(p as number)}
                            style={{
                              width: 32, height: 32, borderRadius: 6,
                              borderWidth: 1,
                              borderColor: safePage === p ? "#1d324e" : BORDER,
                              backgroundColor: safePage === p ? "#1d324e" : "#fff",
                              alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Text style={{
                              fontSize: 13, fontWeight: "700",
                              color: safePage === p ? "#fff" : "#374151",
                            }}>{p}</Text>
                          </TouchableOpacity>
                        )
                      )}
                      <PagBtn iconName="chevron-forward-outline" onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} />
                      <PagBtn iconName="play-skip-forward-outline" onPress={() => setPage(totalPages)} disabled={safePage === totalPages} />
                    </View>
                  </View>
                )}

                {/* ── Footer ── */}
                <View style={{
                  marginTop: 16, paddingVertical: 16,
                  borderTopWidth: 1, borderTopColor: BORDER,
                  backgroundColor: "#fff", borderRadius: 8,
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>
                    2026 © Flintnthread India Pvt. Ltd.{"\n"}Crafted by{" "}
                    <Text style={{ color: "#16A34A", fontWeight: "700" }}>Flinththread India Pvt. Ltd.</Text>
                  </Text>
                </View>
              </View>
            }
          />
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 32, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Page Title (Orange Container) ── */}
            <View style={{ backgroundColor: "#1d324e", borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="business-outline" size={24} color="#fff" />
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#fff" }}>
                  Bank Verifications
                </Text>
              </View>
            </View>

            {/* ── Filters ── */}
            <View style={{
              backgroundColor: "#fff", borderRadius: 14,
              borderWidth: 1, borderColor: BORDER,
              padding: 20, marginBottom: 14,
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 12,
            }}>
              {/* Search */}
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>Search</Text>
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  borderWidth: 1, borderColor: BORDER, borderRadius: 8,
                  backgroundColor: "#fff", paddingHorizontal: 12,
                }}>
                  <Ionicons name="search-outline" size={16} color="#94A3B8" />
                  <TextInput
                    value={searchInput}
                    onChangeText={setSearchInput}
                    onSubmitEditing={doFilter}
                    returnKeyType="search"
                    placeholder="Search by email, name, account, IFSC..."
                    placeholderTextColor="#94A3B8"
                    style={{
                      flex: 1, fontSize: 14, color: "#374151",
                      paddingVertical: 10, paddingLeft: 8,
                      outlineStyle: "none",
                    } as any}
                  />
                  {searchInput.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchInput(""); setSearchQuery(""); setPage(1); }}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Status */}
              <View style={{ width: 180 }}>
                <Text style={styles.filterLabel}>Status</Text>
                <Dropdown
                  value={statusFilter}
                  onChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                  minWidth={180}
                />
              </View>

              {/* Filter button */}
              <TouchableOpacity
                onPress={doFilter}
                activeOpacity={0.85}
                style={{
                  backgroundColor: BLUE, borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <Ionicons name="search-outline" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Filter</Text>
              </TouchableOpacity>
            </View>

            {/* ── Desktop Table ── */}
            <View style={{ marginBottom: 14, width: '100%' }}>
              <View style={{
                backgroundColor: "#fff", borderRadius: 14,
                borderWidth: 1, borderColor: BORDER,
                overflow: "hidden",
                width: '100%',
              }}>
                {/* Table Header */}
                <View style={{
                  flexDirection: "row",
                  backgroundColor: "#1a2332",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}>
                  <Text style={{ flex: 0.4, fontSize: 12, fontWeight: "600", color: "#fff" }}>ID</Text>
                  <Text style={{ flex: 1.2, fontSize: 12, fontWeight: "600", color: "#fff" }}>Seller</Text>
                  <Text style={{ flex: 0.7, fontSize: 12, fontWeight: "600", color: "#fff" }}>Account</Text>
                  <Text style={{ flex: 0.6, fontSize: 12, fontWeight: "600", color: "#fff" }}>Status</Text>
                  <Text style={{ flex: 0.6, fontSize: 12, fontWeight: "600", color: "#fff" }}>Attempts</Text>
                  <Text style={{ flex: 0.8, fontSize: 12, fontWeight: "600", color: "#fff" }}>Created</Text>
                  <Text style={{ flex: 0.8, fontSize: 12, fontWeight: "600", color: "#fff" }}>Verified</Text>
                  <Text style={{ flex: 1.2, fontSize: 12, fontWeight: "600", color: "#fff" }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {paginated.map((item, idx) => (
                  <View key={item.id} style={{
                    flexDirection: "row",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: BORDER,
                    backgroundColor: idx % 2 === 0 ? "#fff" : "#F8FAFC",
                  }}>
                    <Text style={{ flex: 0.4, fontSize: 12, color: "#555", fontWeight: "600" }}>{item.id}</Text>
                    <View style={{ flex: 1.2 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#1a2332" }}>{item.sellerName}</Text>
                      <Text style={{ fontSize: 11, color: "#888" }}>{item.email}</Text>
                    </View>
                    <View style={{ flex: 0.7 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#1a2332" }}>{item.account}</Text>
                      <Text style={{ fontSize: 11, color: "#888" }}>{item.ifsc}</Text>
                    </View>
                    <View style={{ flex: 0.6 }}>
                      <StatusBadge status={item.status} small />
                    </View>
                    <View style={{ flex: 0.6 }}>
                      <AttemptsRow attempts={item.attempts} status={item.status} />
                    </View>
                    <Text style={{ flex: 0.8, fontSize: 11, color: "#555" }}>{item.created}</Text>
                    <Text style={{ flex: 0.8, fontSize: 11, color: "#555" }}>{item.verified}</Text>
                    <View style={{ flex: 1.2, flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => goToDetails(item.sellerId)}
                        style={{
                          backgroundColor: "#EFF6FF",
                          borderWidth: 1,
                          borderColor: "#BFDBFE",
                          borderRadius: 6,
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <Ionicons name="eye-outline" size={12} color={BLUE} />
                        <Text style={{ fontSize: 11, fontWeight: "700", color: BLUE }}>View</Text>
                      </TouchableOpacity>
                      {item.status === "Pending" && (
                        <TouchableOpacity
                          style={{
                            backgroundColor: "#F0FDF4",
                            borderWidth: 1,
                            borderColor: "#BBF7D0",
                            borderRadius: 6,
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                          }}
                        >
                          <Ionicons name="checkmark-outline" size={12} color="#16A34A" />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#16A34A" }}>Verify</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}

                {/* Table Footer */}
                <View style={{
                  flexDirection: "row",
                  padding: 16,
                  marginTop: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: BORDER,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                  backgroundColor: "#fff",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 12, color: "#666" }}>
                    Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length} entries
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <PagBtn iconName="chevron-back" onPress={() => setPage(safePage - 1)} disabled={safePage === 1} />
                    {pageNums.map((p, i) => (
                      typeof p === "number" ? (
                        <TouchableOpacity
                          key={i}
                          onPress={() => setPage(p)}
                          style={{
                            width: 32, height: 32, borderRadius: 6,
                            backgroundColor: p === safePage ? "#1d324e" : "#fff",
                            borderWidth: 1, borderColor: BORDER,
                            alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: p === safePage ? "#fff" : "#374151" }}>{p}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text key={i} style={{ fontSize: 12, color: "#94A3B8", paddingHorizontal: 4 }}>{p}</Text>
                      )
                    ))}
                    <PagBtn iconName="chevron-forward" onPress={() => setPage(safePage + 1)} disabled={safePage === totalPages} />
                  </View>
                </View>
              </View>
            </View>

            {/* ── Footer ── */}
            <View style={{
              marginTop: 16, paddingVertical: 16,
              borderTopWidth: 1, borderTopColor: BORDER,
              backgroundColor: "#fff", borderRadius: 8,
              alignItems: "center",
            }}>
              <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>
                2026 © Flintnthread India Pvt. Ltd.{"\n"}Crafted by{" "}
                <Text style={{ color: "#16A34A", fontWeight: "700" }}>Flinththread India Pvt. Ltd.</Text>
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
});