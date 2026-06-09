import AdminLayout from "@/components/admin-layout";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import {
  approveCategoryRequest,
  fetchCategoryRequests,
  rejectCategoryRequest,
  type CategoryRequestRow,
} from "@/services/categoryRequestApi";

const ORANGE = "#ef7b1a";
const NAVY = "#1d324e";
const MUTED = "#69798c";
const BORDER = "#e5e7eb";

export default function CategoryRequestsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const [rows, setRows] = useState<CategoryRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CategoryRequestRow | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = filter === "all" ? undefined : filter;
      const page = await fetchCategoryRequests(status, 0, 100);
      setRows(page.items);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (row: CategoryRequestRow) => {
    setActionId(row.id);
    try {
      await approveCategoryRequest(row.id);
      await load();
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e));
    } finally {
      setActionId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setActionId(rejectTarget.id);
    try {
      await rejectCategoryRequest(rejectTarget.id, note.trim() || "Rejected.");
      setRejectTarget(null);
      setNote("");
      await load();
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e));
    } finally {
      setActionId(null);
    }
  };

  const filters: { key: typeof filter; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <AdminLayout>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <Text style={styles.title}>Category requests</Text>
        <Text style={styles.subtitle}>Seller requests for new product categories</Text>

        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={ORANGE} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.muted}>No category requests found.</Text>
        ) : (
          rows.map((row) => {
            const pending = row.status === "pending";
            return (
              <View key={row.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.catName}>{row.categoryName}</Text>
                  <View style={[styles.badge, pending ? styles.badgePending : styles.badgeDone]}>
                    <Text style={styles.badgeText}>{row.status}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>Seller: {row.sellerName ?? `#${row.sellerId}`}</Text>
                {row.description ? <Text style={styles.body}>{row.description}</Text> : null}
                {row.reason ? <Text style={styles.muted}>Reason: {row.reason}</Text> : null}
                <Text style={styles.muted}>Requested: {formatDateTime(row.createdAt)}</Text>
                {pending ? (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      disabled={actionId === row.id}
                      onPress={() => void handleApprove(row)}
                    >
                      <Feather name="check" size={14} color="#15803d" />
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      disabled={actionId === row.id}
                      onPress={() => {
                        setRejectTarget(row);
                        setNote("");
                      }}
                    >
                      <Feather name="x" size={14} color="#b91c1c" />
                      <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={rejectTarget != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, !isWide && { margin: 16 }]}>
            <Text style={styles.modalTitle}>Reject category request</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Admin note / reason"
              value={note}
              onChangeText={setNote}
              multiline
            />
            <View style={styles.actions}>
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
  pageContent: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "800", color: NAVY },
  subtitle: { fontSize: 13, color: MUTED },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
  },
  filterChipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  filterText: { fontSize: 13, fontWeight: "600", color: MUTED },
  filterTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catName: { fontSize: 16, fontWeight: "700", color: NAVY, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgePending: { backgroundColor: "#fff7ed" },
  badgeDone: { backgroundColor: "#f1f5f9" },
  badgeText: { fontSize: 11, fontWeight: "700", color: NAVY, textTransform: "capitalize" },
  meta: { fontSize: 13, color: MUTED },
  body: { fontSize: 14, color: NAVY, lineHeight: 20 },
  muted: { fontSize: 12, color: MUTED },
  error: { color: "#dc2626", marginTop: 20 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#dcfce7",
  },
  approveText: { color: "#15803d", fontWeight: "700", fontSize: 12 },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  rejectText: { color: "#b91c1c", fontWeight: "700", fontSize: 12 },
  primaryBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: ORANGE },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 12, padding: 20, gap: 12, maxWidth: 420, alignSelf: "center", width: "100%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: NAVY },
  noteInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },
});
