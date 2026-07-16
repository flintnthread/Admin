import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import AdminLayout from '@/components/admin-layout';
import Pagination from '@/components/Pagination';
import { getApiErrorMessage } from '@/lib/api/client';
import { createSeller, fetchSellers } from '@/services/sellerApi';


/**
 * ── INTEGRATION NOTE ─────────────────────────────────────────────
 * This screen no longer renders its own sidebar or search header —
 * it assumes it's rendered *inside* your shared AdminLayout, e.g.:
 *
 *   import AdminLayout from "../layouts/AdminLayout";
 *   <AdminLayout activeRoute="add-sellers">
 *     <AddSellersScreen />
 *   </AdminLayout>
 *
 * Requires: expo install expo-linear-gradient
 * (@expo/vector-icons ships with Expo by default.)
 * ────────────────────────────────────────────────────────────────
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
  emerald: "#059669",
  emeraldBg: "#ECFDF5",
  rose: "#E11D48",
  roseBg: "#FFF1F2",
  amber: "#D97706",
  amberBg: "#FFFBEB",
  orangeBg: "#FFF7ED",
};

type Seller = {
  id: number;
  name: string;
  email: string;
  mobile: string;
  status: "Active" | "Inactive";
};

function mapSellerStatus(raw?: string): Seller["status"] {
  const s = String(raw ?? "").toLowerCase();
  if (s === "active") return "Active";
  return "Inactive";
}

function mapSellerRow(s: {
  id: number;
  fullName?: string;
  email?: string;
  mobile?: string;
  status?: string;
}): Seller {
  return {
    id: s.id,
    name: s.fullName ?? `Seller #${s.id}`,
    email: s.email ?? "",
    mobile: s.mobile ?? "",
    status: mapSellerStatus(s.status),
  };
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function StatusPill({ status }: { status: Seller["status"] }) {
  const active = status === "Active";
  return (
    <View style={[styles.pill, { backgroundColor: active ? COLORS.emeraldBg : COLORS.roseBg }]}>
      <Feather name={active ? "check-circle" : "x-circle"} size={11} color={active ? COLORS.emerald : COLORS.rose} />
      <Text style={[styles.pillText, { color: active ? COLORS.emerald : COLORS.rose }]}>{status}</Text>
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
  value: string;
  label: string;
  tint: string;
  tintBg: string;
  isMobile: boolean;
}) {
  return (
    <View style={[styles.statCard, isMobile ? styles.statCardMobile : styles.statCardDesktop]}>
      {isMobile ? (
        <>
          <View style={[styles.statIconBox, styles.statIconBoxMobile, { backgroundColor: tintBg }]}>
            <Feather name={icon} size={14} color={tint} />
          </View>
          <Text style={[styles.statValue, styles.statValueMobile, { color: tint }]}>{value}</Text>
          <Text style={styles.statLabelMobile} numberOfLines={1}>{label}</Text>
        </>
      ) : (
        <>
          <View style={styles.statCardTopRow}>
            <View style={[styles.statIconBox, { backgroundColor: tintBg }]}>
              <Feather name={icon} size={15} color={tint} />
            </View>
            <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
          </View>
          <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
        </>
      )}
    </View>
  );
}

function Field({
  label,
  required,
  hint,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  error?: string | boolean;
}) {
  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={{ color: COLORS.orange }}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textFaint}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
      />
      {error && typeof error === 'string' ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : error ? (
        <Text style={styles.fieldError}>This field is required</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function SuccessAlert({ visible, name, onClose }: { visible: boolean; name: string; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.85);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }).start();
      const timer = setTimeout(onClose, 2200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.successOverlay} onPress={onClose}>
        <Animated.View style={[styles.successCard, { transform: [{ scale }] }]}>
          <View style={styles.successIconCircle}>
            <Feather name="check" size={26} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Added successfully!</Text>
          <Text style={styles.successMessage}>
            {name ? `${name} has` : "The seller has"} been added to your sellers list.
          </Text>
          <TouchableOpacity style={styles.successDoneBtn} onPress={onClose}>
            <Text style={styles.successDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function AddSellerModal({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: (form: { firstName: string; lastName: string; email: string; mobile: string }) => Promise<void>;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", mobile: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    if (errors[key]) {
      setErrors((e) => {
        const newE = { ...e };
        delete newE[key];
        return newE;
      });
    }
  };
  const resetForm = () => {
    setForm({ firstName: "", lastName: "", email: "", mobile: "" });
    setErrors({});
  };

  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    const nextErrors: Record<string, string> = {};
    
    if (!form.firstName.trim()) nextErrors.firstName = "First name is required";
    if (!form.lastName.trim()) nextErrors.lastName = "Last name is required";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) {
      nextErrors.email = "Email address is required";
    } else if (!emailRegex.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address";
    }

    const mobileRegex = /^[0-9]{10}$/;
    const cleanMobile = form.mobile.replace(/[\s-]/g, '');
    if (!form.mobile.trim()) {
      nextErrors.mobile = "Mobile number is required";
    } else if (!mobileRegex.test(cleanMobile)) {
      nextErrors.mobile = "Enter a valid 10-digit number";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    try {
      await onAdded(form);
      resetForm();
      onClose();
    } catch {
      // parent surfaces error via alert/toast if needed
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.modalOverlayWrap, isTablet && styles.modalOverlayWrapCentered]}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose} />
        <View style={[styles.modalCard, isTablet && { width: 480, alignSelf: "center", borderRadius: 22 }]}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.modalIconBadge}>
                <Feather name="user-plus" size={15} color={COLORS.orange} />
              </View>
              <Text style={styles.modalTitle}>Add New Seller</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={10}>
              <Feather name="x" size={20} color={COLORS.textFaint} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>

            <View style={styles.fieldRow}>
              <Field label="First name" required value={form.firstName} onChangeText={update("firstName")} placeholder="e.g. Ananya" error={errors.firstName} />
              <Field label="Last name" required value={form.lastName} onChangeText={update("lastName")} placeholder="e.g. Rao" error={errors.lastName} />
            </View>
            <View style={styles.fieldRow}>
              <Field
                label="Email address"
                required
                value={form.email}
                onChangeText={update("email")}
                placeholder="name@example.com"
                keyboardType="email-address"
                error={errors.email}
              />
            </View>
            <View style={styles.fieldRow}>
              <Field
                label="Mobile number"
                required
                hint="Enter 10-digit mobile number"
                value={form.mobile}
                onChangeText={update("mobile")}
                placeholder="98765 43210"
                keyboardType="phone-pad"
                error={errors.mobile}
              />
            </View>

            <View style={styles.noteBox}>
              <Feather name="star" size={15} color={COLORS.orange} style={{ marginTop: 1 }} />
              <Text style={styles.noteText}>
                A secure password is generated automatically and emailed to the seller once the account is created.
              </Text>
            </View>

            <View style={[styles.actionsRow, !isTablet && styles.actionsRowMobile]}>
              <TouchableOpacity style={[styles.resetBtn, !isTablet && styles.actionBtnMobile]} onPress={resetForm}>
                <Feather name="rotate-ccw" size={14} color={COLORS.textMuted} />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, !isTablet && styles.actionBtnMobile]} onPress={handleAdd} disabled={submitting}>
                <Feather name="user-plus" size={14} color="#fff" />
                <Text style={styles.addBtnText}>{submitting ? 'Adding…' : 'Add seller'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SellersTable({ isMobile, sellers }: { isMobile: boolean; sellers: Seller[] }) {
  if (isMobile) {
    // ── Mobile: list-view cards instead of a table ──────────────
    return (
      <View style={{ gap: 10 }}>
        {sellers.map((seller) => (
          <View key={seller.id} style={styles.sellerCard}>
            <View style={styles.sellerCardTopRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 }}>
                <LinearGradient colors={[COLORS.navy, COLORS.navySoft]} style={styles.sellerAvatar}>
                  <Text style={styles.sellerAvatarText}>{initials(seller.name)}</Text>
                </LinearGradient>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.sellerName} numberOfLines={1}>{seller.name}</Text>
                  <Text style={styles.sellerMeta}>ID: {seller.id}</Text>
                </View>
              </View>
              <StatusPill status={seller.status} />
            </View>

            <View style={styles.sellerCardDivider} />

            <View style={styles.sellerCardMetaRow}>
              <Feather name="mail" size={12} color={COLORS.textFaint} />
              <Text style={styles.sellerCardMetaText} numberOfLines={1}>{seller.email}</Text>
            </View>
            <View style={styles.sellerCardMetaRow}>
              <Feather name="phone" size={12} color={COLORS.textFaint} />
              <Text style={styles.sellerCardMetaText} numberOfLines={1}>{seller.mobile}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  // ── Tablet / desktop: real table with an ID column, fills full width ──
  return (
    <View style={{ width: "100%" }}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>ID</Text>
        <Text style={[styles.tableHeaderText, { flex: 2.4 }]}>Name</Text>
        <Text style={[styles.tableHeaderText, { flex: 2.8 }]}>Email</Text>
        <Text style={[styles.tableHeaderText, { flex: 1.8 }]}>Mobile</Text>
        <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>Status</Text>
      </View>

      {sellers.map((seller) => (
        <View key={seller.id} style={styles.tableRow}>
          <Text style={[styles.tableCellText, { flex: 0.8 }]}>{seller.id}</Text>
          <View style={[styles.tableCell, { flex: 2.4, flexDirection: "row", alignItems: "center", gap: 10 }]}>
            <LinearGradient colors={[COLORS.navy, COLORS.navySoft]} style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>{initials(seller.name)}</Text>
            </LinearGradient>
            <Text style={styles.sellerName} numberOfLines={1}>{seller.name}</Text>
          </View>
          <Text style={[styles.tableCellText, { flex: 2.8 }]} numberOfLines={1}>{seller.email}</Text>
          <Text style={[styles.tableCellText, { flex: 1.8 }]} numberOfLines={1}>{seller.mobile}</Text>
          <View style={{ flex: 1.2, alignItems: "flex-end" }}>
            <StatusPill status={seller.status} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function AddSellersScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isMobile = !isTablet;
  const [modalOpen, setModalOpen] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [lastAddedName, setLastAddedName] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(sellers.length / itemsPerPage) || 1;
  const paginatedSellers = sellers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const loadSellers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const page = await fetchSellers({ size: 200 });
      setSellers((page.items ?? []).map(mapSellerRow));
    } catch (e) {
      setLoadError(getApiErrorMessage(e, "Failed to load sellers."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSellers();
  }, []);

  const handleSellerAdded = async (form: { firstName: string; lastName: string; email: string; mobile: string }) => {
    const cleanMobile = form.mobile.replace(/[\s-]/g, '');
    await createSeller({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      mobile: cleanMobile,
    });
    await loadSellers();
    setLastAddedName(`${form.firstName.trim()} ${form.lastName.trim()}`);
    setSuccessVisible(true);
  };

  const activeCount = sellers.filter((s) => s.status === "Active").length;
  const inactiveCount = sellers.filter((s) => s.status === "Inactive").length;

  return (
    <AdminLayout>
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={{ padding: isTablet ? 24 : 16, paddingBottom: 40, width: "100%" }}
        showsVerticalScrollIndicator={false}
      >

        {/* Navy header */}
        <View style={[styles.hero, isMobile && styles.heroMobile]}>
          <View style={styles.heroTopRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: isMobile ? 8 : 12, flex: 1, marginRight: 8 }}>
              <View style={styles.heroIconBadge}>
                <Feather name="users" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Add Sellers</Text>
                <Text style={styles.heroSubtitle} numberOfLines={2}>Add and manage sellers</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.addHeaderBtn,
                width < 350 && { width: 40, height: 40, borderRadius: 12, paddingHorizontal: 0, paddingVertical: 0, justifyContent: "center", alignItems: "center" }
              ]}
              onPress={() => setModalOpen(true)}
            >
              <Feather name="plus" size={15} color="#fff" />
              {width >= 350 && <Text style={styles.addHeaderBtnText}>Add</Text>}
            </TouchableOpacity>
          </View>
          {/* Spacer to prevent overlapping with text and button */}
          <View style={isMobile ? styles.headerCardSpacerMobile : styles.headerCardSpacer} />
        </View>

        {/* Overlapping stat cards — centered, single row on all sizes */}
        <View style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
          <StatCard icon="users" value={String(sellers.length)} label="Total Sellers" tint={COLORS.navy} tintBg="#EEF2F7" isMobile={isMobile} />
          <StatCard icon="check-circle" value={String(activeCount)} label="Active" tint={COLORS.emerald} tintBg={COLORS.emeraldBg} isMobile={isMobile} />
          <StatCard icon="x-circle" value={String(inactiveCount)} label="Inactive" tint={COLORS.rose} tintBg={COLORS.roseBg} isMobile={isMobile} />
        </View>

        {/* Sellers table / list */}
        <View style={[
          styles.tableCard,
          { width: "100%", alignSelf: "stretch" },
          isMobile && { backgroundColor: "transparent", borderWidth: 0, overflow: "visible", elevation: 0, shadowOpacity: 0 }
        ]}>
          {loading ? (
            <Text style={{ padding: 16, color: COLORS.textMuted }}>Loading sellers…</Text>
          ) : loadError ? (
            <Text style={{ padding: 16, color: COLORS.rose }}>{loadError}</Text>
          ) : (
            <SellersTable isMobile={isMobile} sellers={paginatedSellers} />
          )}
        </View>

        {!loading && !loadError && sellers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sellers.length}
            itemsPerPage={itemsPerPage}
            itemName="sellers"
            onPageChange={setCurrentPage}
          />
        )}
      </ScrollView>

      <AddSellerModal visible={modalOpen} onClose={() => setModalOpen(false)} onAdded={handleSellerAdded} />
      <SuccessAlert visible={successVisible} name={lastAddedName} onClose={() => setSuccessVisible(false)} />
    </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: COLORS.navy, borderRadius: 20, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 0, overflow: "visible", zIndex: 1 },
  heroMobile: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroIconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroSubtitle: { color: "#94A3B8", fontSize: 12, marginTop: 2, fontWeight: "400" },
  headerCardSpacer: { height: 38 },
  headerCardSpacerMobile: { height: 40 },
  addHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: COLORS.orange,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  addHeaderBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  statsRow: { flexDirection: "row", flexWrap: "nowrap", justifyContent: "center", gap: 10, marginTop: -20, paddingHorizontal: 2, zIndex: 10, elevation: 5 },
  statsRowMobile: { flexWrap: "nowrap", justifyContent: "space-between", gap: 5, marginTop: -24, paddingHorizontal: 0, zIndex: 10, elevation: 5 },
  statCard: { backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1, borderColor: "#F1F5F9", shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  statCardDesktop: { flexGrow: 0, flexShrink: 0, width: 154 },
  statCardMobile: { flex: 1, minWidth: 0, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 4 },
  statCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statIconBoxMobile: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 17, fontWeight: "700" },
  statValueMobile: { fontSize: 14, fontWeight: "800", marginTop: 2, textAlign: "center" },
  statLabel: { fontSize: 11, color: COLORS.textFaint, fontWeight: "500", marginTop: 7 },
  statLabelMobile: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600", marginTop: 2, textAlign: "center" },

  tableCard: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: "#F1F5F9", marginTop: 24, zIndex: 1, overflow: "hidden" },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardHeaderRowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.navy },
  mutedSmall: { fontSize: 11, color: COLORS.textFaint, fontWeight: "500" },

  tableHeaderRow: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "#151D4F", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tableHeaderText: { fontSize: 11, fontWeight: "600", color: "#fff", textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F5F7FA" },
  tableCell: {},
  tableCellText: { fontSize: 12.5, fontWeight: "400", color: COLORS.textMuted, paddingRight: 8 },

  sellerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sellerAvatarText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  sellerName: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  sellerMeta: { fontSize: 10.5, color: COLORS.textFaint, marginTop: 1, fontWeight: "400" },

  // Mobile list-view cards
  sellerCard: { borderWidth: 1, borderColor: "#F1F5F9", borderRadius: 14, padding: 14, backgroundColor: COLORS.card, shadowColor: "#0F172A", shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, marginBottom: 8 },
  sellerCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sellerCardDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  sellerCardMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  sellerCardMetaText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "400", flexShrink: 1 },

  pill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: "600" },

  // Modal
  modalOverlayWrap: { flex: 1, justifyContent: "flex-end" },
  modalOverlayWrapCentered: { justifyContent: "center", alignItems: "center", padding: 24 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.55)" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "88%", overflow: "hidden" },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", backgroundColor: "#fff" },
  modalScrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  modalIconBadge: { width: 30, height: 30, borderRadius: 9, backgroundColor: COLORS.orangeBg, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: COLORS.navy },

  fieldRow: { flexDirection: "row", gap: 14, marginTop: 14, flexWrap: "wrap" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6 },
  fieldHint: { fontSize: 11, color: COLORS.textFaint, marginTop: 4 },
  fieldError: { fontSize: 11, color: COLORS.rose, marginTop: 4, fontWeight: "500" },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 14, color: COLORS.text, backgroundColor: "#fff" },
  inputError: { borderColor: COLORS.rose },

  noteBox: { flexDirection: "row", gap: 9, backgroundColor: COLORS.orangeBg, borderRadius: 12, padding: 13, marginTop: 18 },
  noteText: { flex: 1, fontSize: 12, color: "#9A3412", lineHeight: 17 },

  actionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20, marginBottom: 4 },
  actionsRowMobile: { justifyContent: "space-between" },
  actionBtnMobile: { flex: 1, paddingHorizontal: 10 },
  resetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  resetBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: COLORS.orange, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  addBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // Success alert
  successOverlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.55)", padding: 24 },
  successCard: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 24, paddingVertical: 26, alignItems: "center", width: "100%", maxWidth: 320 },
  successIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.emerald, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  successTitle: { fontSize: 16, fontWeight: "700", color: COLORS.navy, textAlign: "center" },
  successMessage: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", marginTop: 6, lineHeight: 18 },
  successDoneBtn: { marginTop: 18, backgroundColor: COLORS.orange, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 28 },
  successDoneBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});