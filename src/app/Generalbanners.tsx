import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from "react-native";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  fetchGeneralBanners,
  createGeneralBanner,
  updateGeneralBanner,
  deleteGeneralBanner,
  uploadGeneralBannerImage,
  resolveCmsMediaUrl,
} from "@/services/cmsApi";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Filter,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react-native";
import { Feather } from "@expo/vector-icons";

const PALETTE = ["#f6d9d9", "#f3b7b7", "#cdeedd", "#dcdaf0", "#5a1f2e", "#215b7a"];

const UI_TO_API_SIZE: Record<string, string> = {
  "Full Width": "full",
  "Half Width": "medium",
  "Compact": "small",
};
const API_TO_UI_SIZE: Record<string, string> = {
  full: "Full Width",
  large: "Half Width",
  medium: "Half Width",
  small: "Compact",
};
const UI_TO_API_TEXT_POS: Record<string, string> = {
  Left: "left",
  Center: "center",
  Right: "right",
};
const API_TO_UI_TEXT_POS: Record<string, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
};

function formatBannerDate(value?: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isLocalImageUri(uri: string) {
  return (
    uri.startsWith("data:") ||
    uri.startsWith("blob:") ||
    uri.startsWith("file:") ||
    uri.startsWith("content:")
  );
}

function mapApiBanner(row: Record<string, unknown>, index: number) {
  const imagePath = String(row.image ?? "");
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    category: "",
    date: formatBannerDate(row.createdAt ?? row.created_at),
    status: row.status === 0 || row.status === "0" ? "Inactive" : "Active",
    color: PALETTE[index % PALETTE.length],
    dark: index % 5 === 4 || index % 5 === 5,
    text: String(row.textContent ?? row.text_content ?? ""),
    buttonText: String(row.buttonText ?? row.button_text ?? "Shop Now"),
    textPosition:
      API_TO_UI_TEXT_POS[String(row.textPosition ?? row.text_position ?? "left").toLowerCase()] ??
      "Left",
    bannerSize: API_TO_UI_SIZE[String(row.size ?? "full").toLowerCase()] ?? "Full Width",
    desktopImage: resolveCmsMediaUrl(imagePath),
    imagePath,
    imageUrl: "",
  };
}

