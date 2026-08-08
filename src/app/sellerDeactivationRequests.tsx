import AdminLayout from "@/components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import { sweetConfirm, sweetError, sweetSuccess } from "@/lib/sweetAlert";
import {
  approveSellerActivation,
  approveSellerDeactivation,
  fetchSellerLifecycleRequestDetails,
  fetchSellerLifecycleRequests,
  rejectSellerActivation,
  rejectSellerDeactivation,
  type LifecycleRequestRow,
} from "@/services/sellerLifecycleApi";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const NAVY = "#1D324E";
const BORDER = "#E2E8F0";
const MUTED = "#64748B";

type TabKey = "deactivation" | "activation";

export default function SellerDeactivationRequestsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [tab, setTab] = useState<TabKey>("deactivation");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LifecycleRequestRow[]>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSellerLifecycleRequests(tab);
      setRows(Array.isArray(res.items) ? res.items : []);
    } catch (e) {
      await sweetError("Load Failed", getApiErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetails = async (sellerId: number) => {
    try {
      const data = await fetchSellerLifecycleRequestDetails(sellerId);
      setDetail(data);
      setDetailOpen(true);
    } catch (e) {
      await sweetError("Details Failed", getApiErrorMessage(e));
    }
  };

  const eligibility = (detail?.eligibility && typeof detail.eligibility === "object"
    ? detail.eligibility
    : {}) as Record<string, unknown>;

  const approve = async () => {
    if (!detail?.sellerId) return;
    const id = Number(detail.sellerId);
    const isDeact = tab === "deactivation";
    const ok = await sweetConfirm({
      title: isDeact ? "Approve Deactivation" : "Approve Activation",
      text: isDeact
        ? "Seller will become deactivated for the requested duration."
        : "Seller will become active again. Products stay Out of Stock until seller updates inventory.",
      confirmText: "Approve",
      cancelText: "Cancel",
    });
    if (!ok) return;
    setActing(true);
    try {
      if (isDeact) await approveSellerDeactivation(id);
      else await approveSellerActivation(id);
      await sweetSuccess("Approved", "Request processed successfully.");
      setDetailOpen(false);
      await load();
    } catch (e) {
      await sweetError("Approve Failed", getApiErrorMessage(e));
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (!detail?.sellerId) return;
    const id = Number(detail.sellerId);
    const isDeact = tab === "deactivation";
    const ok = await sweetConfirm({
      title: isDeact ? "Reject Deactivation" : "Reject Activation",
      text: "Are you sure you want to reject this request?",
      confirmText: "Reject",
      cancelText: "Cancel",
    });
    if (!ok) return;
    setActing(true);
    try {
      if (isDeact) await rejectSellerDeactivation(id);
      else await rejectSellerActivation(id);
      await sweetSuccess("Rejected", "Request rejected.");
      setDetailOpen(false);
      await load();
    } catch (e) {
      await sweetError("Reject Failed", getApiErrorMessage(e));
    } finally {
      setActing(false);
    }
  };

  return (
    <AdminLayout>
      <ScrollView style={styles.page} contentContainerStyle={{ padding: isMobile ? 12 : 20 }}>
        <Text style={styles.title}>Seller Deactivation & Activation Requests</Text>
        <View style={styles.tabs}>
          {(["deactivation", "activation"] as TabKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, tab === key && styles.tabOn]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabTxt, tab === key && styles.tabTxtOn]}>
                {key === "deactivation" ? "Deactivation Requests" : "Activation Requests"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={NAVY} />
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No {tab} requests.</Text>
        ) : (
          <View style={styles.table}>
            <View style={[styles.row, styles.head]}>
              <Text style={[styles.cell, styles.headTxt, { flex: 1.4 }]}>Seller</Text>
              <Text style={[styles.cell, styles.headTxt]}>Duration</Text>
              <Text style={[styles.cell, styles.headTxt, { flex: 1.2 }]}>Requested At</Text>
              <Text style={[styles.cell, styles.headTxt]}>Status</Text>
              <Text style={[styles.cell, styles.headTxt]}>Action</Text>
            </View>
            {rows.map((r) => (
              <View key={r.sellerId} style={styles.row}>
                <Text style={[styles.cell, { flex: 1.4 }]}>{r.businessName || r.email || r.sellerId}</Text>
                <Text style={styles.cell}>{r.duration || "—"}</Text>
                <Text style={[styles.cell, { flex: 1.2 }]}>{r.requestedAt || "—"}</Text>
                <Text style={styles.cell}>{r.requestStatus || r.status || "—"}</Text>
                <TouchableOpacity onPress={() => void openDetails(r.sellerId)}>
                  <Text style={styles.link}>View Details</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={detailOpen} transparent animationType="fade" onRequestClose={() => setDetailOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {tab === "deactivation" ? "Seller Deactivation Request" : "Seller Activation Request"}
            </Text>
            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.meta}>Seller: {String(detail?.businessName ?? "—")}</Text>
              <Text style={styles.meta}>Seller ID: {String(detail?.sellerCode ?? detail?.sellerId ?? "—")}</Text>
              <Text style={styles.meta}>Request Type: {String(detail?.requestType ?? "—")}</Text>
              <Text style={styles.meta}>Duration: {String(detail?.duration ?? "—")}</Text>
              <Text style={styles.meta}>Requested At: {String(detail?.requestedAt ?? "—")}</Text>
              <Text style={[styles.meta, { marginTop: 10, fontWeight: "800" }]}>Eligibility Check</Text>
              <Text style={styles.meta}>Pending Orders: {String(eligibility.pendingOrdersCount ?? 0)}</Text>
              <Text style={styles.meta}>Active Shipments: {String(eligibility.activeShipmentsCount ?? 0)}</Text>
              <Text style={styles.meta}>Products In Stock: {String(eligibility.productsInStockCount ?? 0)}</Text>
              <Text style={styles.meta}>
                Eligible: {eligibility.eligible === true ? "✓ Yes" : "✗ No"}
              </Text>
              {eligibility.message ? <Text style={styles.meta}>{String(eligibility.message)}</Text> : null}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.approve} disabled={acting} onPress={() => void approve()}>
                {acting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>
                  {tab === "deactivation" ? "Approve Deactivation" : "Approve Activation"}
                </Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.reject} disabled={acting} onPress={() => void reject()}>
                <Text style={styles.btnTxt}>
                  {tab === "deactivation" ? "Reject Request" : "Reject Activation"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.close} onPress={() => setDetailOpen(false)}>
                <Text style={{ color: NAVY, fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  title: { fontSize: 22, fontWeight: "800", color: NAVY, marginBottom: 14 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tab: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  tabOn: { backgroundColor: NAVY, borderColor: NAVY },
  tabTxt: { color: MUTED, fontWeight: "700", fontSize: 13 },
  tabTxtOn: { color: "#fff" },
  empty: { color: MUTED, marginTop: 24 },
  table: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 8,
  },
  head: { backgroundColor: "#F1F5F9" },
  cell: { flex: 1, color: "#0F172A", fontSize: 12 },
  headTxt: { fontWeight: "800", color: MUTED },
  link: { color: "#2563EB", fontWeight: "700", fontSize: 12 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: NAVY, marginBottom: 10 },
  meta: { color: "#334155", marginBottom: 4, fontSize: 13 },
  modalActions: { marginTop: 14, gap: 8 },
  approve: {
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  reject: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  close: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnTxt: { color: "#fff", fontWeight: "700" },
});
