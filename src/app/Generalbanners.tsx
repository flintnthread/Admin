import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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
import {
  Calendar,
  ChevronDown,
  Filter,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react-native";

const initialBanners = [
  { id: "1", title: "Women's Chanderi Sarees", category: "sarees", date: "07 Jun, 2026", status: "Active", color: "#f6d9d9", text: "Flat 70% Off" },
  { id: "2", title: "Cute Couple T-Shirt Set", category: "tshirts", date: "07 Jun, 2026", status: "Active", color: "#f3b7b7", text: "Up to 50% Off" },
  { id: "3", title: "Stylish Travel Backpacks", category: "travel backpacks", date: "07 Jun, 2026", status: "Active", color: "#cdeedd", text: "Min. 60% Off" },
  { id: "4", title: "SilkLoom Pure Soft Linen Saree", category: "sarees", date: "07 Jun, 2026", status: "Active", color: "#dcdaf0", text: "Min. 60% Off" },
  { id: "5", title: "One Gram Gold Jewellery Locket", category: "jewellery", date: "07 Jun, 2026", status: "Inactive", color: "#5a1f2e", text: "Up to 50% Off", dark: true },
  { id: "6", title: "Satin Saree", category: "sarees", date: "07 Jun, 2026", status: "Active", color: "#215b7a", text: "Min. 40% Off", dark: true },
];

const emptyForm = {
  title: "",
  category: "",
  text: "",
  buttonUrl: "",
  buttonText: "Shop Now",
  textPosition: "Left",
  bannerSize: "Full Width",
  status: "Active",
};

const TEXT_POSITIONS = ["Left", "Center", "Right"];
const BANNER_SIZES = ["Full Width", "Half Width", "Compact"];
const STATUSES = ["Active", "Inactive"];

// ─── SweetAlert Component ──────────────────────────────────────────────────────
type SAlertType = "add-confirm" | "add-success" | "edit-confirm" | "edit-success" | "delete-confirm" | "delete-success";

interface SweetAlertProps {
  visible: boolean;
  type: SAlertType;
  bannerTitle?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const SweetAlert = ({ visible, type, bannerTitle, onConfirm, onCancel }: SweetAlertProps) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      cardScale.setValue(0.85);
      cardOpacity.setValue(0);
      iconScale.setValue(0);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(iconScale, { toValue: 1, tension: 70, friction: 6, useNativeDriver: true }).start();
      });
    }
  }, [visible, type]);

  if (!visible) return null;

  const isSuccess = type.endsWith("success");
  const isDelete = type.startsWith("delete");
  const isEdit = type.startsWith("edit");

  const iconBg = isSuccess ? "#22c55e" : isDelete ? "#ef4444" : "#f97316";
  const confirmBg = isSuccess ? "#22c55e" : isDelete ? "#ef4444" : "#f97316";
  const title = isSuccess
    ? isDelete ? "Banner Deleted!" : isEdit ? "Banner Updated!" : "Banner Added!"
    : isDelete ? "Delete Banner?" : isEdit ? "Update Banner?" : "Add Banner?";
  const subtitle = isSuccess
    ? isDelete
      ? "The banner has been successfully removed."
      : isEdit
      ? `"${bannerTitle}" has been updated successfully.`
      : `"${bannerTitle}" has been added to banners.`
    : isDelete
    ? `Are you sure you want to delete "${bannerTitle}"? This action cannot be undone.`
    : isEdit
    ? `Save changes to "${bannerTitle}"?`
    : "Are you sure you want to add this new banner?";

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[sa.overlay, { opacity: overlayOpacity }]}>
        <Animated.View style={[sa.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
          <Animated.View style={[sa.iconCircle, { backgroundColor: iconBg, transform: [{ scale: iconScale }] }]}>
            {isSuccess ? (
              <Text style={sa.iconText}>✓</Text>
            ) : isDelete ? (
              <Text style={sa.iconText}>🗑</Text>
            ) : (
              <Text style={sa.iconText}>{isEdit ? "✎" : "+"}</Text>
            )}
          </Animated.View>
          <Text style={sa.title}>{title}</Text>
          <Text style={sa.subtitle}>{subtitle}</Text>
          <View style={sa.btnRow}>
            {isSuccess ? (
              <TouchableOpacity style={[sa.confirmBtn, { backgroundColor: confirmBg }]} onPress={onConfirm} activeOpacity={0.85}>
                <Text style={sa.confirmTxt}>Done</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={sa.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                  <Text style={sa.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[sa.confirmBtn, { backgroundColor: confirmBg }]} onPress={onConfirm} activeOpacity={0.85}>
                  <Text style={sa.confirmTxt}>{isDelete ? "Yes, Delete" : isEdit ? "Yes, Update" : "Yes, Add"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function BannerManagement() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const isWeb = Platform.OS === "web" && width >= 900;
  const isMobile = !isTablet; // narrow phone-width screens

  const [banners, setBanners] = useState(initialBanners);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  // Grid view is the default view when the screen opens
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  // SweetAlert state
  const [sweetVisible, setSweetVisible] = useState(false);
  const [sweetType, setSweetType] = useState<SAlertType>("add-confirm");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingForm, setPendingForm] = useState<any>(null);

  const filtered = banners.filter((b) => {
    const matchesQuery = (b.title + " " + b.category).toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "All" || b.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const activeCount = banners.filter((b) => b.status === "Active").length;
  const inactiveCount = banners.length - activeCount;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedBanners = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Columns for grid
  const numCols = isWeb ? 3 : isTablet ? 2 : 1;
  const gridCardWidth = numCols === 3 ? "31.5%" : numCols === 2 ? "48%" : "100%";

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalVisible(true);
  }

  function openEdit(banner: typeof initialBanners[0] & { [key: string]: any }) {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      category: banner.category || "",
      text: banner.text || "",
      buttonUrl: banner.buttonUrl || "",
      buttonText: banner.buttonText || "Shop Now",
      textPosition: banner.textPosition || "Left",
      bannerSize: banner.bannerSize || "Full Width",
      status: banner.status || "Active",
    });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  // Trigger SweetAlert for Save (Add or Edit)
  function handleSavePress() {
    if (!form.title.trim()) return;
    setPendingForm({ ...form });
    setSweetType(editingId ? "edit-confirm" : "add-confirm");
    setSweetVisible(true);
    setModalVisible(false);
  }

  function handleSweetConfirm() {
    if (sweetType === "add-confirm") {
      const palette = ["#fde9c8", "#c9ece6", "#e3d9f7", "#e2f0c4", "#cfeaf5"];
      const newBanner = {
        id: String(Date.now()),
        title: pendingForm.title,
        category: pendingForm.category || "general",
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        status: pendingForm.status,
        color: palette[banners.length % palette.length],
        text: pendingForm.text,
        buttonUrl: pendingForm.buttonUrl,
        buttonText: pendingForm.buttonText,
        textPosition: pendingForm.textPosition,
        bannerSize: pendingForm.bannerSize,
      };
      setBanners((prev) => [newBanner, ...prev]);
      setSweetType("add-success");
    } else if (sweetType === "edit-confirm") {
      setBanners((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? { ...b, title: pendingForm.title, category: pendingForm.category || b.category, text: pendingForm.text, buttonUrl: pendingForm.buttonUrl, buttonText: pendingForm.buttonText, textPosition: pendingForm.textPosition, bannerSize: pendingForm.bannerSize, status: pendingForm.status }
            : b
        )
      );
      setSweetType("edit-success");
    } else if (sweetType === "delete-confirm") {
      setBanners((prev) => prev.filter((b) => b.id !== pendingDeleteId));
      setPendingDeleteId(null);
      setSweetType("delete-success");
    } else {
      // success stage — done
      setSweetVisible(false);
      setPendingForm(null);
      setEditingId(null);
      setForm(emptyForm);
    }
  }

  function handleSweetCancel() {
    setSweetVisible(false);
    if (sweetType === "add-confirm" || sweetType === "edit-confirm") {
      // Reopen the form modal
      setModalVisible(true);
    }
    setPendingDeleteId(null);
  }

  function handleDeletePress(banner: typeof initialBanners[0] & { [key: string]: any }) {
    setPendingDeleteId(banner.id);
    setPendingForm(banner);
    setSweetType("delete-confirm");
    setSweetVisible(true);
  }

  return (
    <AdminLayout>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header + overlapping stats */}
          <View style={styles.headerWrap}>
            <View style={[styles.header, isTablet && styles.headerRow]}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <ImageIcon size={22} color="#fff" />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.headerTitle}>Banners Management</Text>
                  <Text style={styles.headerSubtitle}>Manage promotional banners across the storefront</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.btnPrimary, isTablet && { alignSelf: "center" }]} onPress={openAdd} activeOpacity={0.85}>
                <Plus size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>{isMobile ? "Add" : "Add Banner"}</Text>
              </TouchableOpacity>
            </View>

            {/* Stats — overlaps the bottom edge of the header */}
            <View style={styles.stats}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{banners.length}</Text>
                <Text style={styles.statLabel}>Total Banners</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#16a34a" }]}>{activeCount}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#94a3b8" }]}>{inactiveCount}</Text>
                <Text style={styles.statLabel}>Inactive</Text>
              </View>
            </View>
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <Search size={16} color="#9aa0ac" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search banners..."
                placeholderTextColor="#9aa0ac"
                style={styles.searchInput}
              />
            </View>
            <View style={styles.viewToggleGroup}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive]}
                onPress={() => setViewMode("list")}
              >
                <List size={16} color={viewMode === "list" ? "#EA580C" : "#6B7280"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "grid" && styles.viewToggleBtnActive]}
                onPress={() => setViewMode("grid")}
              >
                <LayoutGrid size={16} color={viewMode === "grid" ? "#EA580C" : "#6B7280"} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.filterBox} onPress={() => setPickerOpen("filter" as string)} activeOpacity={0.8}>
              <Filter size={14} color="#6b7280" />
              <Text style={styles.filterText}>{statusFilter}</Text>
              <ChevronDown size={14} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* List or Grid */}
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <ImageIcon size={28} color="#c4c8d0" />
              <Text style={styles.emptyTitle}>No banners found</Text>
              <Text style={styles.emptySubtitle}>Try a different search or add a new banner</Text>
            </View>
          ) : (
            <>
              {viewMode === "list" ? (
                <View style={styles.list}>
                  {paginatedBanners.map((banner) => (
                    <View key={banner.id} style={styles.row}>
                      <View style={[styles.thumb, { backgroundColor: banner.color }]}>
                        <Text style={[styles.thumbTag, !!banner.dark && { color: "#fff" }]} numberOfLines={1}>
                          {banner.text}
                        </Text>
                      </View>

                      <View style={styles.rowMain}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{banner.title}</Text>
                        <Text style={styles.rowCategory}>{banner.category}</Text>
                        <View style={styles.rowMetaLine}>
                          <View style={styles.dateWrap}>
                            <Calendar size={12} color="#9aa0ac" />
                            <Text style={styles.dateText}>{banner.date}</Text>
                          </View>
                          <View style={[styles.badge, banner.status === "Active" ? styles.badgeActive : styles.badgeInactive]}>
                            <Text style={[styles.badgeText, { color: banner.status === "Active" ? "#16a34a" : "#6b7280" }]}>
                              {banner.status}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.rowActions}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(banner)}>
                          <Pencil size={15} color="#4b5563" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.iconBtn, styles.iconBtnDanger]} onPress={() => handleDeletePress(banner)}>
                          <Trash2 size={15} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.grid, { gap: 14 }]}>
                  {paginatedBanners.map((banner) => (
                    <View
                      key={banner.id}
                      style={[
                        styles.gridCard,
                        { width: gridCardWidth as any },
                        numCols === 1 && { minWidth: undefined },
                      ]}
                    >
                      {/* Banner Preview */}
                      <View style={[styles.gridThumb, { backgroundColor: banner.color }]}>
                        <Text style={[styles.gridThumbTag, !!banner.dark && { color: "#fff" }]} numberOfLines={2}>
                          {banner.text}
                        </Text>
                      </View>
                      {/* Card body */}
                      <View style={styles.gridBody}>
                        <Text style={styles.gridTitle} numberOfLines={2}>{banner.title}</Text>
                        <Text style={styles.gridCategory}>{banner.category}</Text>
                        <View style={styles.gridMeta}>
                          <View style={styles.dateWrap}>
                            <Calendar size={11} color="#9aa0ac" />
                            <Text style={styles.dateText}>{banner.date}</Text>
                          </View>
                          <View style={[styles.badge, banner.status === "Active" ? styles.badgeActive : styles.badgeInactive]}>
                            <Text style={[styles.badgeText, { color: banner.status === "Active" ? "#16a34a" : "#6b7280" }]}>
                              {banner.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.gridActions}>
                          <TouchableOpacity style={styles.gridActionBtn} onPress={() => openEdit(banner)}>
                            <Pencil size={14} color="#4b5563" />
                            <Text style={styles.gridActionText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.gridActionBtn, styles.gridActionBtnDanger]} onPress={() => handleDeletePress(banner)}>
                            <Trash2 size={14} color="#dc2626" />
                            <Text style={[styles.gridActionText, { color: "#dc2626" }]}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                itemName="banners"
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </ScrollView>

        {/* Add / Edit modal */}
        <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={closeModal}>
          <View style={styles.overlay}>
            <View style={[styles.modalCard, isWeb && styles.modalCardWeb]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>{editingId ? "Edit Banner" : "Add New Banner"}</Text>
                <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 8 }}>
                <Field label="Banner Title">
                  <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} placeholder="e.g. Women's Saree Collection" placeholderTextColor="#9aa0ac" />
                </Field>
                <Field label="Category">
                  <TextInput style={styles.input} value={form.category} onChangeText={(t) => setForm({ ...form, category: t })} placeholder="e.g. sarees, tshirts" placeholderTextColor="#9aa0ac" />
                </Field>
                <Field label="Banner Text">
                  <TextInput style={[styles.input, styles.textarea]} value={form.text} onChangeText={(t) => setForm({ ...form, text: t })} placeholder="e.g. Flat 70% Off" placeholderTextColor="#9aa0ac" multiline numberOfLines={3} />
                </Field>
                <Field label="Button URL">
                  <TextInput style={styles.input} value={form.buttonUrl} onChangeText={(t) => setForm({ ...form, buttonUrl: t })} placeholder="https://example.com/product/..." placeholderTextColor="#9aa0ac" autoCapitalize="none" />
                </Field>
                <Field label="Button Text">
                  <TextInput style={styles.input} value={form.buttonText} onChangeText={(t) => setForm({ ...form, buttonText: t })} placeholder="Shop Now" placeholderTextColor="#9aa0ac" />
                </Field>
                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Field label="Text Position">
                      <TouchableOpacity style={styles.selectBox} onPress={() => setPickerOpen("textPosition" as string)}>
                        <Text style={styles.selectText}>{form.textPosition}</Text>
                        <ChevronDown size={14} color="#6b7280" />
                      </TouchableOpacity>
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Banner Size">
                      <TouchableOpacity style={styles.selectBox} onPress={() => setPickerOpen("bannerSize" as string)}>
                        <Text style={styles.selectText}>{form.bannerSize}</Text>
                        <ChevronDown size={14} color="#6b7280" />
                      </TouchableOpacity>
                    </Field>
                  </View>
                </View>
                <Field label="Desktop Image (2100x700)">
                  <TouchableOpacity style={styles.fileBox}>
                    <Text style={styles.fileText}>Choose File — No file chosen</Text>
                  </TouchableOpacity>
                </Field>
                <Field label="Mobile Image (940x600) — Optional">
                  <TouchableOpacity style={styles.fileBox}>
                    <Text style={styles.fileText}>Choose File — No file chosen</Text>
                  </TouchableOpacity>
                </Field>
                <Field label="Status">
                  <TouchableOpacity style={styles.selectBox} onPress={() => setPickerOpen("status" as string)}>
                    <Text style={styles.selectText}>{form.status}</Text>
                    <ChevronDown size={14} color="#6b7280" />
                  </TouchableOpacity>
                </Field>
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.btnGhost} onPress={closeModal}>
                  <X size={16} color="#374151" />
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, !form.title.trim() && { opacity: 0.5 }]} onPress={handleSavePress} disabled={!form.title.trim()}>
                  <Save size={16} color="#fff" />
                  <Text style={styles.btnPrimaryText}>{editingId ? "Update Banner" : "Add Banner"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Option picker modal */}
        <Modal visible={pickerOpen !== null} transparent animationType="fade" onRequestClose={() => setPickerOpen(null)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerOpen(null)}>
            <View style={[styles.optionSheet, isWeb && styles.optionSheetWeb]}>
              {(pickerOpen === "textPosition" ? TEXT_POSITIONS : pickerOpen === "bannerSize" ? BANNER_SIZES : pickerOpen === "status" ? STATUSES : ["All", "Active", "Inactive"]).map((opt) => (
                <TouchableOpacity key={opt} style={styles.optionRow} onPress={() => {
                  if (pickerOpen === "filter") setStatusFilter(opt);
                  else if (pickerOpen) setForm((f) => ({ ...f, [pickerOpen]: opt }));
                  setPickerOpen(null);
                }}>
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* SweetAlert */}
        <SweetAlert
          visible={sweetVisible}
          type={sweetType}
          bannerTitle={pendingForm ? pendingForm.title : undefined}
          onConfirm={handleSweetConfirm}
          onCancel={handleSweetCancel}
        />
      </View>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, width: "100%", backgroundColor: "#f4f5f7" },
  container: { padding: 20, paddingBottom: 60, width: "100%" },

  // Wraps header + the stat cards
  headerWrap: { marginBottom: 16 },

  header: {
    backgroundColor: "#141b3c",
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f97316", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSubtitle: { color: "#b6bcdb", fontSize: 12, marginTop: 2 },

  // Stats flow normally below the header
  stats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ececf1",
    padding: 14,
  },
  statValue: { fontSize: 20, fontWeight: "700", color: "#141b3c" },
  statLabel: { fontSize: 11, color: "#8a8f9c", marginTop: 2 },

  toolbar: { flexDirection: "row", gap: 8, marginTop: 14 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e4ea", borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 4 },
  searchInput: { flex: 1, fontSize: 13.5, color: "#1f2430", outlineStyle: "none" } as any,
  filterBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e4ea", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  filterText: { fontSize: 13, color: "#1f2430" },

  // View Toggle
  viewToggleGroup: { flexDirection: "row", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e4ea", borderRadius: 10, padding: 4, gap: 4 },
  viewToggleBtn: { padding: 6, borderRadius: 6 },
  viewToggleBtnActive: { backgroundColor: "#fff5f0" },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 16, paddingBottom: 16 },
  gridCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececf1", overflow: "hidden" },
  gridThumb: { width: "100%", height: 110, justifyContent: "flex-end", padding: 10 },
  gridThumbTag: { fontSize: 13, fontWeight: "700", fontStyle: "italic", color: "#7a4a10" },
  gridBody: { padding: 12, gap: 4 },
  gridTitle: { fontSize: 13.5, fontWeight: "700", color: "#1f2430" },
  gridCategory: { fontSize: 11.5, color: "#9aa0ac", textTransform: "capitalize" },
  gridMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  gridActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  gridActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingVertical: 7 },
  gridActionBtnDanger: { borderColor: "#fecaca" },
  gridActionText: { fontSize: 12, color: "#4b5563", fontWeight: "600" },

  // List
  list: { marginTop: 16, gap: 10, paddingBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#ececf1", padding: 10 },
  thumb: { width: 84, height: 64, borderRadius: 10, justifyContent: "flex-end", padding: 6 },
  thumbTag: { fontSize: 9.5, fontWeight: "600", fontStyle: "italic", color: "#7a4a10" },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 13.5, fontWeight: "600", color: "#1f2430" },
  rowCategory: { fontSize: 11.5, color: "#9aa0ac", textTransform: "capitalize", marginTop: 1 },
  rowMetaLine: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  rowActions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  iconBtnDanger: { borderColor: "#fecaca" },

  dateWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 11, color: "#9aa0ac" },
  badge: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeActive: { backgroundColor: "#eafaf0", borderColor: "#c8f0d8" },
  badgeInactive: { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },
  badgeText: { fontSize: 10.5, fontWeight: "600" },

  empty: { marginTop: 20, borderWidth: 1.5, borderColor: "#d8dae0", borderStyle: "dashed", borderRadius: 16, backgroundColor: "#fff", alignItems: "center", paddingVertical: 50 },
  emptyTitle: { marginTop: 8, fontWeight: "600", color: "#6b7280", fontSize: 13.5 },
  emptySubtitle: { fontSize: 11.5, color: "#9aa0ac", marginTop: 2 },

  btnPrimary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#f97316", borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16 },
  btnPrimaryText: { color: "#fff", fontSize: 13.5, fontWeight: "700" },
  btnGhost: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: "#fff" },
  btnGhostText: { color: "#374151", fontSize: 13.5, fontWeight: "600" },

  // Modal — centered, max-width on web
  overlay: { flex: 1, backgroundColor: "rgba(15,18,33,0.55)", justifyContent: "center", alignItems: "center" },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, width: "92%", maxHeight: "90%" },
  modalCardWeb: { width: 520, maxWidth: "90%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f97316", paddingHorizontal: 18, paddingVertical: 14, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  modalHeaderTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalBody: { paddingHorizontal: 18, paddingTop: 14 },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11.5, fontWeight: "600", color: "#4b5563", marginBottom: 5 },
  input: { borderWidth: 1, borderColor: "#e2e4ea", borderRadius: 9, paddingHorizontal: 11, paddingVertical: Platform.OS === "ios" ? 10 : 8, fontSize: 13.5, color: "#1f2430", backgroundColor: "#fff" },
  textarea: { minHeight: 72, textAlignVertical: "top" },
  fieldRow: { flexDirection: "row", gap: 12 },
  selectBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#e2e4ea", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10 },
  selectText: { fontSize: 13, color: "#1f2430" },
  fileBox: { borderWidth: 1.5, borderStyle: "dashed", borderColor: "#d1d5db", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10 },
  fileText: { fontSize: 11.5, color: "#9aa0ac" },
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#f0f0f2" },

  // Option picker
  optionSheet: { backgroundColor: "#fff", borderRadius: 16, paddingVertical: 8, width: "85%", maxWidth: 360 },
  optionSheetWeb: { width: 280, alignSelf: "center" },
  optionRow: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  optionText: { fontSize: 14.5, color: "#1f2430" },
});

// ─── SweetAlert Styles ─────────────────────────────────────────────────────────
const sa = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,18,33,0.6)", justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 28, width: 320, maxWidth: "88%", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  iconText: { fontSize: 28, color: "#fff" },
  title: { fontSize: 17, fontWeight: "800", color: "#1f2430", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 20, marginBottom: 22 },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 12, alignItems: "center", backgroundColor: "#fff" },
  cancelTxt: { fontSize: 14, fontWeight: "600", color: "#374151" },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  confirmTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },
});