async function resolveBannerImage(form: {
  desktopImage: string;
  imageUrl: string;
  imagePath?: string;
}): Promise<string> {
  const effectiveUri = form.imageUrl?.trim() || form.desktopImage || "";
  if (!effectiveUri) return form.imagePath ?? "";
  if (isLocalImageUri(effectiveUri)) {
    const res = await fetch(effectiveUri);
    const blob = await res.blob();
    const uploaded = await uploadGeneralBannerImage(blob, "banner.jpg");
    return String(uploaded.path ?? "");
  }
  if (/^https?:\/\//i.test(effectiveUri)) return effectiveUri;
  return form.imagePath || effectiveUri;
}

const emptyForm = {
  title: "",
  category: "",
  text: "",
  buttonText: "Shop Now",
  textPosition: "Left",
  bannerSize: "Full Width",
  status: "Active",
  desktopImage: "",
  imageUrl: "",
  imagePath: "",
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
      // Auto-close success states after 2 seconds
      if (type.endsWith("success")) {
        const timer = setTimeout(onConfirm, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [visible, type, onConfirm]);

  if (!visible) return null;

  const isSuccess = type.endsWith("success");
  const isDelete = type.startsWith("delete");
  const isEdit = type.startsWith("edit");

  // Success popup matches Ads Placements design
  if (isSuccess) {
    const message = isDelete
      ? "Banner deleted successfully!"
      : isEdit
        ? "Banner updated successfully!"
        : "Banner added successfully!";

    return (
      <Modal visible transparent animationType="fade" onRequestClose={onConfirm}>
        <Animated.View style={[sa.successOverlay, { opacity: overlayOpacity }]} onPress={onConfirm}>
          <Animated.View style={[sa.successCard, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
            <View style={sa.successIconCircle}>
              <Feather name="check" size={24} color="#fff" />
            </View>
            <Text style={sa.successMessage}>{message}</Text>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  // Confirm dialogs (add, edit, delete)
  const iconBg = isDelete ? "#ef4444" : "#f97316";
  const confirmBg = isDelete ? "#ef4444" : "#f97316";
  const title = isDelete ? "Delete Banner?" : isEdit ? "Update Banner?" : "Add Banner?";
  const subtitle = isDelete
    ? `Are you sure you want to delete "${bannerTitle}"? This action cannot be undone.`
    : isEdit
      ? `Save changes to "${bannerTitle}"?`
      : "Are you sure you want to add this new banner?";

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[sa.overlay, { opacity: overlayOpacity }]}>
        <Animated.View style={[sa.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
          <Animated.View style={[sa.iconCircle, { backgroundColor: iconBg, transform: [{ scale: iconScale }] }]}>
            {isDelete ? (
              <Text style={sa.iconText}>🗑</Text>
            ) : (
              <Text style={sa.iconText}>{isEdit ? "✎" : "+"}</Text>
            )}
          </Animated.View>
          <Text style={sa.title}>{title}</Text>
          <Text style={sa.subtitle}>{subtitle}</Text>
          <View style={sa.btnRow}>
            <TouchableOpacity style={sa.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={sa.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[sa.confirmBtn, { backgroundColor: confirmBg }]} onPress={onConfirm} activeOpacity={0.85}>
              <Text style={sa.confirmTxt}>{isDelete ? "Yes, Delete" : isEdit ? "Yes, Update" : "Yes, Add"}</Text>
            </TouchableOpacity>
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

  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  // Grid view is the default view when the screen opens
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  // Filter picker state
  const filterBtnRef = useRef<any>(null);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [filterDropPos, setFilterDropPos] = useState({ top: 200, right: 20 });

  // SweetAlert state
  const [sweetVisible, setSweetVisible] = useState(false);
  const [sweetType, setSweetType] = useState<SAlertType>("add-confirm");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingForm, setPendingForm] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchGeneralBanners();
      setBanners(rows.map((row, i) => mapApiBanner(row, i)));
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Failed to load banners."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter]);

  const filtered = banners.filter((b) => {
    const matchesQuery = (b.title + " " + b.category).toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "All" || b.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const activeCount = banners.filter((b) => b.status === "Active").length;
  const inactiveCount = banners.length - activeCount;

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedBanners = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Columns for grid
  const numCols = isWeb ? 3 : isTablet ? 2 : 1;
  const gridCardWidth = numCols === 3 ? "31.5%" : numCols === 2 ? "48%" : "100%";

  async function pickImage(field: "desktopImage") {
    try {
      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (file) {
            const uri = URL.createObjectURL(file);
            setForm((prev) => ({ ...prev, [field]: uri, imagePath: "" }));
          }
        };
        input.click();
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission required", "Please allow access to your photo library.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.85,
        });
        if (!result.canceled && result.assets.length > 0) {
          setForm((f) => ({ ...f, [field]: result.assets[0].uri, imagePath: "" }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalVisible(true);
  }

  function openEdit(banner: { [key: string]: any }) {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      category: banner.category || "",
      text: banner.text || "",
      buttonText: banner.buttonText || "Shop Now",
      textPosition: banner.textPosition || "Left",
      bannerSize: banner.bannerSize || "Full Width",
      status: banner.status || "Active",
      desktopImage: banner.desktopImage || "",
      imageUrl: banner.imageUrl || "",
      imagePath: banner.imagePath || "",
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
    if (!form.title.trim() || !form.category.trim() || !form.text.trim() || !form.buttonText.trim()) {
      const msg = "Please fill in all required fields (marked with *)";
      if (Platform.OS === "web") { if (typeof window !== "undefined") window.alert(msg); }
      else Alert.alert("Required Fields", msg);
      return;
    }
    setPendingForm({ ...form });
    setSweetType(editingId ? "edit-confirm" : "add-confirm");
    setSweetVisible(true);
    setModalVisible(false);
  }

  async function handleSweetConfirm() {
    if (sweetType.endsWith("success")) {
      setSweetVisible(false);
      setPendingForm(null);
      setEditingId(null);
      setForm(emptyForm);
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      if (sweetType === "add-confirm") {
        const image = await resolveBannerImage(pendingForm);
        const body = {
          title: pendingForm.title.trim(),
          textContent: pendingForm.text.trim(),
          buttonText: pendingForm.buttonText.trim(),
          textPosition: UI_TO_API_TEXT_POS[pendingForm.textPosition] ?? "left",
          size: UI_TO_API_SIZE[pendingForm.bannerSize] ?? "full",
          status: pendingForm.status === "Active" ? 1 : 0,
          image,
        };
        const created = await createGeneralBanner(body);
        const mapped = mapApiBanner(created, banners.length);
        setBanners((prev) => [mapped, ...prev]);
        setSweetType("add-success");
      } else if (sweetType === "edit-confirm") {
        const existing = banners.find((b) => String(b.id) === String(editingId));
        const image = await resolveBannerImage({
          ...pendingForm,
          imagePath: existing?.imagePath,
        });
        const body = {
          title: pendingForm.title.trim(),
          textContent: pendingForm.text.trim(),
          buttonText: pendingForm.buttonText.trim(),
          textPosition: UI_TO_API_TEXT_POS[pendingForm.textPosition] ?? "left",
          size: UI_TO_API_SIZE[pendingForm.bannerSize] ?? "full",
          status: pendingForm.status === "Active" ? 1 : 0,
          image,
        };
        const updated = await updateGeneralBanner(Number(editingId), body);
        const mapped = mapApiBanner(updated, 0);
        setBanners((prev) =>
          prev.map((b) =>
            String(b.id) === String(editingId)
              ? { ...mapped, color: b.color, dark: b.dark, category: pendingForm.category || b.category }
              : b,
          ),
        );
        setSweetType("edit-success");
      } else if (sweetType === "delete-confirm") {
        await deleteGeneralBanner(Number(pendingDeleteId));
        setBanners((prev) => prev.filter((b) => String(b.id) !== String(pendingDeleteId)));
        setPendingDeleteId(null);
        setSweetType("delete-success");
      }
    } catch (err) {
      setSweetVisible(false);
      const msg = getApiErrorMessage(err, "Operation failed.");
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
      if (sweetType === "add-confirm" || sweetType === "edit-confirm") {
        setModalVisible(true);
      }
    } finally {
      setSaving(false);
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

  function handleDeletePress(banner: { [key: string]: any }) {
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
            <View style={styles.header}>
              {/* Title row — icon + text + Add button always aligned right */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <ImageIcon size={22} color="#fff" />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.headerTitle}>Banners Management</Text>
                    <Text style={styles.headerSubtitle}>Manage promotional banners across the storefront</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.btnPrimary} onPress={openAdd} activeOpacity={0.85}>
                  <Plus size={16} color="#fff" />
                  <Text style={styles.btnPrimaryText}>{isMobile ? "Add" : "Add Banner"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats — overlaps the bottom edge of the header */}
            <View style={styles.stats}>
              <View style={styles.statCard}>
                <View style={styles.statCardInner}>
                  <View style={[styles.statIconWrap, { backgroundColor: "#eff6ff" }]}>
                    <LayoutGrid size={16} color="#3b82f6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statValue}>{banners.length}</Text>
                    <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>T-Banners</Text>
                  </View>
                </View>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statCardInner}>
                  <View style={[styles.statIconWrap, { backgroundColor: "#f0fdf4" }]}>
                    <CheckCircle2 size={16} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statValue, { color: "#16a34a" }]}>{activeCount}</Text>
                    <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Active</Text>
                  </View>
                </View>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statCardInner}>
                  <View style={[styles.statIconWrap, { backgroundColor: "#f8fafc" }]}>
                    <Circle size={16} color="#94a3b8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statValue, { color: "#94a3b8" }]}>{inactiveCount}</Text>
                    <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Inactive</Text>
                  </View>
                </View>
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
                style={[styles.viewToggleBoxBtn, viewMode === "list" && styles.viewToggleBoxBtnActive]}
                onPress={() => setViewMode("list")}
                activeOpacity={0.85}
              >
                <List size={16} color={viewMode === "list" ? "#FFFFFF" : "#374151"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBoxBtn, viewMode === "grid" && styles.viewToggleBoxBtnActive]}
                onPress={() => setViewMode("grid")}
                activeOpacity={0.85}
              >
                <LayoutGrid size={16} color={viewMode === "grid" ? "#FFFFFF" : "#374151"} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              ref={filterBtnRef}
              style={styles.filterBox}
              onPress={() => {
                filterBtnRef.current?.measure((_fx: number, _fy: number, _w: number, h: number, _px: number, py: number) => {
                  setFilterDropPos({ top: py + h + 4, right: 20 });
                  setFilterPickerOpen(true);
                });
                if (!filterBtnRef.current) setFilterPickerOpen(true);
              }}
              activeOpacity={0.8}
            >
              {statusFilter === "All" && <Filter size={14} color="#6b7280" />}
              {statusFilter === "Active" && <CheckCircle2 size={14} color="#16a34a" />}
              {statusFilter === "Inactive" && <Circle size={14} color="#94a3b8" />}
              <Text style={[styles.filterText, statusFilter === "Active" && { color: "#16a34a" }, statusFilter === "Inactive" && { color: "#94a3b8" }]}>{statusFilter}</Text>
              <ChevronDown size={14} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* List or Grid */}
          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={styles.emptyTitle}>Loading banners…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.empty}>
              <ImageIcon size={28} color="#c4c8d0" />
              <Text style={styles.emptyTitle}>{loadError}</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={loadBanners}>
                <Text style={styles.btnPrimaryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
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
                      <View style={[styles.thumb, { backgroundColor: banner.color, overflow: "hidden" }]}>
                        {!!(banner.desktopImage || banner.imageUrl) && (
                          <Image source={{ uri: banner.desktopImage || banner.imageUrl }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
                        )}
                        <Text style={[styles.thumbTag, (!!banner.dark || !!(banner.imageUrl || banner.desktopImage)) && { color: "#fff" }]} numberOfLines={1}>
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
                      <View style={[styles.gridThumb, { backgroundColor: banner.color, overflow: "hidden" }]}>
                        {!!(banner.desktopImage || banner.imageUrl) && (
                          <Image source={{ uri: banner.desktopImage || banner.imageUrl }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
                        )}
                        <Text style={[styles.gridThumbTag, (!!banner.dark || !!(banner.imageUrl || banner.desktopImage)) && { color: "#fff" }]} numberOfLines={2}>
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
                <Field label="Banner Title" required>
                  <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} placeholder="e.g. Women's Saree Collection" placeholderTextColor="#9aa0ac" />
                </Field>
                <Field label="Category" required>
                  <TextInput style={styles.input} value={form.category} onChangeText={(t) => setForm({ ...form, category: t })} placeholder="e.g. sarees, tshirts" placeholderTextColor="#9aa0ac" />
                </Field>
                <Field label="Banner Text" required>
                  <TextInput style={[styles.input, styles.textarea]} value={form.text} onChangeText={(t) => setForm({ ...form, text: t })} placeholder="e.g. Flat 70% Off" placeholderTextColor="#9aa0ac" multiline numberOfLines={3} />
                </Field>
                <Field label="Button Text" required>
                  <TextInput style={styles.input} value={form.buttonText} onChangeText={(t) => setForm({ ...form, buttonText: t })} placeholder="Shop Now" placeholderTextColor="#9aa0ac" />
                </Field>
                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Field label="Text Position" required>
                      <TouchableOpacity style={styles.selectBox} onPress={() => setPickerOpen("textPosition" as string)}>
                        <Text style={styles.selectText}>{form.textPosition}</Text>
                        <ChevronDown size={14} color="#6b7280" />
                      </TouchableOpacity>
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Banner Size" required>
                      <TouchableOpacity style={styles.selectBox} onPress={() => setPickerOpen("bannerSize" as string)}>
                        <Text style={styles.selectText}>{form.bannerSize}</Text>
                        <ChevronDown size={14} color="#6b7280" />
                      </TouchableOpacity>
                    </Field>
                  </View>
                </View>
                <Field label="Banner Image" required>
                  <TouchableOpacity style={styles.fileBox} onPress={() => pickImage("desktopImage")} activeOpacity={0.75}>
                    <View style={styles.fileInner}>
                      <View style={styles.fileIconWrap}>
                        <Upload size={14} color="#f97316" />
                      </View>
                      <Text style={styles.fileText} numberOfLines={1}>
                        {form.desktopImage ? "Image selected" : "Choose File — No file chosen"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {!!form.desktopImage && (
                    <View style={styles.previewWrap}>
                      <Image source={{ uri: form.desktopImage }} style={styles.previewImg} resizeMode="cover" />
                      <TouchableOpacity style={styles.previewRemove} onPress={() => setForm((f) => ({ ...f, desktopImage: "" }))}>
                        <X size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </Field>
                <Field label="Image URL (Optional)">
                  <TextInput
                    style={styles.input}
                    value={form.imageUrl}
                    onChangeText={(t) => setForm({ ...form, imageUrl: t })}
                    placeholder="https://example.com/banner-image.jpg"
                    placeholderTextColor="#9aa0ac"
                    autoCapitalize="none"
                  />
                  {!!form.imageUrl?.trim() && (
                    <View style={[styles.previewWrap, { marginTop: 8 }]}>
                      <Image source={{ uri: form.imageUrl.trim() }} style={styles.previewImg} resizeMode="cover" />
                    </View>
                  )}
                </Field>
                <Field label="Status" required>
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
                <TouchableOpacity
                  style={[styles.btnPrimary, (!form.title.trim() || !form.category.trim() || !form.text.trim() || !form.buttonText.trim()) && { opacity: 0.5 }]}
                  onPress={handleSavePress}
                  disabled={!form.title.trim() || !form.category.trim() || !form.text.trim() || !form.buttonText.trim()}
                >
                  <Save size={16} color="#fff" />
                  <Text style={styles.btnPrimaryText}>{editingId ? "Update Banner" : "Add Banner"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Option picker modal (form fields only) */}
        <Modal visible={pickerOpen !== null} transparent animationType="fade" onRequestClose={() => setPickerOpen(null)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerOpen(null)}>
            <View style={[styles.optionSheet, isWeb && styles.optionSheetWeb]}>
              {(pickerOpen === "textPosition" ? TEXT_POSITIONS : pickerOpen === "bannerSize" ? BANNER_SIZES : pickerOpen === "status" ? STATUSES : []).map((opt) => (
                <TouchableOpacity key={opt} style={styles.optionRow} onPress={() => {
                  if (pickerOpen) setForm((f) => ({ ...f, [pickerOpen]: opt }));
                  setPickerOpen(null);
                }}>
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Filter picker — positioned below the filter button */}
        <Modal visible={filterPickerOpen} transparent animationType="fade" onRequestClose={() => setFilterPickerOpen(false)}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setFilterPickerOpen(false)}>
            <View style={{
              position: "absolute",
              top: filterDropPos.top,
              right: filterDropPos.right,
              backgroundColor: "#fff",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#e2e4ea",
              minWidth: 170,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 10,
              overflow: "hidden",
            }}>
              {["All", "Active", "Inactive"].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionRow, opt === statusFilter && { backgroundColor: "#f0f4ff" }]}
                  onPress={() => { setStatusFilter(opt); setFilterPickerOpen(false); }}
                >
                  <View style={{ marginRight: 10 }}>
                    {opt === "All" && <Filter size={16} color="#6b7280" />}
                    {opt === "Active" && <CheckCircle2 size={16} color="#16a34a" />}
                    {opt === "Inactive" && <Circle size={16} color="#94a3b8" />}
                  </View>
                  <Text style={[
                    styles.optionText,
                    opt === "Active" && { color: "#16a34a", fontWeight: "700" },
                    opt === "Inactive" && { color: "#94a3b8" },
                    opt === statusFilter && { fontWeight: "700" },
                  ]}>{opt}</Text>
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

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}{required ? <Text style={{ color: "#ef4444" }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, width: "100%", backgroundColor: "#f4f5f7" },
  container: { padding: 20, paddingBottom: 60, width: "100%" },

  // Wraps header + stat cards
  headerWrap: { position: "relative", marginBottom: 60 },

  header: {
    backgroundColor: "#151D4F",
    borderRadius: 16,
    padding: 18,
    paddingBottom: 42,
    gap: 14,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, flexShrink: 1 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f97316", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSubtitle: { color: "#b6bcdb", fontSize: 12, marginTop: 2 },

  // Stat cards sit directly below the header in normal flow
  stats: {
    flexDirection: "row",
    gap: 10,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -48,
    zIndex: 5,
    justifyContent: "center",
  },
  statCard: {
    flex: 1,
    maxWidth: 220,
    backgroundColor: "#fff",
    borderRadius: 12,

    borderWidth: 1,
    borderColor: "#ececf1",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 20, fontWeight: "700", color: "#141b3c" },
  statLabel: { fontSize: 15, color: "#8a8f9c", marginTop: 2 },

  toolbar: { flexDirection: "row", gap: 8, marginTop: 14 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e4ea", borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 4 },
  searchInput: { flex: 1, fontSize: 13.5, color: "#1f2430", outlineStyle: "none" } as any,
  filterBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e4ea", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  filterText: { fontSize: 13, color: "#1f2430" },

  // View Toggle
  viewToggleGroup: { flexDirection: "row", backgroundColor: "#E5E7EB", borderRadius: 10, padding: 3 },
  viewToggleBoxBtn: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  viewToggleBoxBtnActive: { backgroundColor: "#1E2B6B" },

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
  fileInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  fileIconWrap: { width: 26, height: 26, borderRadius: 6, backgroundColor: "#fff5f0", alignItems: "center", justifyContent: "center" },
  fileText: { fontSize: 11.5, color: "#9aa0ac", flex: 1 },
  previewWrap: { marginTop: 8, borderRadius: 8, overflow: "hidden", position: "relative" },
  previewImg: { width: "100%", height: 90, borderRadius: 8 },
  previewRemove: { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 999, padding: 4 },
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#f0f0f2" },

  // Option picker
  optionSheet: { backgroundColor: "#fff", borderRadius: 16, paddingVertical: 8, width: "85%", maxWidth: 360 },
  optionSheetWeb: { width: 280, alignSelf: "center" },
  optionRow: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", flexDirection: "row", alignItems: "center" },
  optionText: { fontSize: 14.5, color: "#1f2430" },
});

// ─── SweetAlert Styles ─────────────────────────────────────────────────────────
const sa = StyleSheet.create({
  // Success popup (matches Ads Placements design)
  successOverlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.55)", padding: 24 },
  successCard: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 24, paddingVertical: 24, alignItems: "center", width: "100%", maxWidth: 300 },
  successIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  successMessage: { fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 18 },

  // Confirm dialogs
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