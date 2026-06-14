import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/admin-layout";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate, maskAccount } from "@/lib/format";
import { approveSellerBank, fetchSellerBankDetails, rejectSellerBank } from "@/services/sellerApi";

const BP = { mobile: 480, tablet: 768, laptop: 1024, desktop: 1280 };

type Breakpoint = "mobile" | "tablet" | "laptop" | "desktop";

function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width < BP.mobile) return "mobile";
  if (width < BP.tablet) return "tablet";
  if (width < BP.laptop) return "laptop";
  return "desktop";
}

type BankDetail = {
  fullName?: string;
  email?: string;
  bankName?: string;
  branchName?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankVerified?: boolean;
  adminRemarks?: string;
  createdAt?: string;
  updatedAt?: string;
};

function bankStatusLabel(data: BankDetail | null): string {
  if (!data) return "—";
  if (data.bankVerified) return "Approved";
  if (data.bankName || data.accountNumber) return "Pending verification";
  return "Not requested";
}

function Header({ bp }: { bp: Breakpoint }) {
  const isMobile = bp === "mobile";
  return (
    <View style={styles.headerBanner}>
      <View style={styles.headerCircle1} />
      <View style={styles.headerCircle2} />
      <View style={styles.headerCircle3} />
      <View style={styles.headerIconBox}>
        <Icon name="history" size={isMobile ? 22 : 26} color={ORANGE} />
      </View>
    </View>
  );
}

function TitleSection({
  bp,
  data,
  loading,
  acting,
  onBack,
  onProof,
  onApprove,
  onReject,
}: {
  bp: Breakpoint;
  data: BankDetail | null;
  loading: boolean;
  acting: boolean;
  onBack: () => void;
  onProof: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isMobile = bp === "mobile" || bp === "tablet";
  const statusLabel = bankStatusLabel(data);

  return (
    <View style={[styles.titleSection, isMobile && styles.titleSectionMobile]}>
      <View style={styles.titleLeft}>
        <Text style={styles.pageTitle}>Bank Approval History</Text>
        {loading ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 12 }} />
        ) : (
          <>
            <Text style={styles.userName}>{data?.fullName ?? "—"}</Text>
            <Text style={styles.userEmail}>{data?.email ?? "—"}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </>
        )}
      </View>

      <View style={[styles.actionButtons, isMobile && styles.actionButtonsMobile]}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={onBack}>
          <Icon name="arrow-left-circle" size={16} color={ORANGE} style={styles.btnIcon} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.proofBtn} activeOpacity={0.8} onPress={onProof} disabled={!data}>
          <Icon name="file-document-outline" size={16} color="#fff" style={styles.btnIcon} />
          <Text style={styles.proofBtnText}>Bank Proof</Text>
        </TouchableOpacity>

        {!data?.bankVerified && data && (
          <>
            <TouchableOpacity style={styles.approveBtn} activeOpacity={0.8} onPress={onApprove} disabled={acting}>
              <Text style={styles.approveBtnText}>{acting ? "..." : "Approve"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} activeOpacity={0.8} onPress={onReject} disabled={acting}>
              <Text style={styles.rejectBtnText}>{acting ? "..." : "Reject"}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function BankDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailColon}>:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function CurrentBankDetails({ data }: { data: BankDetail | null }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Icon name="bank-outline" size={18} color={ORANGE} style={{ marginRight: 8 }} />
        <Text style={styles.cardTitle}>Current Bank Details</Text>
      </View>

      <View style={styles.detailRows}>
        <BankDetailRow label="Bank" value={data?.bankName ?? "—"} />
        <BankDetailRow label="Branch" value={data?.branchName ?? "—"} />
        <BankDetailRow label="Account holder" value={data?.accountHolder ?? "—"} />
        <BankDetailRow label="Account" value={maskAccount(data?.accountNumber)} />
        <BankDetailRow label="IFSC" value={data?.ifscCode ?? "—"} />
      </View>

      <View style={styles.divider} />

      <BankDetailRow label="Admin Note" value={data?.adminRemarks ?? "—"} />
      <View style={{ height: 8 }} />
      <BankDetailRow label="Last Updated" value={formatDate(data?.updatedAt)} />
    </View>
  );
}

