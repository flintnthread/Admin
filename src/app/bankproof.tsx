import { getApiErrorMessage } from "@/lib/api/client";
import { fetchSellerBankDetails } from "@/services/sellerApi";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import AdminLayout from "@/components/admin-layout";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

// ─── Breakpoints ───────────────────────────────────────────────────────────────
const BP = { mobile: 480, tablet: 768, laptop: 1024, desktop: 1280 };

type Breakpoint = "mobile" | "tablet" | "laptop" | "desktop";

function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width < BP.mobile) return "mobile";
  if (width < BP.tablet) return "tablet";
  if (width < BP.laptop) return "laptop";
  return "desktop";
}

function ProofImage({ uri, label }: { uri?: string; label: string }) {
  const [imageError, setImageError] = useState(false);
  if (!uri) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="image-off-outline" size={48} color={GRAY} />
        <Text style={styles.errorText}>No {label} uploaded</Text>
      </View>
    );
  }
  if (imageError) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="image-off-outline" size={48} color={GRAY} />
        <Text style={styles.errorText}>Failed to load {label}</Text>
      </View>
    );
  }
  return (
    <View style={styles.imageContainer}>
      <Image
        source={{ uri }}
        style={styles.bankProofImage}
        resizeMode="contain"
        onError={() => setImageError(true)}
      />
    </View>
  );
}

// ─── Header Banner ─────────────────────────────────────────────────────────────
function Header({ bp }: { bp: Breakpoint }) {
  const isMobile = bp === "mobile";
  return (
    <View style={styles.headerBanner}>
      <View style={styles.headerCircle1} />
      <View style={styles.headerCircle2} />
      <View style={styles.headerCircle3} />
      <View style={styles.headerIconBox}>
        <Icon name="file-document-outline" size={isMobile ? 22 : 26} color={ORANGE} />
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function BankProof() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  const sellerId = Number(params.sellerId);
  const [sellerName, setSellerName] = useState("—");
  const [bankProofUrl, setBankProofUrl] = useState<string | undefined>();
  const [cancelledChequeUrl, setCancelledChequeUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId || Number.isNaN(sellerId)) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchSellerBankDetails(sellerId);
        setSellerName(String(detail.fullName ?? "Seller"));
        setBankProofUrl(detail.bankProofUrl as string | undefined);
        setCancelledChequeUrl(detail.cancelledChequeUrl as string | undefined);
      } catch (e) {
        setError(getApiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [sellerId]);

  const contentMaxWidth =
    bp === "desktop"
      ? 1200
      : bp === "laptop"
        ? 960
        : bp === "tablet"
          ? 700
          : "100%";

  return (
    <AdminLayout>
      <View style={styles.root}>
      {/* <StatusBar barStyle="light-content" backgroundColor="#C05E1A" /> */}
      <StatusBar barStyle="light-content" backgroundColor="#1d324e" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && { alignItems: "center" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.outerContainer,
            { width: "100%" },
          ]}
        >
          {/* Top card: header banner + title section */}
          <View style={styles.topCard}>
            <Header bp={bp} />
            <View style={styles.titleSection}>
              <View style={styles.titleLeft}>
                <Text style={styles.pageTitle}>Bank Proof</Text>
                <Text style={styles.userName}>{sellerName}</Text>
              </View>

              <TouchableOpacity
                style={styles.backBtn}
                activeOpacity={0.8}
                onPress={() => router.back()}
              >
                <Icon
                  name="arrow-left-circle"
                  size={16}
                  color={ORANGE}
                  style={styles.btnIcon}
                />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.card}>
              <ActivityIndicator size="large" color={ORANGE} />
              <Text style={{ textAlign: "center", marginTop: 12, color: GRAY }}>Loading bank documents…</Text>
            </View>
          ) : null}

          {!loading && error ? (
            <View style={styles.card}>
              <Text style={{ color: "#DC2626" }}>{error}</Text>
            </View>
          ) : null}

          {!loading && !error ? (
            <>
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Icon name="image-outline" size={18} color={ORANGE} style={{ marginRight: 8 }} />
                  <Text style={styles.cardTitle}>Bank Proof Document</Text>
                </View>
                <ProofImage uri={bankProofUrl} label="bank proof" />
                <View style={styles.imageInfo}>
                  <Text style={styles.infoLabel}>Seller:</Text>
                  <Text style={styles.infoValue}>{sellerName}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Icon name="file-document-outline" size={18} color={ORANGE} style={{ marginRight: 8 }} />
                  <Text style={styles.cardTitle}>Cancelled Cheque</Text>
                </View>
                <ProofImage uri={cancelledChequeUrl} label="cancelled cheque" />
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
      </View>
    </AdminLayout>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const ORANGE = "#C05E1A";
const ORANGE_LIGHT = "#E8892F";
const HEADER_BG = "#1d324e";
const DARK = "#2C3E50";
const GRAY = "#8492A6";
const BG = "#F4F6F9";

const shadow: any = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 4 },
  default: { boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
});

const shadowSm: any = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 3 },
  default: { boxShadow: "0 3px 12px rgba(0,0,0,0.07)" },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  outerContainer: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 16,
  },

  // ── Top card ────────────────────────────────────
  topCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    ...shadow,
  },

  // ── Header banner ───────────────────────────────
  headerBanner: {
    backgroundColor: HEADER_BG,
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 4 },
      default: { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" },
    }),
  },

  // ── Title section ────────────────────────────────
  titleSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    flexWrap: "wrap",
    gap: 16,
  },
  titleLeft: {
    flex: 1,
    minWidth: 200,
    gap: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: DARK,
    letterSpacing: -0.3,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: DARK,
    marginTop: 6,
  },

  // ── Action buttons ───────────────────────────────
  btnIcon: {
    marginRight: 6,
  },
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
  backBtnText: {
    color: ORANGE,
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Card ─────────────────────────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    ...shadowSm,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: DARK,
    letterSpacing: -0.2,
  },

  // ── Image container ──────────────────────────────
  imageContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  bankProofImage: {
    width: "100%",
    height: 400,
    backgroundColor: "#F8FAFC",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    color: DARK,
  },
  errorSubtext: {
    fontSize: 13,
    color: GRAY,
  },

  // ── Image info ───────────────────────────────────
  imageInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: GRAY,
    fontWeight: "400",
  },
  infoValue: {
    flex: 1.5,
    fontSize: 14,
    color: DARK,
    fontWeight: "500",
  },
} as any);
