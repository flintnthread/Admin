import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

// Bootstrap Icons via @expo/vector-icons
// For Expo: npx expo install @expo/vector-icons
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

// ─── Data ──────────────────────────────────────────────────────────────────────
const BANK_DATA = {
  name: "Sanju Sandhya",
  email: "flintandthread.hr@gmail.com",
  status: "Not requested",
  bank: "Canara Bank",
  branch: "DARSI",
  accountHolder: "MANAM RAMYA",
  account: "XXXX1022",
  ifsc: "CNRB0013641",
  adminNote: "-",
  sellerNote: "-",
};

// ─── Header Banner ─────────────────────────────────────────────────────────────
function Header({ bp }: { bp: Breakpoint }) {
  const isMobile = bp === "mobile";
  return (
    <View style={styles.headerBanner}>
      <View style={styles.headerCircle1} />
      <View style={styles.headerCircle2} />
      <View style={styles.headerCircle3} />
      {/* Bootstrap icon: bi-clock-history → history */}
      <View style={styles.headerIconBox}>
        <Icon name="history" size={isMobile ? 22 : 26} color={ORANGE} />
      </View>
    </View>
  );
}

// ─── Title + Action Buttons ────────────────────────────────────────────────────
function TitleSection({ bp }: { bp: Breakpoint }) {
  const isMobile = bp === "mobile" || bp === "tablet";
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.titleSection, isMobile && styles.titleSectionMobile]}>
      <View style={styles.titleLeft}>
        <Text style={styles.pageTitle}>Bank Approval History</Text>
        <Text style={styles.userName}>{BANK_DATA.name}</Text>
        <Text style={styles.userEmail}>{BANK_DATA.email}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{BANK_DATA.status}</Text>
        </View>
      </View>

      <View
        style={[styles.actionButtons, isMobile && styles.actionButtonsMobile]}
      >
        {/* Bootstrap icon: bi-arrow-left-circle → arrow-left-circle */}
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("sellerbankapproval")}
        >
          <Icon
            name="arrow-left-circle"
            size={16}
            color={ORANGE}
            style={styles.btnIcon}
          />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        {/* Bootstrap icon: bi-file-earmark-text → file-document-outline */}
        <TouchableOpacity style={styles.proofBtn} activeOpacity={0.8}>
          <Icon
            name="file-document-outline"
            size={16}
            color="#fff"
            style={styles.btnIcon}
          />
          <Text style={styles.proofBtnText}>Bank Proof</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Bank Detail Row ───────────────────────────────────────────────────────────
function BankDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailColon}>:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Current Bank Details Card ─────────────────────────────────────────────────
function CurrentBankDetails() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        {/* Bootstrap icon: bi-bank → bank-outline */}
        <Icon
          name="bank-outline"
          size={18}
          color={ORANGE}
          style={{ marginRight: 8 }}
        />
        <Text style={styles.cardTitle}>Current Bank Details</Text>
      </View>

      <View style={styles.detailRows}>
        <BankDetailRow label="Bank" value={BANK_DATA.bank} />
        <BankDetailRow label="Branch" value={BANK_DATA.branch} />
        <BankDetailRow label="Account holder" value={BANK_DATA.accountHolder} />
        <BankDetailRow label="Account" value={BANK_DATA.account} />
        <BankDetailRow label="IFSC" value={BANK_DATA.ifsc} />
      </View>

      <View style={styles.divider} />

      <BankDetailRow label="Admin Note" value={BANK_DATA.adminNote} />
      <View style={{ height: 8 }} />
      <BankDetailRow label="Seller Note" value={BANK_DATA.sellerNote} />
    </View>
  );
}

// ─── History / Timeline Card ───────────────────────────────────────────────────
function HistoryTimeline({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.card, compact && styles.historyCardCompact]}>
      <View style={styles.cardTitleRow}>
        {/* Bootstrap icon: bi-clock-history → history */}
        <Icon
          name="history"
          size={18}
          color={ORANGE}
          style={{ marginRight: 8 }}
        />
        <Text style={styles.cardTitle}>History / Timeline</Text>
      </View>

      <View style={styles.emptyHistory}>
        <View style={styles.emptyIconCircle}>
          {/* Bootstrap icon: bi-calendar-x → calendar-remove-outline */}
          <Icon
            name="calendar-remove-outline"
            size={compact ? 24 : 30}
            color={GRAY}
          />
        </View>
        <Text style={styles.emptyTitle}>No history found.</Text>
        {!compact && (
          <Text style={styles.emptySubtitle}>
            There is no history or timeline available.
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function BankApprovalHistory() {
  const { width } = useWindowDimensions();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktopWide = bp === "laptop" || bp === "desktop";

  const contentMaxWidth =
    bp === "desktop"
      ? 1200
      : bp === "laptop"
        ? 960
        : bp === "tablet"
          ? 700
          : "100%";

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#C05E1A" />
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
            { maxWidth: contentMaxWidth, width: "100%" },
          ]}
        >
          {/* Top card: header banner + title section */}
          <View style={styles.topCard}>
            <Header bp={bp} />
            <TitleSection bp={bp} />
          </View>

          {/* Body: side-by-side on desktop, stacked on mobile/tablet */}
          <View
            style={[styles.bodySection, isDesktopWide && styles.bodySectionRow]}
          >
            {isDesktopWide ? (
              <>
                <View style={styles.leftCol}>
                  <CurrentBankDetails />
                </View>
                <View style={styles.rightCol}>
                  <HistoryTimeline compact={false} />
                </View>
              </>
            ) : (
              <>
                <CurrentBankDetails />
                <HistoryTimeline compact={isMobile} />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const ORANGE = "#C05E1A";
const ORANGE_LIGHT = "#E8892F";
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
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    flexWrap: "wrap",
    gap: 16,
  },
  titleSectionMobile: {
    flexDirection: "column",
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
  userEmail: {
    fontSize: 13,
    color: GRAY,
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#4A5568",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },

  // ── Action buttons ───────────────────────────────
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexShrink: 0,
  },
  actionButtonsMobile: {
    width: "100%",
  },
  btnIcon: {
    marginRight: 6,
  },
  backBtn: {
    flex: 1,
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
  proofBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A5568",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 110,
  },
  proofBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Body section ─────────────────────────────────
  bodySection: {
    gap: 16,
  },
  bodySectionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  leftCol: { flex: 1 },
  rightCol: { flex: 1 },

  // ── Card ─────────────────────────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    ...shadowSm,
  },
  historyCardCompact: {
    minHeight: 140,
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

  // ── Detail rows ──────────────────────────────────
  detailRows: {
    gap: 2,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: GRAY,
    fontWeight: "400",
    minWidth: 110,
  },
  detailColon: {
    fontSize: 14,
    color: GRAY,
    marginHorizontal: 8,
    width: 10,
  },
  detailValue: {
    flex: 1.5,
    fontSize: 14,
    color: DARK,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#EDF2F7",
    marginVertical: 12,
  },

  // ── Empty history ─────────────────────────────────
  emptyHistory: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: DARK,
  },
  emptySubtitle: {
    fontSize: 13,
    color: GRAY,
    textAlign: "center",
    paddingHorizontal: 16,
  },
} as any);