function HistoryTimeline({
  compact,
  data,
}: {
  compact?: boolean;
  data: BankDetail | null;
}) {
  const events: { label: string; value: string }[] = [];
  if (data?.createdAt) events.push({ label: "Seller registered", value: formatDate(data.createdAt) });
  if (data?.bankName) events.push({ label: "Bank details submitted", value: formatDate(data.updatedAt ?? data.createdAt) });
  if (data?.bankVerified && data.updatedAt) events.push({ label: "Bank approved", value: formatDate(data.updatedAt) });
  else if (data?.adminRemarks && data.adminRemarks !== "—") {
    events.push({ label: "Admin note", value: data.adminRemarks });
  }

  return (
    <View style={[styles.card, compact && styles.historyCardCompact]}>
      <View style={styles.cardTitleRow}>
        <Icon name="history" size={18} color={ORANGE} style={{ marginRight: 8 }} />
        <Text style={styles.cardTitle}>History / Timeline</Text>
      </View>

      {events.length > 0 ? (
        <View style={styles.detailRows}>
          {events.map((event) => (
            <BankDetailRow key={event.label} label={event.label} value={event.value} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyHistory}>
          <View style={styles.emptyIconCircle}>
            <Icon name="calendar-remove-outline" size={compact ? 24 : 30} color={GRAY} />
          </View>
          <Text style={styles.emptyTitle}>No history found.</Text>
          {!compact && (
            <Text style={styles.emptySubtitle}>There is no history or timeline available.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function BankApprovalHistory() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sellerId?: string }>();
  const sellerId = Number(params.sellerId);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktopWide = bp === "laptop" || bp === "desktop";

  const [data, setData] = useState<BankDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!sellerId || Number.isNaN(sellerId)) {
      setError("Invalid seller.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchSellerBankDetails(sellerId);
      setData(detail as BankDetail);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleApprove = async () => {
    if (!sellerId) return;
    setActing(true);
    try {
      await approveSellerBank(sellerId);
      await loadDetails();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!sellerId) return;
    setActing(true);
    try {
      await rejectSellerBank(sellerId, "Rejected by admin");
      await loadDetails();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setActing(false);
    }
  };

  const contentMaxWidth =
    bp === "desktop" ? 1200 : bp === "laptop" ? 960 : bp === "tablet" ? 700 : "100%";

  return (
    <AdminLayout>
      <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#C05E1A" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, !isMobile && { alignItems: "center" }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.outerContainer, { maxWidth: contentMaxWidth, width: "100%" }]}>
          <View style={styles.topCard}>
            <Header bp={bp} />
            <TitleSection
              bp={bp}
              data={data}
              loading={loading}
              acting={acting}
              onBack={() => router.push("/sellerbankapproval")}
              onProof={() => router.push({ pathname: "/bankproof", params: { sellerId: String(sellerId) } })}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </View>

          {error ? (
            <View style={styles.card}>
              <Text style={{ color: "#DC2626" }}>{error}</Text>
              <TouchableOpacity style={styles.proofBtn} onPress={loadDetails}>
                <Text style={styles.proofBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={[styles.bodySection, isDesktopWide && styles.bodySectionRow]}>
            {isDesktopWide ? (
              <>
                <View style={styles.leftCol}>
                  <CurrentBankDetails data={data} />
                </View>
                <View style={styles.rightCol}>
                  <HistoryTimeline compact={false} data={data} />
                </View>
              </>
            ) : (
              <>
                <CurrentBankDetails data={data} />
                <HistoryTimeline compact={isMobile} data={data} />
              </>
            )}
          </View>
        </View>
      </ScrollView>
      </View>
    </AdminLayout>
  );
}

const ORANGE = "#C05E1A";
const ORANGE_LIGHT = "#E8892F";
const DARK = "#2C3E50";
const GRAY = "#8492A6";
const BG = "#F4F6F9";

const shadow: any = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 4 },
  default: { boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
});

const shadowSm: any = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 3 },
  default: { boxShadow: "0 3px 12px rgba(0,0,0,0.07)" },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  outerContainer: { alignSelf: "center", paddingHorizontal: 12, paddingTop: 12, gap: 16 },
  topCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", ...shadow },
  headerBanner: {
    backgroundColor: ORANGE,
    height: 100,
    justifyContent: "flex-end",
    paddingBottom: 12,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  headerCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
    right: 80,
    top: -30,
  },
  headerCircle2: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: -10,
    top: 10,
  },
  headerCircle3: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.05)",
    right: 200,
    top: 30,
  },
  headerIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  titleSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    flexWrap: "wrap",
    gap: 16,
  },
  titleSectionMobile: { flexDirection: "column" },
  titleLeft: { flex: 1, minWidth: 200, gap: 4 },
  pageTitle: { fontSize: 22, fontWeight: "700", color: DARK, letterSpacing: -0.3 },
  userName: { fontSize: 15, fontWeight: "600", color: DARK, marginTop: 6 },
  userEmail: { fontSize: 13, color: GRAY, marginTop: 2 },
  statusBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#4A5568",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "500" },
  actionButtons: { flexDirection: "row", gap: 10, alignItems: "center", flexShrink: 0, flexWrap: "wrap" },
  actionButtonsMobile: { width: "100%" },
  btnIcon: { marginRight: 6 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: ORANGE_LIGHT,
    backgroundColor: "#FFF5EB",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 90,
  },
  backBtnText: { color: ORANGE, fontSize: 14, fontWeight: "600" },
  proofBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A5568",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 110,
  },
  proofBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  approveBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  approveBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  rejectBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rejectBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  bodySection: { gap: 16 },
  bodySectionRow: { flexDirection: "row", alignItems: "flex-start" },
  leftCol: { flex: 1 },
  rightCol: { flex: 1 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, ...shadowSm },
  historyCardCompact: { minHeight: 140 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: DARK, letterSpacing: -0.2 },
  detailRows: { gap: 2, marginBottom: 16 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8 },
  detailLabel: { flex: 1, fontSize: 14, color: GRAY, fontWeight: "400", minWidth: 110 },
  detailColon: { fontSize: 14, color: GRAY, marginHorizontal: 8, width: 10 },
  detailValue: { flex: 1.5, fontSize: 14, color: DARK, fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#EDF2F7", marginVertical: 12 },
  emptyHistory: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24, gap: 10 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: DARK },
  emptySubtitle: { fontSize: 13, color: GRAY, textAlign: "center", paddingHorizontal: 16 },
} as any);
