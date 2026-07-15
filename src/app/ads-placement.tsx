import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import AdminLayout from '@/components/admin-layout';
import { getApiErrorMessage } from '@/lib/api/client';
import { sweetCrud, sweetError } from '@/lib/sweetAlert';
import {
  createAdPlacement,
  deleteAdPlacement,
  fetchAdPlacements,
  formatAdsDate,
  toApiStatus,
  toUiStatus,
  updateAdPlacement,
  type AdsApiRow,
} from '@/services/adsApi';

/**
 * ── INTEGRATION NOTE ─────────────────────────────────────────────
 * Assumes it's rendered inside your shared AdminLayout, same as
 * AddSellersScreen:
 *
 *   <AdminLayout activeRoute="ad-placements">
 *     <AdPlacementsScreen />
 *   </AdminLayout>
 *
 * Requires: expo install expo-linear-gradient
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
  blue: "#2563EB",
  blueBg: "#EFF6FF",
  orangeBg: "#FFF7ED",
};

type PlacementType = "Homepage Banner" | "Category Banner" | "Category Sub-Banner" | "Landing Page Banner" | "Custom";

type Placement = {
  id: number;
  name: string;
  description: string;
  type: PlacementType;
  dailyRate: number;
  monthlyRate: number;
  status: "Active" | "Inactive";
  created: string;
};

const PLACEMENT_TYPES: PlacementType[] = [
  "Homepage Banner",
  "Category Banner",
  "Category Sub-Banner",
  "Landing Page Banner",
  "Custom",
];

function mapPlacementFromApi(row: AdsApiRow): Placement {
  const daily = row.dailyRate ?? row.daily_rate;
  const monthly = row.monthlyRate ?? row.monthly_rate;
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    type: String(row.type ?? 'Custom') as PlacementType,
    dailyRate: Number(daily ?? 0),
    monthlyRate: Number(monthly ?? 0),
    status: toUiStatus(row.status),
    created: formatAdsDate(row.createdAt),
  };
}

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function StatusPill({ status }: { status: Placement["status"] }) {
  const active = status === "Active";
  return (
    <View style={[styles.pill, { backgroundColor: active ? COLORS.emeraldBg : COLORS.roseBg }]}>
      <Feather name={active ? "check-circle" : "x-circle"} size={11} color={active ? COLORS.emerald : COLORS.rose} />
      <Text style={[styles.pillText, { color: active ? COLORS.emerald : COLORS.rose }]}>{status}</Text>
    </View>
  );
}

function TypeTag({ type }: { type: PlacementType }) {
  return (
    <View style={[styles.typeTag, { alignSelf: "flex-start", maxWidth: "100%" }]}>
      <Text style={styles.typeTagText} numberOfLines={1}>{type}</Text>
    </View>
  );
}

function Field({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  multiline,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
  error?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={{ color: COLORS.orange }}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, error && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textFaint}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
      />
      {error ? <Text style={styles.fieldError}>This field is required</Text> : null}
    </View>
  );
}

function TypePicker({ value, onChange }: { value: PlacementType; onChange: (t: PlacementType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ width: "100%" }}>
      <Text style={styles.fieldLabel}>
        Placement type <Text style={{ color: COLORS.orange }}>*</Text>
      </Text>
      <TouchableOpacity
        style={[styles.dropdownBtn, open && styles.dropdownBtnOpen]}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.85}
      >
        <Text style={styles.dropdownBtnText}>{value}</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={15} color={COLORS.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {PLACEMENT_TYPES.map((t, idx) => {
            const selected = t === value;
            const isLast = idx === PLACEMENT_TYPES.length - 1;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => { onChange(t); setOpen(false); }}
                style={[styles.dropdownItem, isLast && { borderBottomWidth: 0 }, selected && styles.dropdownItemSelected]}
              >
                <Feather
                  name={selected ? "check" : "minus"}
                  size={13}
                  color={selected ? COLORS.orange : "transparent"}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function StatusPicker({ value, onChange }: { value: "Active" | "Inactive"; onChange: (s: "Active" | "Inactive") => void }) {
  const options: { key: "Active" | "Inactive"; icon: keyof typeof Feather.glyphMap; color: string }[] = [
    { key: "Active", icon: "check-circle", color: COLORS.emerald },
    { key: "Inactive", icon: "x-circle", color: COLORS.rose },
  ];
  return (
    <View style={{ width: "100%" }}>
      <Text style={styles.fieldLabel}>
        Status <Text style={{ color: COLORS.orange }}>*</Text>
      </Text>
      <View style={styles.typeChipRow}>
        {options.map((opt) => {
          const selected = opt.key === value;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onChange(opt.key)}
              style={[
                styles.statusChip,
                { borderColor: selected ? opt.color : COLORS.border },
                selected && { backgroundColor: opt.key === "Active" ? COLORS.emeraldBg : COLORS.roseBg },
              ]}
            >
              <Feather name={opt.icon} size={13} color={selected ? opt.color : COLORS.textFaint} />
              <Text style={[styles.typeChipText, selected && { color: opt.color }]}>{opt.key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SuccessToast({ visible, message, onClose }: { visible: boolean; message: string; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.85);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }).start();
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.successOverlay} onPress={onClose}>
        <Animated.View style={[styles.successCard, { transform: [{ scale }] }]}>
          <View style={styles.successIconCircle}>
            <Feather name="check" size={24} color="#fff" />
          </View>
          <Text style={styles.successMessage}>{message}</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

type FormState = {
  name: string;
  description: string;
  type: PlacementType;
  dailyRate: string;
  monthlyRate: string;
  status: "Active" | "Inactive";
};

const EMPTY_FORM: FormState = { name: "", description: "", type: "Homepage Banner", dailyRate: "", monthlyRate: "", status: "Active" };

function PlacementModal({
  visible,
  onClose,
  onSubmit,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (form: FormState) => void;
  initial: FormState | null;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const isEdit = !!initial;

  useEffect(() => {
    if (visible) {
      setForm(initial ?? EMPTY_FORM);
      setErrors({});
    }
  }, [visible, initial]);

  const update = (key: keyof FormState) => (v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: false }));
  };

  const handleSubmit = () => {
    const nextErrors: Record<string, boolean> = {
      name: !form.name.trim(),
      dailyRate: !form.dailyRate.trim(),
      monthlyRate: !form.monthlyRate.trim(),
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    onSubmit(form);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.modalOverlayWrap, isTablet && styles.modalOverlayWrapCentered]}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={[styles.modalCard,!isTablet && {borderBottomLeftRadius: 0,borderBottomRightRadius: 0,},isTablet && {width: 520,alignSelf: "center",},]}>          
            <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.modalIconBadge}>
                <Feather name={isEdit ? "edit-2" : "image"} size={15} color={COLORS.orange} />
              </View>
              <Text style={styles.modalTitle}>{isEdit ? "Edit Placement" : "Add New Placement"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={COLORS.textFaint} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 16 }}>
            <View style={styles.fieldRow}>
              <Field label="Placement name" required value={form.name} onChangeText={update("name")} placeholder="e.g. Homepage Main Banner" error={errors.name} />
            </View>
            <View style={styles.fieldRow}>
              <Field
                label="Description"
                value={form.description}
                onChangeText={update("description")}
                placeholder="Short description of where this ad appears"
                multiline
              />
            </View>
            <View style={styles.fieldRow}>
              <TypePicker value={form.type} onChange={(t) => setForm((f) => ({ ...f, type: t }))} />
            </View>
            <View style={styles.fieldRow}>
              <StatusPicker value={form.status} onChange={(s) => setForm((f) => ({ ...f, status: s }))} />
            </View>
            <View style={styles.fieldRow}>
              <Field
                label="Daily rate (₹)"
                required
                value={form.dailyRate}
                onChangeText={update("dailyRate")}
                placeholder="16000"
                keyboardType="numeric"
                error={errors.dailyRate}
              />
              <Field
                label="Monthly rate (₹)"
                required
                value={form.monthlyRate}
                onChangeText={update("monthlyRate")}
                placeholder="325000"
                keyboardType="numeric"
                error={errors.monthlyRate}
              />
            </View>

            <View style={[styles.actionsRow, !isTablet && styles.actionsRowMobile]}>
              <TouchableOpacity style={[styles.resetBtn, !isTablet && styles.actionBtnMobile]} onPress={onClose}>
                <Feather name="x" size={14} color={COLORS.textMuted} />
                <Text style={styles.resetBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, !isTablet && styles.actionBtnMobile]} onPress={handleSubmit}>
                <Feather name={isEdit ? "check" : "plus"} size={14} color="#fff" />
                <Text style={styles.addBtnText}>{isEdit ? "Save changes" : "Add placement"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PlacementsList({
  isMobile,
  placements,
  onEdit,
  onDelete,
}: {
  isMobile: boolean;
  placements: Placement[];
  onEdit: (p: Placement) => void;
  onDelete: (p: Placement) => void;
}) {
  const { width } = useWindowDimensions();
  const needsScroll = !isMobile && width <= 1280;
  if (isMobile) {
    return (
      <View>
        {placements.map((p, index) => (
          <Pressable
            key={p.id}
            style={({ pressed }) => [
              styles.placementCard,
              index !== placements.length - 1 && { marginBottom: 10 },
              pressed && styles.placementCardPressed,
            ]}
            android_ripple={{ color: "#EEF2FF" }}
          >
            <View style={styles.placementCardTopRow}>
              <View style={{ flexShrink: 1, flex: 1 }}>
                <Text style={styles.placementName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.placementDesc} numberOfLines={2}>{p.description}</Text>
              </View>
              <StatusPill status={p.status} />
            </View>

            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <TypeTag type={p.type} />
              <Text style={styles.placementMeta}>ID: {p.id}</Text>
            </View>

            <View style={styles.placementCardDivider} />

            <View style={styles.placementRatesRow}>
              <View>
                <Text style={styles.rateLabel}>Daily rate</Text>
                <Text style={styles.rateValue}>{formatINR(p.dailyRate)}</Text>
              </View>
              <View>
                <Text style={styles.rateLabel}>Monthly rate</Text>
                <Text style={styles.rateValue}>{formatINR(p.monthlyRate)}</Text>
              </View>
              <View>
                <Text style={styles.rateLabel}>Created</Text>
                <Text style={styles.rateValue}>{p.created}</Text>
              </View>
            </View>

            <View style={styles.placementActionsRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(p)}>
                <Feather name="edit-2" size={14} color={COLORS.blue} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(p)}>
                <Feather name="trash-2" size={14} color={COLORS.rose} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  const tableContent = (
    <View>
      <View style={styles.tableHeaderRow}>
        <View style={{ flex: 0.4 }}><Text style={styles.tableHeaderText}>ID</Text></View>
        <View style={{ flex: 2.2 }}><Text style={styles.tableHeaderText}>Name</Text></View>
        <View style={{ flex: 1.8 }}><Text style={styles.tableHeaderText}>Type</Text></View>
        <View style={{ flex: 1.1 }}><Text style={styles.tableHeaderText}>Daily</Text></View>
        <View style={{ flex: 1.2 }}><Text style={styles.tableHeaderText}>Monthly</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.tableHeaderText}>Status</Text></View>
        <View style={{ flex: 1.1 }}><Text style={styles.tableHeaderText}>Created</Text></View>
        <View style={{ flex: 0.8, alignItems: "flex-end" }}><Text style={styles.tableHeaderText}>Action</Text></View>
      </View>

      {placements.map((p) => (
        <View key={p.id} style={styles.tableRow}>
          <View style={{ flex: 0.4, justifyContent: "center" }}>
            <Text style={styles.tableCellText}>{p.id}</Text>
          </View>
          <View style={{ flex: 2.2, overflow: "hidden", paddingRight: 8, justifyContent: "center" }}>
            <Text style={styles.placementName} numberOfLines={1}>{p.name}</Text>
            <Text style={styles.placementDesc} numberOfLines={2}>{p.description}</Text>
          </View>
          <View style={{ flex: 1.8, overflow: "hidden", paddingRight: 8, justifyContent: "center" }}>
            <TypeTag type={p.type} />
          </View>
          <View style={{ flex: 1.1, justifyContent: "center" }}>
            <Text style={styles.tableCellText}>{formatINR(p.dailyRate)}</Text>
          </View>
          <View style={{ flex: 1.2, justifyContent: "center" }}>
            <Text style={styles.tableCellText}>{formatINR(p.monthlyRate)}</Text>
          </View>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <StatusPill status={p.status} />
          </View>
          <View style={{ flex: 1.1, justifyContent: "center" }}>
            <Text style={styles.tableCellText}>{p.created}</Text>
          </View>
          <View style={{ flex: 0.8, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
            <TouchableOpacity style={styles.editBtnSmall} onPress={() => onEdit(p)}>
              <Feather name="edit-2" size={13} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtnSmall} onPress={() => onDelete(p)}>
              <Feather name="trash-2" size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      horizontal={needsScroll}
      scrollEnabled={needsScroll}
      showsHorizontalScrollIndicator={false}
      style={{ width: "100%" }}
      contentContainerStyle={{ width: "100%", minWidth: needsScroll ? 820 : undefined }}
    >
      <View style={{ width: "100%", minWidth: needsScroll ? 820 : undefined }}>
        {tableContent}
      </View>
    </ScrollView>
  );
}

export default function AdPlacementsScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isMobile = !isTablet;

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: "" });

  const loadPlacements = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchAdPlacements();
      setPlacements(rows.map(mapPlacementFromApi));
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Failed to load placements.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlacements();
  }, [loadPlacements]);

  const openAddModal = () => {
    setEditingPlacement(null);
    setModalOpen(true);
  };

  const openEditModal = (p: Placement) => {
    setEditingPlacement(p);
    setModalOpen(true);
  };

  const handleSubmit = async (form: FormState) => {
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type,
      dailyRate: Number(form.dailyRate) || 0,
      monthlyRate: Number(form.monthlyRate) || 0,
      status: toApiStatus(form.status),
    };
    if (editingPlacement) {
      if (!(await sweetCrud.confirmUpdate('Placement', body.name))) return;
    } else {
      if (!(await sweetCrud.confirmAdd('Placement', body.name))) return;
    }
    setSaving(true);
    try {
      if (editingPlacement) {
        await updateAdPlacement(editingPlacement.id, body);
        setToast({ visible: true, message: "Placement updated successfully!" });
        void sweetCrud.updated('Placement');
      } else {
        await createAdPlacement(body);
        setToast({ visible: true, message: "Placement added successfully!" });
        void sweetCrud.added('Placement');
      }
      setModalOpen(false);
      setEditingPlacement(null);
      await loadPlacements();
    } catch (err) {
      void sweetError('Error', getApiErrorMessage(err, editingPlacement ? 'Could not update placement.' : 'Could not add placement.'));
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = async (placement: Placement) => {
    if (!(await sweetCrud.confirmDelete('Placement', placement.name))) return;
    setSaving(true);
    try {
      await deleteAdPlacement(placement.id);
      setToast({ visible: true, message: "Placement deleted." });
      void sweetCrud.deleted('Placement');
      await loadPlacements();
    } catch (err) {
      void sweetError('Error', getApiErrorMessage(err, 'Could not delete placement.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{ padding: isTablet ? 24 : 16, paddingBottom: 40, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Navy header */}
          <View style={styles.hero}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconBadge}>
                <Feather name="image" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.heroTitle} numberOfLines={1}>Ad Placements</Text>
                <Text style={styles.heroSubtitle} numberOfLines={1}>Manage ad placements</Text>              
              </View>
              {!isMobile && (
                <TouchableOpacity
                  style={styles.addHeaderBtn}
                  onPress={openAddModal}
                >
                  <Feather name="plus" size={15} color="#fff" />
                  <Text style={styles.addHeaderBtnText}>Add Placement</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Placements table / list */}
          <View style={[styles.tableCard, isMobile && { backgroundColor: "transparent", borderWidth: 0, overflow: "visible" }]}>
            {loadError ? (
              <Text style={{ color: COLORS.rose, padding: 16 }}>{loadError}</Text>
            ) : loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.orange} />
              </View>
            ) : (
              <PlacementsList isMobile={isMobile} placements={placements} onEdit={openEditModal} onDelete={(p) => void requestDelete(p)} />
            )}
          </View>
        </ScrollView>

        {isMobile && (
          <TouchableOpacity style={styles.fab} onPress={openAddModal}>
            <Feather name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <PlacementModal
          visible={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingPlacement(null);
          }}
          onSubmit={handleSubmit}
          initial={
            editingPlacement
              ? {
                  name: editingPlacement.name,
                  description: editingPlacement.description,
                  type: editingPlacement.type,
                  dailyRate: String(editingPlacement.dailyRate),
                  monthlyRate: String(editingPlacement.monthlyRate),
                  status: editingPlacement.status,
                }
              : null
          }
        />

        <SuccessToast visible={toast.visible} message={toast.message} onClose={() => setToast({ visible: false, message: "" })} />
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: COLORS.navy, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 20, overflow: "hidden" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  heroIconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroSubtitle: { color: "#94A3B8", fontSize: 12, marginTop: 2, fontWeight: "400" },
  addHeaderBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.orange, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  addHeaderBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  tableCard: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: "#F1F5F9", marginTop: 20, overflow: "hidden" },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardHeaderRowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.navy },
  mutedSmall: { fontSize: 11, color: COLORS.textFaint, fontWeight: "500" },

  tableHeaderRow: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "#F1F4F9", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", alignSelf: "stretch" },
  tableHeaderText: { fontSize: 11, fontWeight: "600", color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F5F7FA", alignSelf: "stretch" },
  tableCellText: { fontSize: 12.5, fontWeight: "400", color: COLORS.textMuted, paddingRight: 8 },

  placementName: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  placementDesc: { fontSize: 11, color: COLORS.textFaint, marginTop: 1, fontWeight: "400" },
  placementMeta: { fontSize: 10.5, color: COLORS.textFaint, fontWeight: "500" },

  pill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  pillText: { fontSize: 10, fontWeight: "600" },

  typeTag: { backgroundColor: COLORS.blueBg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" },
  typeTagText: { fontSize: 10.5, fontWeight: "600", color: COLORS.blue },

  // Mobile card list
  placementCardPressed: {
    backgroundColor: "#F8FAFF",
    borderColor: "#CBD5E1",
    opacity: 0.98,
  },

  placementCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 13,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  placementCardTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  placementCardDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  placementRatesRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  rateLabel: { fontSize: 9.5, color: COLORS.textFaint, fontWeight: "500", textTransform: "uppercase" },
  rateValue: { fontSize: 12.5, color: COLORS.text, fontWeight: "600", marginTop: 2 },
  placementActionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },

  editBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.blueBg, borderRadius: 10, paddingVertical: 9, borderWidth: 1, borderColor: "#DBEAFE" },
  deleteBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.roseBg, borderRadius: 10, paddingVertical: 9, borderWidth: 1, borderColor: "#FFE4E6" },
  editBtnText: { color: COLORS.blue, fontSize: 12.5, fontWeight: "600" },
  deleteBtnText: { color: COLORS.rose, fontSize: 12.5, fontWeight: "600" },
  actionBtnText: { color: "#fff", fontSize: 12.5, fontWeight: "600" },
  editBtnSmall: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.navy, alignItems: "center", justifyContent: "center" },
  deleteBtnSmall: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.rose, alignItems: "center", justifyContent: "center" },

  // Modal
  modalOverlayWrap: { flex: 1, justifyContent: "flex-end" },
  modalOverlayWrapCentered: { justifyContent: "center", alignItems: "center", padding: 24 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.55)" },
