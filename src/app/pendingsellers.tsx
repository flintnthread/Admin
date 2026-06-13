import AdminLayout from "@/components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime, initialsFromName } from "@/lib/format";
import {
  approveSellerProfile,
  fetchPendingProfileSellers,
  rejectSellerProfile,
  type PendingProfileSeller,
} from "@/services/sellerApi";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";


const ORANGE = "#ef7b1a";
const NAVY = "#1d324e";
const MUTED = "#69798c";
const BORDER = "#e5e7eb";

export default function PendingSellersScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const [sellers, setSellers] = useState<PendingProfileSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingProfileSeller | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPendingProfileSellers();
      setSellers(rows);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load pending sellers."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.mobile?.includes(q)
    );
  }, [sellers, search]);

  const handleApprove = (seller: PendingProfileSeller) => {
    const run = async () => {
      setActionId(seller.sellerId);
      try {
        await approveSellerProfile(seller.sellerId);
        await load();
        if (Platform.OS === "web") window.alert("Seller profile approved.");
        else Alert.alert("Success", "Seller profile approved.");
      } catch (e) {
        const msg = getApiErrorMessage(e);
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Error", msg);
      } finally {
        setActionId(null);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Approve profile for ${seller.fullName}?`)) void run();
    } else {
      Alert.alert("Approve seller", `Approve profile for ${seller.fullName}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Approve", onPress: () => void run() },
      ]);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim() || "Profile rejected by admin.";
    setActionId(rejectTarget.sellerId);
    try {
      await rejectSellerProfile(rejectTarget.sellerId, reason);
      setRejectTarget(null);
      setRejectReason("");
      await load();
    } catch (e) {
      const msg = getApiErrorMessage(e);
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminLayout>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Pending seller profiles</Text>
            <Text style={styles.subtitle}>
              Sellers who completed KYC and are waiting for admin approval
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => void load()}>
            <Feather name="refresh-cw" size={16} color={ORANGE} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Feather name="search" size={18} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, email, phone…"
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ORANGE} />
            <Text style={styles.muted}>Loading pending sellers…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => void load()}>
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="check-circle" size={40} color="#22c55e" />
            <Text style={styles.emptyTitle}>No pending profiles</Text>
            <Text style={styles.muted}>All submitted seller profiles have been reviewed.</Text>
          </View>
        ) : isWide ? (
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 2 }]}>Seller</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Mobile</Text>
              <Text style={[styles.th, { flex: 1 }]}>Status</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Submitted</Text>
              <Text style={[styles.th, { flex: 1 }]}>Actions</Text>
            </View>
            {filtered.map((s) => (
              <View key={s.sellerId} style={styles.tableRow}>
                <View style={{ flex: 2, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initialsFromName(s.fullName)}</Text>
                  </View>
                  <View>
                    <Text style={styles.name}>{s.fullName}</Text>
                    <Text style={styles.email}>{s.email}</Text>
                  </View>
                </View>
                <Text style={[styles.td, { flex: 1.2 }]}>{s.mobile ?? "—"}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{s.status}</Text>
                <Text style={[styles.td, { flex: 1.2 }]}>{formatDateTime(s.profileUpdatedAt)}</Text>
                <View style={[styles.actions, { flex: 1 }]}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    disabled={actionId === s.sellerId}
                    onPress={() => handleApprove(s)}
                  >
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    disabled={actionId === s.sellerId}
                    onPress={() => {
                      setRejectTarget(s);
                      setRejectReason("");
                    }}
                  >
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          filtered.map((s) => (
            <View key={s.sellerId} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsFromName(s.fullName)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{s.fullName}</Text>
                  <Text style={styles.email}>{s.email}</Text>
                  <Text style={styles.muted}>{s.mobile ?? "—"}</Text>
                </View>
              </View>
              <Text style={styles.muted}>Submitted: {formatDateTime(s.profileUpdatedAt)}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.approveBtn, { flex: 1 }]}
                  disabled={actionId === s.sellerId}
                  onPress={() => handleApprove(s)}
                >
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectBtn, { flex: 1 }]}
                  disabled={actionId === s.sellerId}
                  onPress={() => {
                    setRejectTarget(s);
                    setRejectReason("");
                  }}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={rejectTarget != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject profile</Text>
            <Text style={styles.muted}>{rejectTarget?.fullName}</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for rejection"
              placeholderTextColor={MUTED}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => setRejectTarget(null)}>
                <Text style={styles.rejectText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => void submitReject()}>
                <Text style={styles.primaryBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8fafc" },
  pageContent: { padding: 16, paddingBottom: 32, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: NAVY },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 4, maxWidth: 520 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
  },
  refreshText: { color: ORANGE, fontWeight: "600", fontSize: 13 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: NAVY },
  center: { alignItems: "center", paddingVertical: 48, gap: 12 },
  muted: { color: MUTED, fontSize: 13 },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  emptyCard: {
    alignItems: "center",
    gap: 8,
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: NAVY },
  table: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  tableHead: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 12, gap: 8 },
  th: { fontSize: 11, fontWeight: "700", color: MUTED, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  td: { fontSize: 13, color: NAVY },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 10,
  },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: ORANGE, fontWeight: "800", fontSize: 14 },
  name: { fontSize: 15, fontWeight: "700", color: NAVY },
  email: { fontSize: 12, color: MUTED },
  actions: { flexDirection: "row", gap: 8 },
  approveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  approveText: { color: "#15803d", fontWeight: "700", fontSize: 12 },
  rejectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  rejectText: { color: "#b91c1c", fontWeight: "700", fontSize: 12 },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: ORANGE,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    gap: 12,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: NAVY },
  reasonInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 12,
    minHeight: 88,
    textAlignVertical: "top",
    fontSize: 14,
    color: NAVY,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
});