modalCard: {
  backgroundColor: "#fff",
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  borderBottomLeftRadius: 22,
  borderBottomRightRadius: 22,
  maxHeight: "88%",
  overflow: "hidden",
},  
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalIconBadge: { width: 30, height: 30, borderRadius: 9, backgroundColor: COLORS.orangeBg, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: COLORS.navy },

  fieldRow: { flexDirection: "row", gap: 14, marginTop: 14, flexWrap: "wrap" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6 },
  fieldError: { fontSize: 11, color: COLORS.rose, marginTop: 4, fontWeight: "500" },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 14, color: COLORS.text, backgroundColor: "#fff", outlineStyle: "none" } as any,
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  inputError: { borderColor: COLORS.rose },

  typeChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  typeChipSelected: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  typeChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
  typeChipTextSelected: { color: "#fff" },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },

  // Dropdown for TypePicker
  dropdownBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: "#fff" },
  dropdownBtnOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomColor: "transparent" },
  dropdownBtnText: { fontSize: 14, color: COLORS.text, fontWeight: "500", flex: 1 },
  dropdownMenu: { backgroundColor: "#fff", borderRadius: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.border, shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4, overflow: "hidden", marginBottom: 4 },
  dropdownItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  dropdownItemSelected: { backgroundColor: "#FFF7ED" },
  dropdownItemText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500" },
  dropdownItemTextSelected: { color: COLORS.orange, fontWeight: "700" },

  actionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 22, marginBottom: 4 },
  actionsRowMobile: { justifyContent: "space-between" },
  actionBtnMobile: { flex: 1, paddingHorizontal: 10 },
  resetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  resetBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: COLORS.orange, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  addBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 10,
  },

  // Success toast
  successOverlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.55)", padding: 24 },
  successCard: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 24, paddingVertical: 24, alignItems: "center", width: "100%", maxWidth: 300 },
  successIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.emerald, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  successMessage: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 18 },

  // Delete confirm
  confirmCard: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 24, paddingVertical: 24, alignItems: "center", width: "100%", maxWidth: 340 },
  confirmTitle: { fontSize: 16, fontWeight: "700", color: COLORS.navy, marginBottom: 6 },
  confirmActionsRow: { flexDirection: "row", gap: 10, marginTop: 18, width: "100%" },
});